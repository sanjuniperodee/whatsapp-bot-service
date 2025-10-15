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
    console.log('🔍 [DRIVER ARRIVED SERVICE] Starting driver arrived service');
    const { driverId, orderId } = input;
    console.log('🔍 [DRIVER ARRIVED SERVICE] OrderId:', orderId);
    console.log('🔍 [DRIVER ARRIVED SERVICE] DriverId:', driverId);
    
    const order = await this.orderRequestRepository.findOneById(orderId);
    console.log('🔍 [DRIVER ARRIVED SERVICE] Found order:', order ? 'YES' : 'NO');
    if (order) {
      console.log('🔍 [DRIVER ARRIVED SERVICE] Order driverId:', order.getPropsCopy().driverId?.value);
      console.log('🔍 [DRIVER ARRIVED SERVICE] Order status:', order.getPropsCopy().orderStatus);
    }

    if (order && order.getPropsCopy().driverId?.value == driverId && order.getPropsCopy().orderStatus == OrderStatus.STARTED) {
      console.log('🔍 [DRIVER ARRIVED SERVICE] Order conditions met, proceeding with driver arrived');
      const category = await this.categoryLicenseRepository.findOne({driverId: new UUID(driverId), categoryType: order.getPropsCopy().orderType})
      console.log('🔍 [DRIVER ARRIVED SERVICE] Category found:', category ? 'YES' : 'NO');

      if(!category){
        console.log('❌ [DRIVER ARRIVED SERVICE] No category found for driver');
        throw new BadRequestException("You can not accept orders before registering into category");
      }

      console.log('🔍 [DRIVER ARRIVED SERVICE] Setting driver arrived...');
      order.driverArrived();
      console.log('🔍 [DRIVER ARRIVED SERVICE] Driver arrived set, saving...');
      await this.orderRequestRepository.save(order);
      console.log('🔍 [DRIVER ARRIVED SERVICE] Order saved successfully');

      const driver = await this.userRepository.findOneById(driverId)

      const userId = order.getPropsCopy().clientId;
      if (userId && driver) {
        const user = await this.userRepository.findOneById(userId.value);
        if (!user) {
          throw new InternalServerErrorException("SOMETHING WENT WRONG");
        }
        await this.orderRequestGateway.notifyClient(order.getPropsCopy().clientId.value, 'driverArrived', {
          orderId: order.id.value,
          driverId: order.getPropsCopy().driverId?.value,
          driver: driver.getPropsCopy(),
          message: 'Водитель прибыл и ждет вас',
          timestamp: Date.now()
        });

        await this.notificationService.sendNotificationByUserId(
          'Водитель на месте',
          `Вас ожидает ${category.getPropsCopy().brand} ${category.getPropsCopy().model}.\nЦвет: ${category.getPropsCopy().color}.\nГос номер: ${category.getPropsCopy().number}`,
          user.getPropsCopy().deviceToken || ''
        )
        // await this.whatsAppService.sendMessage(
        //   userPhone + "@c.us",
        //   `Вас ожидает ${category.getPropsCopy().brand} ${category.getPropsCopy().model}.\nЦвет: ${category.getPropsCopy().color}.\nГос номер: ${category.getPropsCopy().number}`
        // )
        console.log('🔍 [DRIVER ARRIVED SERVICE] Notifications sent successfully');
      } else {
        console.log('❌ [DRIVER ARRIVED SERVICE] User or driver not found');
      }
    } else {
      console.log('❌ [DRIVER ARRIVED SERVICE] Order conditions not met');
    }
    console.log('🔍 [DRIVER ARRIVED SERVICE] Driver arrived service completed');
  }
}