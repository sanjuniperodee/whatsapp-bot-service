import { Injectable } from '@nestjs/common';
import { ChangeOrderStatus } from '@domain/order-request/services/accept-order/accept-order.request';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { NotificationService } from '@modules/firebase/notification.service';

@Injectable()
export class CancelOrderService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly notificationService: NotificationService,
    private readonly cacheStorageService: CloudCacheStorageService,
  ) {}

  async handle(orderId: string, client: UserOrmEntity) {
    const orderRequest = await this.orderRequestRepository.findOneById(orderId);
    if (!orderRequest || orderRequest.getPropsCopy().clientId.value != client.id) {
      throw new Error('Session is expired');
    }

    await this.orderRequestRepository.delete(orderRequest);

    await this.cacheStorageService.removeOrderLocation(orderRequest.id.value, orderRequest.getPropsCopy().orderType);

    const driveId = orderRequest.getPropsCopy().driverId?.value
    const driver = driveId ? await this.userRepository.findOneById(driveId) : undefined
    const deviceToken = driver?.getPropsCopy().deviceToken
    if(driveId && driver && deviceToken) {
      await this.orderRequestGateway.handleOrderRejected(driveId);
      await this.notificationService.sendNotificationByUserId(
        'Клиент отменил заказ',
        'Найдите новые заказы в приложении',
        deviceToken
      )
    }
  }
}