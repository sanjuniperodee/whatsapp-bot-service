import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { CreateOrderRequest } from '@domain/order-request/services/create-order/create-order-request';
import { OrderRequestEntity } from '@domain/order-request/domain/entities/order-request.entity';
import { OrderStatus } from '@infrastructure/enums';
import { SMSCodeRecord } from '@domain/user/types';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { OrderRequestOrmEntity } from '@infrastructure/database/entities/order-request.orm-entity';

@Injectable()
export class CreateOrderService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
    // private readonly whatsAppService: WhatsAppService,
    private readonly cacheStorageService: CloudCacheStorageService,
  ) {}

  async handle(input: CreateOrderRequest, user: UserOrmEntity) {
    const { orderType, from, to, lat, lng, price, comment, fromMapboxId, toMapboxId} = input;

    const activeOrderRequests = await OrderRequestOrmEntity.query()
      .where('clientId', user.id)
      .whereNotIn('orderStatus', [OrderStatus.REJECTED, OrderStatus.COMPLETED,OrderStatus.REJECTED_BY_CLIENT, OrderStatus.REJECTED_BY_DRIVER]);

    if (activeOrderRequests.length > 0) {
      throw new Error("You already have an active order!");
    }

    const orderRequest = OrderRequestEntity.create({
      fromMapboxId,
      toMapboxId,
      orderType,
      clientId: new UUID(user.id),
      orderStatus: OrderStatus.CREATED,
      from,
      to,
      lat,
      lng,
      price,
      comment: comment,
    });

    await this.orderRequestRepository.save(orderRequest)

    await this.cacheStorageService.updateOrderLocation(orderRequest.id.value, lat, lng, orderType);

    // const user = await this.whatsappUserRepository.findOneByPhone(phone)

    await this.orderRequestGateway.handleOrderCreated(orderRequest);

    return orderRequest.getPropsCopy();
  }
  private getSMScode(phone: string): Promise<SMSCodeRecord | null> {
    return this.cacheStorageService.getValue(phone);
  }
}