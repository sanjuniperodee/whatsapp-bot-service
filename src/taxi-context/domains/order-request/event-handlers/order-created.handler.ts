import { Injectable } from '@nestjs/common';
import { DomainEventHandler } from '@libs/ddd/domain/domain-events/domain-event-handler.base';
import { OrderCreatedEvent } from '../domain/events/order-created.event';
import { OrderRequestGateway } from '../websocket/order-request.gateway';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { UserRepository } from '../../../domain-repositories/user/user.repository';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { OrderType } from '@infrastructure/enums';
import { NotificationService } from '@modules/firebase/notification.service';

@Injectable()
export class OrderCreatedHandler extends DomainEventHandler {
  constructor(
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly cacheStorageService: CloudCacheStorageService,
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
  ) {
    super(OrderCreatedEvent);
  }

  async handle(event: OrderCreatedEvent): Promise<void> {
    const { aggregateId, orderType, clientId, lat, lng } = event;

    try {
      // Обновляем геолокацию заказа в кеше
      await this.cacheStorageService.updateOrderLocation(aggregateId, lat, lng, orderType);

      // Находим ближайших водителей
      const nearestDrivers = await this.cacheStorageService.findNearestDrivers(lat, lng);
      const drivers = await UserOrmEntity.query()
        .findByIds(nearestDrivers.map(id => String(id)))
        .withGraphFetched({ categoryLicenses: true });

      console.log(`📦 Создан новый заказ ${aggregateId}, найдено водителей: ${drivers.length}`);
      
      // Рассылаем всем онлайн водителям подходящей категории
      await this.orderRequestGateway.broadcastToOnlineDrivers('newOrder', {
        id: aggregateId,
        from: event.from,
        to: event.to,
        price: event.price,
        orderType: orderType,
        clientId: clientId,
        lat,
        lng,
        timestamp: Date.now()
      });

      for (const driver of drivers) {
        // Проверяем категорию водителя
        const hasMatchingCategory = driver.categoryLicenses?.some(
          category => category.categoryType === orderType
        );

        const isDriverOnline = await this.cacheStorageService.isDriverOnline(driver.id);
        console.log(`🔍 Водитель ${driver.id}: категория=${hasMatchingCategory}, онлайн=${isDriverOnline}, не клиент=${clientId !== driver.id}`);

        // Не отправляем заказ самому клиенту если он водитель
        if (hasMatchingCategory && clientId !== driver.id) {
          
          // Отправляем WebSocket уведомление только онлайн водителям
          if (isDriverOnline) {
            await this.orderRequestGateway.notifyDriver(driver.id, 'newOrder', {
              id: aggregateId,
              from: event.from,
              to: event.to,
              price: event.price,
              orderType: orderType,
              clientId: clientId,
              lat,
              lng,
              timestamp: Date.now()
            });
            console.log(`✅ Уведомление отправлено водителю: ${driver.id}`);
          } else {
            console.log(`⚠️ Водитель ${driver.id} не онлайн, отправляем только PUSH`);
          }

          // Отправляем push уведомление если есть device token
          if (driver.deviceToken) {
            let categoryText = '';
            switch (orderType) {
              case OrderType.CARGO:
                categoryText = 'Грузоперевозка';
                break;
              case OrderType.DELIVERY:
                categoryText = 'Доставка';
                break;
              case OrderType.INTERCITY_TAXI:
                categoryText = 'Межгород';
                break;
              case OrderType.TAXI:
                categoryText = 'Такси';
            }

            await this.notificationService.sendNotificationByUserId(
              'Aday Go',
              `Появился новый заказ для ${categoryText}`,
              driver.deviceToken
            );
          }
        }
      }
    } catch (error) {
      console.error('❌ Ошибка при обработке создания заказа:', error);
    }
  }
}
