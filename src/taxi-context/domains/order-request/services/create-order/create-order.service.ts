import { ConflictException, Injectable } from '@nestjs/common';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { OrderRequestGateway } from '../../websocket/order-request.gateway';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { CreateOrderRequest } from './create-order-request';
import { OrderRequestEntity } from '../../domain/entities/order-request.entity';
import { OrderStatus } from '@infrastructure/enums';
import { SMSCodeRecord } from '@domain/user/types';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { OrderRequestOrmEntity } from '@infrastructure/database/entities/order-request.orm-entity';
import { UserBlockingService } from '@domain/user/services/user-blocking.service';
import { UserBlockedException } from '@domain/user/errors/user-blocked.exception';
import { Price } from '@domain/shared/value-objects/price.value-object';
import { Address } from '@domain/shared/value-objects/address.value-object';

@Injectable()
export class CreateOrderService {
  constructor(
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly cacheStorageService: CloudCacheStorageService,
    private readonly userBlockingService: UserBlockingService,
  ) {}

  async handle(input: CreateOrderRequest, user: UserOrmEntity) {
    const { orderType, from, to, lat, lng, price, comment, fromMapboxId, toMapboxId} = input;

    // Проверяем блокировку пользователя
    const userEntity = await this.userBlockingService.checkUserBlockingAndNotify(user);
    if (userEntity) {
      throw new UserBlockedException(
        user.blockReason || 'Нарушение правил использования сервиса',
        user.blockedUntil,
      );
    }

    const activeOrderRequests = await OrderRequestOrmEntity.query()
      .where('clientId', user.id)
      .whereNotIn('orderStatus', [OrderStatus.REJECTED, OrderStatus.COMPLETED,OrderStatus.REJECTED_BY_CLIENT, OrderStatus.REJECTED_BY_DRIVER]);

    if (activeOrderRequests.length > 0) {
      throw new ConflictException("You already have an active order!");
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
      price: new Price({ value: price }),
      address: new Address({ from, to }),
      comment: comment,
    });

    await this.orderRequestRepository.save(orderRequest)

    await this.cacheStorageService.updateOrderLocation(orderRequest.id.value, lat, lng, orderType);

    await this.orderRequestGateway.broadcastToOnlineDrivers('newOrder', {
      id: orderRequest.id.value,
      from: orderRequest.getPropsCopy().address?.from || 'Не указан',
      to: orderRequest.getPropsCopy().address?.to || 'Не указан',
      price: orderRequest.getPropsCopy().price.value,
      orderType: orderRequest.getPropsCopy().orderType,
      clientId: orderRequest.getPropsCopy().clientId.value,
      lat: orderRequest.getPropsCopy().lat,
      lng: orderRequest.getPropsCopy().lng,
      timestamp: Date.now()
    });

    return orderRequest.getPropsCopy();
  }
}