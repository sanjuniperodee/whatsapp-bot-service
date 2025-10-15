import { Injectable } from '@nestjs/common';
import { ICommandHandler } from '@libs/cqrs';
import { CreateOrderCommand } from './create-order.command';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { OrderRequestEntity } from '../../domain/entities/order-request.entity';
import { OrderStatus } from '@infrastructure/enums';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { OrderRequestGateway } from '../../websocket/order-request.gateway';
import { UserBlockingService } from '@domain/user/services/user-blocking.service';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { UserBlockedException } from '@domain/user/errors/user-blocked.exception';
import { ConflictException } from '@nestjs/common';
import { Price } from '@domain/shared/value-objects/price.value-object';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { Address } from '@domain/shared/value-objects/address.value-object';

@Injectable()
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand, OrderRequestEntity> {
  constructor(
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly cacheStorageService: CloudCacheStorageService,
    private readonly userBlockingService: UserBlockingService,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(command: CreateOrderCommand): Promise<OrderRequestEntity> {
    const { clientId, orderType, from, to, fromMapboxId, toMapboxId, lat, lng, price, comment } = command;

    // Получаем пользователя для проверки блокировки
    const user = await this.userRepository.findOneById(clientId.value);
    if (!user) {
      throw new ConflictException('User not found');
    }

    // Проверяем блокировку пользователя
    const userEntity = await this.userBlockingService.checkUserBlockingAndNotify(user as unknown as UserOrmEntity);
    if (userEntity) {
      throw new UserBlockedException(
        user.getPropsCopy().blockReason || 'Нарушение правил использования сервиса',
        user.getPropsCopy().blockedUntil,
      );
    }

    // Проверяем активные заказы
    const activeOrders = await this.orderRequestRepository.findMany({
      clientId,
      orderStatus: { $nin: ['REJECTED', 'COMPLETED', 'REJECTED_BY_CLIENT', 'REJECTED_BY_DRIVER'] } as any
    });

    if (activeOrders.length > 0) {
      throw new ConflictException("You already have an active order!");
    }

    // Создаем заказ
    const orderRequest = OrderRequestEntity.create({
      clientId,
      orderType,
      orderStatus: OrderStatus.CREATED,
      address: new Address({ from, to }),
      from,
      to,
      fromMapboxId,
      toMapboxId,
      lat,
      lng,
      price: new Price({ value: price }),
      comment,
    });

    // Сохраняем заказ
    await this.orderRequestRepository.save(orderRequest);

    // Обновляем геолокацию в кеше
    await this.cacheStorageService.updateOrderLocation(orderRequest.id.value, lat, lng, orderType);

    // Уведомляем через WebSocket
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

    return orderRequest;
  }
}
