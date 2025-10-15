import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { OrderRequestGateway } from '../../websocket/order-request.gateway';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { NotificationService } from '@modules/firebase/notification.service';

@Injectable()
export class RejectOrderService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly notificationService: NotificationService,
  ) {}

  async handle(orderId: string, driverId?: string, reason: string = 'rejected_by_driver') {
    const orderRequest = await this.orderRequestRepository.findOneById(orderId);
    if (!orderRequest) {
      throw new NotFoundException('Order not found');
    }

    const driver = await this.userRepository.findOneById(driverId || orderRequest?.getPropsCopy().driverId?.value || '');
    const client = await this.userRepository.findOneById(orderRequest.getPropsCopy().clientId.value);

    if (!driver || !client) {
      throw new NotFoundException('Driver or client not found');
    }

    // Если водитель уже принял заказ, то это отмена, а не отклонение
    const currentStatus = orderRequest.getPropsCopy().orderStatus;
    
    if (currentStatus === 'CREATED') {
      // Водитель просто отклоняет заказ (не принимает)
      // Заказ остается доступным для других водителей
      await this.notificationService.sendNotificationByUserId(
        'Водитель отклонил заказ',
        'Поиск другого водителя...',
        client.getPropsCopy().deviceToken || ''
      );
      
      // Не удаляем заказ, просто логируем отклонение
      console.log(`🚫 Водитель ${driver.id.value} отклонил заказ ${orderId}`);
      
    } else {
      // Водитель отменяет уже принятый заказ
      orderRequest.rejectByDriver();
      await this.orderRequestRepository.save(orderRequest);

      await this.orderRequestGateway.notifyClient(orderRequest.getPropsCopy().clientId.value, 'orderCancelled', {
        orderId: orderRequest.id.value,
        driver: driver.getPropsCopy(),
        reason: reason || 'cancelled by driver',
        timestamp: Date.now()
      });

      await this.notificationService.sendNotificationByUserId(
        'Водитель отменил заказ',
        'К сожалению водитель отменил заказ, попробуйте повторить попытку',
        client.getPropsCopy().deviceToken || ''
      );
     }
  }
}