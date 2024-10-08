import { Injectable } from '@nestjs/common';
import { ChangeOrderStatus } from '@domain/order-request/services/accept-order/accept-order.request';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
// import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { SMSCodeRecord } from '@domain/user/types';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';

@Injectable()
export class CancelOrderService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
    // private readonly whatsAppService: WhatsAppService,
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

    if(driveId)
      await this.orderRequestGateway.handleOrderRejected(driveId);
    else
      await this.orderRequestGateway.handleOrderCreated(orderRequest);

  }
}