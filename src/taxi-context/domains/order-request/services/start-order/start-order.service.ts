import { Injectable } from '@nestjs/common';
import { ChangeOrderStatus } from '@domain/order-request/services/accept-order/accept-order.request';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { OrderRequestGateway } from '../../websocket/order-request.gateway';
// import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { OrderStatus } from '@infrastructure/enums';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { NotificationService } from '@modules/firebase/notification.service';

@Injectable()
export class StartOrderService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly notificationService: NotificationService,
    private readonly cacheStorageService: CloudCacheStorageService,
  ) {}

  async handle(input: ChangeOrderStatus, driver: UserOrmEntity) {
    const { orderId } = input;
    const order = await this.orderRequestRepository.findOneById(orderId);

    if (order && order.getPropsCopy().driverId?.value == driver.id && order.getPropsCopy().orderStatus == OrderStatus.WAITING) {
      order.start();
      await this.orderRequestRepository.save(order);

      const client = await this.userRepository.findOneById(order.getPropsCopy().clientId.value)
      if (client && driver) {
        const driverEntity = await this.userRepository.findOneById(driver.id)
        if(driverEntity)
          await this.orderRequestGateway.notifyClient(order.getPropsCopy().clientId.value, 'rideStarted', {
            orderId: order.id.value,
            driverId: order.getPropsCopy().driverId?.value,
            driver: driverEntity.getPropsCopy(),
            message: 'Поездка началась',
            timestamp: Date.now()
          });
        await this.notificationService.sendNotificationByUserId(
          'Водитель начал поездку',
          'Поездка началась',
          client.getPropsCopy().deviceToken || ''
        )
        // await this.whatsAppService.sendMessage(userPhone + "@c.us", 'Водитель начал заказ')
      }
    }
  }

}