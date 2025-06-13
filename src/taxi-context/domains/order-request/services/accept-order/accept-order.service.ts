import { Body, Injectable } from '@nestjs/common';
import { ChangeOrderStatus } from '@domain/order-request/services/accept-order/accept-order.request';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { OrderStatus } from '@infrastructure/enums';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { CategoryLicenseRepository } from '../../../../domain-repositories/category-license/category-license.repository';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { NotificationService } from '@modules/firebase/notification.service';

@Injectable()
export class AcceptOrderService{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly categoryLicenseRepository: CategoryLicenseRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly notificationService: NotificationService,
    private readonly cacheStorageService: CloudCacheStorageService,
  ) {}

  async handle(input: ChangeOrderStatus, driver: UserOrmEntity) {
    const { orderId } = input;
    const driverId = driver.id
    const orderRequests = await this.orderRequestRepository.findMany({ driverId: new UUID(driverId) })

    for (const orderRequest of orderRequests)
      if (orderRequest && (orderRequest.getPropsCopy().orderStatus != OrderStatus.REJECTED && orderRequest.getPropsCopy().orderStatus != OrderStatus.COMPLETED && orderRequest.getPropsCopy().orderStatus != OrderStatus.REJECTED_BY_CLIENT))
        return 'You already have active order'

    const order = await this.orderRequestRepository.findOneById(orderId);

    if (order && order.getPropsCopy().orderStatus == OrderStatus.CREATED) {
      const category = await this.categoryLicenseRepository.findOne({driverId: new UUID(driverId), categoryType: order.getPropsCopy().orderType})

      if(!category){
        throw new Error("You can not accept orders before registering into category");
      }
      order.accept(new UUID(driverId));
      await this.orderRequestRepository.save(order);

      const driver = await this.userRepository.findOneById(driverId)

      const client = await this.userRepository.findOneById(order.getPropsCopy().clientId.value)

      if (client && driver) {

        await this.notificationService.sendNotificationByUserId(
          'Водитель принял ваш заказ',
          `К вам приедет ${category.getPropsCopy().brand} ${category.getPropsCopy().model}.\nЦвет: ${category.getPropsCopy().color}.\nГос номер: ${category.getPropsCopy().number}`,
          client.getPropsCopy().deviceToken || ''
        )
        // await this.whatsAppService.sendMessage(
        //   userPhone + "@c.us",
        //   `Водитель принял ваш заказ,\nК вам приедет ${category.getPropsCopy().brand} ${category.getPropsCopy().model}.\nЦвет: ${category.getPropsCopy().color}.\nГос номер: ${category.getPropsCopy().number}`
        // )wч1

        await this.orderRequestGateway.handleOrderAccepted(order, driver)
      }
    }
  }
}