import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OrderRequestRepository } from '../../domain-repositories/order-request/order-request.repository';
import { OrderRequestEntity } from '@domain/order-request/domain/entities/order-request.entity';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { UserRepository } from '../../domain-repositories/user/user.repository';
import { UserEntity } from '@domain/user/domain/entities/user.entity';
import { OrderStatus, OrderType } from '@infrastructure/enums';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { NotificationService } from '@modules/firebase/notification.service';

@WebSocketGateway({
  path: '/socket.io/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Оптимизированные настройки для стабильности
  transports: ['websocket', 'polling'],
  pingTimeout: 60000, // 60 секунд
  pingInterval: 25000, // 25 секунд
  upgradeTimeout: 10000, // 10 секунд
  maxHttpBufferSize: 1e6, // 1MB
  allowEIO3: true, // Поддержка старых версий
})
export class OrderRequestGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer() server: Server;

  // Хранение подключений по типам пользователей
  private clientConnections = new Map<string, Set<string>>(); // userId -> Set<socketId>
  private driverConnections = new Map<string, Set<string>>(); // driverId -> Set<socketId>
  private onlineDrivers = new Set<string>(); // Set<driverId>
  
  // Лимиты соединений
  private readonly MAX_CONNECTIONS_PER_USER = 3; // Максимум 3 соединения на пользователя
  private readonly MAX_TOTAL_CONNECTIONS = 1000; // Максимум 1000 соединений всего

  constructor(
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly cacheStorageService: CloudCacheStorageService,
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const { userType, userId, driverId, sessionId, lat, lng } = client.handshake.query as any;
      
      console.log(`🔌 Новое подключение: userType=${userType}, userId=${userId}, driverId=${driverId}`);

      // Проверяем общий лимит соединений
      const totalConnections = this.getTotalConnections();
      if (totalConnections >= this.MAX_TOTAL_CONNECTIONS) {
        console.log(`❌ Отклонено подключение: превышен лимит соединений (${totalConnections}/${this.MAX_TOTAL_CONNECTIONS})`);
        client.disconnect();
        return;
      }

      if (!sessionId) {
        console.log('❌ Отклонено подключение: отсутствует sessionId');
        client.disconnect();
        return;
      }

      if (userType === 'client') {
        await this.handleClientConnection(client, userId, sessionId);
      } else if (userType === 'driver') {
        await this.handleDriverConnection(client, driverId, sessionId, lat, lng);
      } else {
        console.log(`❌ Неизвестный тип пользователя: ${userType}`);
        client.disconnect();
        return;
      }

      console.log(`✅ Пользователь подключен: ${userType} - ${userId || driverId}`);
      
    } catch (error) {
      console.error('❌ Ошибка при подключении:', error);
      client.disconnect();
    }
  }

  private async handleClientConnection(client: Socket, userId: string, sessionId: string) {
    if (!userId) {
      client.disconnect();
      return;
    }

    // Проверяем лимит соединений для пользователя
    const userConnections = this.clientConnections.get(userId);
    if (userConnections && userConnections.size >= this.MAX_CONNECTIONS_PER_USER) {
      console.log(`❌ Отклонено подключение клиента ${userId}: превышен лимит соединений (${userConnections.size}/${this.MAX_CONNECTIONS_PER_USER})`);
      client.disconnect();
      return;
    }

    // Добавляем в хранилище клиентских подключений
    if (!this.clientConnections.has(userId)) {
      this.clientConnections.set(userId, new Set());
    }
    this.clientConnections.get(userId)!.add(client.id);

    // Присоединяем к комнате клиента
    client.join(`client_${userId}`);

    // Обновляем кеш
    await this.cacheStorageService.addSocketId(userId, client.id);

    console.log(`📱 Клиент подключен: ${userId}`);
  }

  private async handleDriverConnection(client: Socket, driverId: string, sessionId: string, lat?: string, lng?: string) {
    console.log(`🚗 Водитель подключается: ${driverId}, сессия: ${sessionId}`);
    
    // Проверяем лимит соединений для водителя
    const driverConnections = this.driverConnections.get(driverId);
    if (driverConnections && driverConnections.size >= this.MAX_CONNECTIONS_PER_USER) {
      console.log(`❌ Отклонено подключение водителя ${driverId}: превышен лимит соединений (${driverConnections.size}/${this.MAX_CONNECTIONS_PER_USER})`);
      client.disconnect();
      return;
    }
    
    // Добавляем водителя в комнату его ID для индивидуальных уведомлений
    client.join(`driver_${driverId}`);
    
    // АВТОМАТИЧЕСКИ добавляем в онлайн при подключении к сокету
    this.onlineDrivers.add(driverId);
    client.join('online_drivers');
    
    // Добавляем в Map подключений водителей
    if (!this.driverConnections.has(driverId)) {
      this.driverConnections.set(driverId, new Set());
    }
    this.driverConnections.get(driverId)!.add(client.id);
    
    // Если указаны координаты - обновляем местоположение
    if (lat && lng) {
      try {
        await this.cacheStorageService.updateDriverLocation(driverId, lat, lng);
        console.log(`📍 Обновлено местоположение водителя ${driverId}: ${lat}, ${lng}`);
      } catch (error) {
        console.error(`❌ Ошибка обновления местоположения водителя ${driverId}:`, error);
      }
    }
    
    // Сохраняем связь сокета с водителем
    client.data.driverId = driverId;
    client.data.userType = 'driver';
    
    console.log(`✅ Водитель ${driverId} успешно подключен (сокет: ${client.id})`);
    console.log(`🟢 Водитель ${driverId} автоматически онлайн (всего онлайн: ${this.onlineDrivers.size})`);
  }

  async handleDisconnect(client: Socket) {
    try {
      const { userType, userId, driverId } = client.handshake.query as any;

      if (userType === 'client' && userId) {
        await this.handleClientDisconnection(client, userId);
      } else if (userType === 'driver' && driverId) {
        await this.handleDriverDisconnection(client, driverId);
      }

      console.log(`🔌 Пользователь отключен: ${userType} - ${userId || driverId}`);
      
    } catch (error) {
      console.error('❌ Ошибка при отключении:', error);
    }
  }

  private async handleClientDisconnection(client: Socket, userId: string) {
    // Удаляем из хранилища клиентских подключений
    const clientSockets = this.clientConnections.get(userId);
    if (clientSockets) {
      clientSockets.delete(client.id);
      if (clientSockets.size === 0) {
        this.clientConnections.delete(userId);
      }
    }

    // Покидаем комнаты
    client.leave(`client_${userId}`);

    // Обновляем кеш
    await this.cacheStorageService.removeSocketId(userId, client.id);

    console.log(`📱 Клиент отключен: ${userId}`);
  }

  private async handleDriverDisconnection(client: Socket, driverId: string) {
    // Удаляем из хранилища подключений водителей
    const driverSockets = this.driverConnections.get(driverId);
    if (driverSockets) {
      driverSockets.delete(client.id);
      if (driverSockets.size === 0) {
        this.driverConnections.delete(driverId);
        this.onlineDrivers.delete(driverId); // Водитель больше не онлайн
      }
    }

    // Покидаем комнаты
    client.leave(`driver_${driverId}`);
    client.leave('all_drivers');

    // Обновляем кеш
    await this.cacheStorageService.removeSocketId(driverId, client.id);

    console.log(`🚗 Водитель отключен: ${driverId}`);
  }

  @SubscribeMessage('driverOnline')
  async handleDriverOnline(client: Socket, data: any) {
    const driverId = client.handshake.query.driverId as string;
    if (driverId) {
      this.onlineDrivers.add(driverId);
      client.join('online_drivers');
      console.log(`🟢 Водитель вышел онлайн: ${driverId} (всего онлайн: ${this.onlineDrivers.size})`);
    } else {
      console.log(`❌ Попытка выйти онлайн без driverId`);
    }
  }

  @SubscribeMessage('driverOffline')
  async handleDriverOffline(client: Socket, data: any) {
    const driverId = client.handshake.query.driverId as string;
    if (driverId) {
      this.onlineDrivers.delete(driverId);
      client.leave('online_drivers');
      console.log(`🔴 Водитель ушел оффлайн: ${driverId}`);
    }
  }

  @SubscribeMessage('ping')
  async handlePing(client: Socket, data: any) {
    // Отвечаем на ping событие для поддержания соединения
    client.emit('pong', { 
      timestamp: Date.now(),
      received: data?.timestamp || Date.now()
    });
    console.log(`💓 Ping получен от ${client.handshake.query.userType}: ${client.handshake.query.userId || client.handshake.query.driverId}`);
  }

  @SubscribeMessage('driverLocationUpdate')
  async handleDriverLocationUpdate(client: Socket, data: { lat: number, lng: number, timestamp?: number }) {
    const driverId = client.handshake.query.driverId as string;
    if (!driverId) return;

    const { lat, lng } = data;
    
    try {
      // ВСЕГДА обновляем позицию в кеше, независимо от наличия заказа
      await this.cacheStorageService.updateDriverLocation(driverId, String(lat), String(lng));

      // Находим активный заказ водителя
      const orderRequest = await this.orderRequestRepository.findActiveByDriverId(driverId);

      // Отправляем позицию клиенту ТОЛЬКО если есть активный заказ
      if (orderRequest) {
        const clientId = orderRequest.getPropsCopy().clientId.value;
        const orderStatus = orderRequest.getPropsCopy().orderStatus;
        
        console.log(`📍 Отправляем позицию водителя ${driverId} клиенту ${clientId}, статус заказа: ${orderStatus}`);
        
        await this.notifyClient(clientId, 'driverLocation', {
          lat,
          lng,
          driverId,
          orderId: orderRequest.id.value,
          orderStatus: orderStatus,
          timestamp: data.timestamp || Date.now()
        });
      } else {
        console.log(`📍 Водитель ${driverId} обновил позицию, но активного заказа нет`);
      }

      // Логируем обновление позиции (можно убрать в продакшене для экономии логов)
      // console.log(`📍 Обновлена позиция водителя ${driverId}: ${lat}, ${lng}`);
      
    } catch (error) {
      console.error(`❌ Ошибка обновления позиции водителя ${driverId}:`, error);
    }
  }

  // === МЕТОДЫ ДЛЯ УВЕДОМЛЕНИЙ ===

  // Уведомление конкретного клиента
  async notifyClient(userId: string, event: string, data: any) {
    this.server.to(`client_${userId}`).emit(event, data);
    console.log(`📱 Отправлено клиенту ${userId}: ${event}`);
  }

  // Уведомление конкретного водителя
  async notifyDriver(driverId: string, event: string, data: any) {
    this.server.to(`driver_${driverId}`).emit(event, data);
    console.log(`🚗 Отправлено водителю ${driverId}: ${event}`);
  }

  // Рассылка всем онлайн водителям
  async broadcastToOnlineDrivers(event: string, data: any) {
    this.server.to('online_drivers').emit(event, data);
    console.log(`📢 Рассылка всем онлайн водителям: ${event}`);
  }

  async handleOrderCreated(orderRequest: OrderRequestEntity) {
    const lat = orderRequest.getPropsCopy().lat;
    const lng = orderRequest.getPropsCopy().lng;
    const orderType = orderRequest.getPropsCopy().orderType;
    const clientId = orderRequest.getPropsCopy().clientId.value;

    if (!lat || !lng) {
      throw new Error('Latitude and Longitude are required');
    }

    try {
      // Находим ближайших водителей
      const nearestDrivers = await this.cacheStorageService.findNearestDrivers(lat, lng);
      const drivers = await UserOrmEntity.query()
        .findByIds(nearestDrivers.map(id => String(id)))
        .withGraphFetched({ categoryLicenses: true });

      console.log(`📦 Создан новый заказ ${orderRequest.id.value}, найдено водителей: ${drivers.length}`);
      
      // ДОПОЛНИТЕЛЬНО: Рассылаем всем онлайн водителям для гарантии доставки
      console.log(`📢 Количество онлайн водителей: ${this.onlineDrivers.size}`);
      console.log(`📢 Список онлайн водителей: ${Array.from(this.onlineDrivers).join(', ')}`);
      
      // Рассылаем заказ всем онлайн водителям подходящей категории
      await this.broadcastToOnlineDrivers('newOrder', {
        id: orderRequest.id.value,
        from: orderRequest.getPropsCopy().from,
        to: orderRequest.getPropsCopy().to,
        price: orderRequest.getPropsCopy().price,
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

        console.log(`🔍 Водитель ${driver.id}: категория=${hasMatchingCategory}, онлайн=${this.onlineDrivers.has(driver.id)}, не клиент=${clientId !== driver.id}`);

        // Не отправляем заказ самому клиенту если он водитель
        if (hasMatchingCategory && clientId !== driver.id) {
          
          // Отправляем WebSocket уведомление только онлайн водителям
          if (this.onlineDrivers.has(driver.id)) {
            await this.notifyDriver(driver.id, 'newOrder', {
              id: orderRequest.id.value,
              from: orderRequest.getPropsCopy().from,
              to: orderRequest.getPropsCopy().to,
              price: orderRequest.getPropsCopy().price,
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

  async handleOrderRejected(userId: string) {
    try {
      await this.notifyClient(userId, 'orderRejected', {
        timestamp: Date.now()
      });
      
      console.log(`❌ Заказ отклонен для клиента ${userId}`);
      
    } catch (error) {
      console.error('❌ Ошибка при обработке отклонения заказа:', error);
    }
  }

  async handleOrderAccepted(orderRequest: OrderRequestEntity, driver: UserEntity) {
    const clientId = orderRequest.getPropsCopy().clientId.value;
    const orderId = orderRequest.id.value;
    const driverId = driver.id.value;

    console.log(`🔄 Обработка принятия заказа: orderId=${orderId}, clientId=${clientId}, driverId=${driverId}`);

    try {
      // Уведомляем клиента о принятии заказа
      console.log(`📤 Отправляем событие orderAccepted клиенту ${clientId}`);
      await this.notifyClient(clientId, 'orderAccepted', {
        orderId,
        driverId,
        driver: driver.getPropsCopy(),
        order: orderRequest.getPropsCopy(),
        timestamp: Date.now()
      });

      // Уведомляем других водителей что заказ занят
      console.log(`📤 Отправляем событие orderTaken всем водителям`);
      await this.broadcastToOnlineDrivers('orderTaken', {
        orderId,
        takenBy: driverId,
        timestamp: Date.now()
      });

      console.log(`✅ Заказ ${orderId} принят водителем ${driverId}`);
      
    } catch (error) {
      console.error('❌ Ошибка при обработке принятия заказа:', error);
    }
  }

  async handleDriverArrived(orderRequest: OrderRequestEntity, driver: UserEntity) {
    const clientId = orderRequest.getPropsCopy().clientId.value;
    const orderId = orderRequest.id.value;
    const driverId = driver.id.value;

    try {
      // Уведомляем клиента что водитель прибыл (на месте)
      await this.notifyClient(clientId, 'driverArrived', {
        orderId,
        driverId,
        driver: driver.getPropsCopy(),
        order: orderRequest.getPropsCopy(),
        message: 'Водитель прибыл и ждет вас',
        timestamp: Date.now()
      });

      console.log(`🚗 Водитель ${driverId} прибыл к клиенту ${clientId} для заказа ${orderId}`);
      
    } catch (error) {
      console.error('❌ Ошибка при обработке прибытия водителя:', error);
    }
  }

  async handleRideStarted(orderRequest: OrderRequestEntity, driver: UserEntity) {
    const clientId = orderRequest.getPropsCopy().clientId.value;
    const orderId = orderRequest.id.value;
    const driverId = driver.id.value;

    try {
      // Уведомляем клиента что поездка началась
      await this.notifyClient(clientId, 'rideStarted', {
        orderId,
        driverId,
        driver: driver.getPropsCopy(),
        order: orderRequest.getPropsCopy(),
        message: 'Поездка началась',
        timestamp: Date.now()
      });

      console.log(`🚀 Поездка началась: заказ ${orderId}, водитель ${driverId}`);
      
    } catch (error) {
      console.error('❌ Ошибка при обработке начала поездки:', error);
    }
  }

  async handleRideEnded(orderRequest: OrderRequestEntity, driver: UserEntity) {
    const clientId = orderRequest.getPropsCopy().clientId.value;
    const orderId = orderRequest.id.value;
    const driverId = driver.id.value;

    try {
      // Уведомляем клиента что поездка завершена
      await this.notifyClient(clientId, 'rideEnded', {
        orderId,
        driverId,
        driver: driver.getPropsCopy(),
        order: orderRequest.getPropsCopy(),
        message: 'Поездка завершена',
        timestamp: Date.now()
      });

      console.log(`🏁 Поездка завершена: заказ ${orderId}, водитель ${driverId}`);
      
    } catch (error) {
      console.error('❌ Ошибка при обработке завершения поездки:', error);
    }
  }

  async handleOrderCancelledByClient(orderRequest: OrderRequestEntity, reason: string = 'cancelled_by_client') {
    const orderId = orderRequest.id.value;
    const driverId = orderRequest.getPropsCopy().driverId?.value;
    const clientId = orderRequest.getPropsCopy().clientId.value;

    try {
      // Если заказ был принят водителем - уведомляем его об отмене
      if (driverId) {
        await this.notifyDriver(driverId, 'orderCancelledByClient', {
          orderId,
          clientId,
          reason,
          message: 'Клиент отменил заказ',
          timestamp: Date.now()
        });
      }

      // Уведомляем всех водителей об удалении заказа из списка
      await this.broadcastToOnlineDrivers('orderDeleted', {
        orderId,
        reason: 'cancelled_by_client',
        timestamp: Date.now()
      });

      console.log(`🚫 Заказ ${orderId} отменен клиентом. Причина: ${reason}`);
      
    } catch (error) {
      console.error('❌ Ошибка при обработке отмены заказа клиентом:', error);
    }
  }

  async handleOrderCancelledByDriver(orderRequest: OrderRequestEntity, driver: UserEntity, reason: string = 'cancelled_by_driver') {
    const orderId = orderRequest.id.value;
    const driverId = driver.id.value;
    const clientId = orderRequest.getPropsCopy().clientId.value;

    try {
      // Уведомляем клиента об отмене заказа водителем
      await this.notifyClient(clientId, 'orderCancelledByDriver', {
        orderId,
        driverId,
        driver: driver.getPropsCopy(),
        reason,
        message: 'Водитель отменил заказ',
        timestamp: Date.now()
      });

      // Заказ снова становится доступным для других водителей
      await this.broadcastToOnlineDrivers('newOrder', {
        id: orderId,
        from: orderRequest.getPropsCopy().from,
        to: orderRequest.getPropsCopy().to,
        price: orderRequest.getPropsCopy().price,
        orderType: orderRequest.getPropsCopy().orderType,
        clientId: clientId,
        lat: orderRequest.getPropsCopy().lat,
        lng: orderRequest.getPropsCopy().lng,
        message: 'Заказ снова доступен',
        timestamp: Date.now()
      });

      console.log(`🚫 Заказ ${orderId} отменен водителем ${driverId}. Причина: ${reason}`);
      
    } catch (error) {
      console.error('❌ Ошибка при обработке отмены заказа водителем:', error);
    }
  }

  // Новый метод для периодической отправки позиций всех водителей клиентам (если нужно)
  async broadcastDriversLocationToClients() {
    try {
      // Получаем всех водителей с активными заказами
      const activeOrders = await this.orderRequestRepository.findMany({
        orderStatus: { $in: ['STARTED', 'WAITING', 'ONGOING'] } as any
      });

      for (const order of activeOrders) {
        const driverId = order.getPropsCopy().driverId?.value;
        const clientId = order.getPropsCopy().clientId.value;

        if (driverId && clientId) {
          // Получаем последнюю позицию водителя из кеша
          const location = await this.cacheStorageService.getDriverLocation(driverId);
          
          if (location) {
            await this.notifyClient(clientId, 'driverLocation', {
              lat: location.latitude,
              lng: location.longitude,
              driverId,
              orderId: order.id.value,
              orderStatus: order.getPropsCopy().orderStatus,
              timestamp: Date.now()
            });
          }
        }
      }
    } catch (error) {
      console.error('❌ Ошибка рассылки позиций водителей:', error);
    }
  }

  // Вспомогательные методы для получения статистики
  getConnectionStats() {
    return {
      clients: this.clientConnections.size,
      drivers: this.driverConnections.size,
      onlineDrivers: this.onlineDrivers.size,
      totalSockets: this.server.sockets.sockets.size
    };
  }

  isDriverOnline(driverId: string): boolean {
    return this.onlineDrivers.has(driverId);
  }

  isClientConnected(userId: string): boolean {
    return this.clientConnections.has(userId);
  }

  // Подсчет общего количества соединений
  private getTotalConnections(): number {
    let total = 0;
    for (const connections of this.clientConnections.values()) {
      total += connections.size;
    }
    for (const connections of this.driverConnections.values()) {
      total += connections.size;
    }
    return total;
  }

  async emitEvent(userId: string, event: string, order: OrderRequestEntity, driver: UserEntity) {
    try {
      const data = {
        order: order.getPropsCopy(),
        status: order.getPropsCopy().orderStatus,
        driver: driver.getPropsCopy(),
        timestamp: Date.now()
      };

      await this.notifyClient(userId, event, data);
      
      console.log(`📤 Событие ${event} отправлено клиенту ${userId}`);
      
    } catch (error) {
      console.error(`❌ Ошибка отправки события ${event} клиенту ${userId}:`, error);
    }
  }
}

