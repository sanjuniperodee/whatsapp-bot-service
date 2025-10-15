import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ChangeOrderStatus } from '@domain/order-request/services/driver-arrived/driver-arrived.request';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { OrderRequestGateway } from '../../websocket/order-request.gateway';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { CategoryLicenseRepository, } from '../../../../domain-repositories/category-license/category-license.repository';
import { OrderStatus } from '@infrastructure/enums';
import { NotificationService } from '@modules/firebase/notification.service';

@Injectable()
export class DriverArrivedService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly categoryLicenseRepository: CategoryLicenseRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly notificationService: NotificationService,
  ) {}

  async handle(input: ChangeOrderStatus) {
    const { driverId, orderId } = input;
    const order = await this.orderRequestRepository.findOneById(orderId);

    if (order && order.getPropsCopy().driverId?.value == driverId && order.getPropsCopy().orderStatus == OrderStatus.STARTED) {
      const category = await this.categoryLicenseRepository.findOne({driverId: new UUID(driverId), categoryType: order.getPropsCopy().orderType})

      if(!category){
        throw new BadRequestException("You can not accept orders before registering into category");
      }

      order.driverArrived();
      await this.orderRequestRepository.save(order);

      const driver = await this.userRepository.findOneById(driverId)

      const userId = order.getPropsCopy().clientId;
      if (userId && driver) {
        const user = await this.userRepository.findOneById(userId.value);
        if (!user) {
          throw new InternalServerErrorException("SOMETHING WENT WRONG");
        }
        await this.orderRequestGateway.handleDriverArrived(order, driver)

        await this.notificationService.sendNotificationByUserId(
          'Водитель на месте',
          `Вас ожидает ${category.getPropsCopy().brand} ${category.getPropsCopy().model}.\nЦвет: ${category.getPropsCopy().color}.\nГос номер: ${category.getPropsCopy().number}`,
          user.getPropsCopy().deviceToken || ''
        )
        // await this.whatsAppService.sendMessage(
        //   userPhone + "@c.us",
        //   `Вас ожидает ${category.getPropsCopy().brand} ${category.getPropsCopy().model}.\nЦвет: ${category.getPropsCopy().color}.\nГос номер: ${category.getPropsCopy().number}`
        // )
      }
    }
  }
}