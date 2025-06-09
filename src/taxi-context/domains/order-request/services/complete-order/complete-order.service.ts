import { Injectable } from '@nestjs/common';
import { ChangeOrderStatus } from '@domain/order-request/services/accept-order/accept-order.request';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { OrderStatus } from '@infrastructure/enums';
import { NotificationService } from '@modules/firebase/notification.service';

@Injectable()
export class CompleteOrderService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly notificationService: NotificationService,
    private readonly cacheStorageService: CloudCacheStorageService,
  ) {}

  async handle(input: ChangeOrderStatus) {
    const { driverId, orderId } = input;
    const order = await this.orderRequestRepository.findOneById(orderId);

    if (order && order.getPropsCopy().driverId?.value == driverId && order.getPropsCopy().orderStatus == OrderStatus.ONGOING) {
      order.rideEnded();
      await this.orderRequestRepository.save(order);

      await this.cacheStorageService.removeOrderLocation(order.id.value, order.getPropsCopy().orderType);


      const driver = await this.userRepository.findOneById(driverId)

      const client = await this.userRepository.findOneById(order.getPropsCopy().clientId.value)
      if (client && driver) {
        await this.notificationService.sendNotificationByUserId(
          'Заказ завершен',
          'Пожалуйста оцените поездку',
          client.getPropsCopy().deviceToken || ''
        )

        await this.orderRequestGateway.handleRideEnded(order, driver)
      }
    }
  }
}