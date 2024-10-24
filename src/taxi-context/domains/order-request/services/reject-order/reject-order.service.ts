import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
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

  async handle(orderId: string) {
    const orderRequest = await this.orderRequestRepository.findOneById(orderId);
    if (!orderRequest) {
      throw new Error('Session is expired');
    }
    await this.orderRequestRepository.delete(orderRequest);

    const driver = await this.userRepository.findOneById(orderRequest?.getPropsCopy().driverId?.value || '')

    await this.orderRequestGateway.handleOrderRejected(driver?.id.value || '');

    const client = await this.userRepository.findOneById(orderRequest.getPropsCopy().clientId.value)

    if (driver && client) {
      // await this.whatsAppService.sendMessage(userPhone + "@c.us", 'Водитель отменил заказ')
      await this.notificationService.sendNotificationByUserId(
        'Водитель отменил заказ',
        'К сожалению водитель отменил заказ, попробуйте повторить попытку',
        client.getPropsCopy().deviceToken || ''
      )
      orderRequest.reject('123')

      if (driver)
        await this.orderRequestGateway.emitEvent(client.id.value, 'orderRejected', orderRequest, driver)
    }
  }
}