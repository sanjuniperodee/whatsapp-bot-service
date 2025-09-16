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
import { NotificationService } from '@modules/firebase/notification.service';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';

@WebSocketGateway({
  path: '/socket.io/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Оптимизированные настройки для стабильности
  transports: ['websocket', 'polling'],
  pingTimeout: 60000, // 60 секунд - оптимальное время для мобильных устройств
  pingInterval: 25000, // 25 секунд - более частые проверки
  upgradeTimeout: 10000, // 10 секунд - уменьшаем для быстрого апгрейда
  maxHttpBufferSize: 1e6, // 1MB
  allowEIO3: true, // Поддержка старых версий
  connectTimeout: 20000, // 20 секунд на подключение
})
export class OrderRequestGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer() server: Server;

  constructor(
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly cacheStorageService: CloudCacheStorageService,
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
  ) {
    // Запускаем периодическую очистку неактивных сокетов каждые 5 минут
    setInterval(() => {
      this.cleanupInactiveSockets();
    }, 5 * 60 * 1000); // 5 минут
  }

  async handleConnection(client: Socket) {
    try {
      const { userType, userId, driverId, sessionId, lat, lng } = client.handshake.query as any;
      
      console.log(`🔌 Новое подключение: userType=${userType}, userId=${userId}, driverId=${driverId}`);

      // Проверка лимита соединений удалена - теперь используется Redis для хранения соединений

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

    // Присоединяем к комнате клиента
    client.join(`client_${userId}`);

    // Добавляем socket ID в Redis
    await this.cacheStorageService.addSocketId(userId, client.id);

    console.log(`📱 Клиент подключен: ${userId}`);

    // Синхронизируем активный заказ клиента
    await this.syncClientActiveOrder(userId, client);
  }

  private async handleDriverConnection(client: Socket, driverId: string, sessionId: string, lat?: string, lng?: string) {
    console.log(`🚗 Водитель подключается: ${driverId}, сессия: ${sessionId}`);
    
    // Добавляем водителя в комнату его ID для индивидуальных уведомлений
    client.join(`driver_${driverId}`);
    
    // АВТОМАТИЧЕСКИ добавляем в онлайн при подключении к сокету
    await this.cacheStorageService.addOnlineDriver(driverId);
    client.join('online_drivers');
    
    // Добавляем socket ID в Redis
    await this.cacheStorageService.addSocketId(driverId, client.id);
    
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
    
    const onlineCount = await this.cacheStorageService.getOnlineDriversCount();
    console.log(`✅ Водитель ${driverId} успешно подключен (сокет: ${client.id})`);
    console.log(`🟢 Водитель ${driverId} автоматически онлайн (всего онлайн: ${onlineCount})`);

    // Синхронизируем активный заказ водителя
    await this.syncDriverActiveOrder(driverId, client);
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
    // Покидаем комнаты
    client.leave(`client_${userId}`);

    // Удаляем socket ID из Redis
    await this.cacheStorageService.removeSocketId(userId, client.id);

    console.log(`📱 Клиент отключен: ${userId}`);
  }

  private async handleDriverDisconnection(client: Socket, driverId: string) {
    // Покидаем комнаты
    client.leave(`driver_${driverId}`);
    client.leave('online_drivers');

    // Удаляем socket ID из Redis
    await this.cacheStorageService.removeSocketId(driverId, client.id);

    // Проверяем, остались ли активные сокеты у водителя
    const hasActiveSockets = await this.cacheStorageService.hasActiveSockets(driverId);
    if (!hasActiveSockets) {
      // Если нет активных сокетов, убираем водителя из онлайн
      await this.cacheStorageService.removeOnlineDriver(driverId);
      console.log(`🔴 Водитель ${driverId} ушел оффлайн (нет активных сокетов)`);
    }

    console.log(`🚗 Водитель отключен: ${driverId}`);
  }

  @SubscribeMessage('driverOnline')
  async handleDriverOnline(client: Socket, data: any) {
    const driverId = client.handshake.query.driverId as string;
    if (driverId) {
      await this.cacheStorageService.addOnlineDriver(driverId);
      client.join('online_drivers');
      const onlineCount = await this.cacheStorageService.getOnlineDriversCount();
      console.log(`🟢 Водитель вышел онлайн: ${driverId} (всего онлайн: ${onlineCount})`);
    } else {
      console.log(`❌ Попытка выйти онлайн без driverId`);
    }
  }

  @SubscribeMessage('driverOffline')
  async handleDriverOffline(client: Socket, data: any) {
    const driverId = client.handshake.query.driverId as string;
    if (driverId) {
      await this.cacheStorageService.removeOnlineDriver(driverId);
      client.leave('online_drivers');
      console.log(`🔴 Водитель ушел оффлайн: ${driverId}`);
    }
  }

  // Ping handler removed - Socket.IO has built-in ping/pong mechanism
  // @SubscribeMessage('ping') - не нужен, так как Socket.IO автоматически обрабатывает ping/pong

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

  // === МЕТОДЫ ДЛЯ СИНХРОНИЗАЦИИ ===

  // Синхронизация активного заказа клиента при подключении
  private async syncClientActiveOrder(userId: string, client: Socket) {
    try {
      console.log(`🔄 Синхронизация активного заказа для клиента ${userId}`);
      
      // Находим активный заказ клиента
      const activeOrder = await this.orderRequestRepository.findActiveByClientId(userId);
      
      if (activeOrder) {
        const orderId = activeOrder.id.value;
        const orderStatus = activeOrder.getPropsCopy().orderStatus;
        const driverId = activeOrder.getPropsCopy().driverId?.value;
        
        console.log(`📋 Найден активный заказ ${orderId} со статусом ${orderStatus} для клиента ${userId}`);
        
        // Отправляем событие синхронизации
        client.emit('orderSync', {
          orderId,
          orderStatus,
          driverId,
          order: activeOrder.getPropsCopy(),
          timestamp: Date.now(),
          message: 'Активный заказ синхронизирован'
        });
        
        console.log(`📤 Отправлено событие orderSync клиенту ${userId} для заказа ${orderId}`);
        
        // Если есть водитель, отправляем его информацию
        if (driverId) {
          const driver = await this.userRepository.findOneById(driverId);
          if (driver) {
            client.emit('driverInfo', {
              driverId,
              driver: driver.getPropsCopy(),
              timestamp: Date.now()
            });
            
            console.log(`📤 Отправлена информация о водителе ${driverId} клиенту ${userId}`);
          }
        }
      } else {
        console.log(`ℹ️ Активный заказ не найден для клиента ${userId}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка синхронизации активного заказа для клиента ${userId}:`, error);
    }
  }

  // Синхронизация активного заказа водителя при подключении
  private async syncDriverActiveOrder(driverId: string, client: Socket) {
    try {
      console.log(`🔄 Синхронизация активного заказа для водителя ${driverId}`);
      
      // Находим активный заказ водителя
      const activeOrder = await this.orderRequestRepository.findActiveByDriverId(driverId);
      
      if (activeOrder) {
        const orderId = activeOrder.id.value;
        const orderStatus = activeOrder.getPropsCopy().orderStatus;
        const clientId = activeOrder.getPropsCopy().clientId.value;
        
        console.log(`📋 Найден активный заказ ${orderId} со статусом ${orderStatus} для водителя ${driverId}`);
        
        // Отправляем событие синхронизации
        client.emit('orderSync', {
          orderId,
          orderStatus,
          clientId,
          order: activeOrder.getPropsCopy(),
          timestamp: Date.now(),
          message: 'Активный заказ синхронизирован'
        });
        
        console.log(`📤 Отправлено событие orderSync водителю ${driverId} для заказа ${orderId}`);
        
        // Отправляем информацию о клиенте
        const clientUser = await this.userRepository.findOneById(clientId);
        if (clientUser) {
          client.emit('clientInfo', {
            clientId,
            client: clientUser.getPropsCopy(),
            timestamp: Date.now()
          });
          
          console.log(`📤 Отправлена информация о клиенте ${clientId} водителю ${driverId}`);
        }
      } else {
        console.log(`ℹ️ Активный заказ не найден для водителя ${driverId}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка синхронизации активного заказа для водителя ${driverId}:`, error);
    }
  }

  // === МЕТОДЫ ДЛЯ УВЕДОМЛЕНИЙ ===

  // Очистка неактивных сокетов из Redis
  async cleanupInactiveSockets() {
    try {
      console.log('🧹 Начинаем очистку неактивных сокетов...');
      
      // Получаем все ключи сокетов из Redis
      const socketKeys = await this.cacheStorageService.getSocketKeys();
      let cleanedCount = 0;
      
      for (const key of socketKeys) {
        const userId = key.replace('sockets:', '');
        const socketIds = await this.cacheStorageService.getSocketIds(userId);
        
        const activeSockets = [];
        const inactiveSockets = [];
        
        for (const socketId of socketIds) {
          const socket = this.server.sockets.sockets.get(socketId);
          if (socket && socket.connected) {
            activeSockets.push(socketId);
          } else {
            inactiveSockets.push(socketId);
          }
        }
        
        // Удаляем неактивные сокеты
        for (const socketId of inactiveSockets) {
          await this.cacheStorageService.removeSocketId(userId, socketId);
          cleanedCount++;
        }
      }
      
      console.log(`🧹 Очистка завершена. Удалено ${cleanedCount} неактивных сокетов`);
    } catch (error) {
      console.error('❌ Ошибка при очистке неактивных сокетов:', error);
    }
  }

  // Уведомление конкретного клиента (всем его сокетам)
  async notifyClient(userId: string, event: string, data: any) {
    const clientSockets = await this.cacheStorageService.getSocketIds(userId);
    if (clientSockets && clientSockets.length > 0) {
      console.log(`📱 Отправляем событие ${event} клиенту ${userId} на ${clientSockets.length} сокетов`);
      
      let successCount = 0;
      const inactiveSockets = [];
      
      for (const socketId of clientSockets) {
        try {
          const socket = this.server.sockets.sockets.get(socketId);
          if (socket && socket.connected) {
            socket.emit(event, data);
            successCount++;
          } else {
            console.log(`⚠️ Сокет ${socketId} клиента ${userId} неактивен, удаляем из Redis`);
            inactiveSockets.push(socketId);
          }
        } catch (error) {
          console.error(`❌ Ошибка отправки на сокет ${socketId}:`, error);
          inactiveSockets.push(socketId);
        }
      }
      
      // Удаляем неактивные сокеты из Redis
      for (const socketId of inactiveSockets) {
        try {
          await this.cacheStorageService.removeSocketId(userId, socketId);
          console.log(`🧹 Удален неактивный сокет ${socketId} клиента ${userId} из Redis`);
        } catch (error) {
          console.error(`❌ Ошибка удаления сокета ${socketId} из Redis:`, error);
        }
      }
      
      console.log(`📱 Успешно отправлено на ${successCount}/${clientSockets.length} сокетов клиента ${userId}: ${event}`);
    } else {
      console.log(`⚠️ Нет активных сокетов для клиента ${userId}`);
    }
  }

  // Уведомление конкретного водителя (всем его сокетам)
  async notifyDriver(driverId: string, event: string, data: any) {
    const driverSockets = await this.cacheStorageService.getSocketIds(driverId);
    if (driverSockets && driverSockets.length > 0) {
      console.log(`🚗 Отправляем событие ${event} водителю ${driverId} на ${driverSockets.length} сокетов`);
      
      let successCount = 0;
      const inactiveSockets = [];
      
      for (const socketId of driverSockets) {
        try {
          const socket = this.server.sockets.sockets.get(socketId);
          if (socket && socket.connected) {
            socket.emit(event, data);
            successCount++;
          } else {
            console.log(`⚠️ Сокет ${socketId} водителя ${driverId} неактивен, удаляем из Redis`);
            inactiveSockets.push(socketId);
          }
        } catch (error) {
          console.error(`❌ Ошибка отправки на сокет ${socketId}:`, error);
          inactiveSockets.push(socketId);
        }
      }
      
      // Удаляем неактивные сокеты из Redis
      for (const socketId of inactiveSockets) {
        try {
          await this.cacheStorageService.removeSocketId(driverId, socketId);
          console.log(`🧹 Удален неактивный сокет ${socketId} водителя ${driverId} из Redis`);
        } catch (error) {
          console.error(`❌ Ошибка удаления сокета ${socketId} из Redis:`, error);
        }
      }
      
      // Если у водителя не осталось активных сокетов, убираем его из онлайн
      if (successCount === 0 && driverSockets.length > 0) {
        const hasActiveSockets = await this.cacheStorageService.hasActiveSockets(driverId);
        if (!hasActiveSockets) {
          await this.cacheStorageService.removeOnlineDriver(driverId);
          console.log(`🔴 Водитель ${driverId} убран из онлайн (нет активных сокетов)`);
        }
      }
      
      console.log(`🚗 Успешно отправлено на ${successCount}/${driverSockets.length} сокетов водителя ${driverId}: ${event}`);
    } else {
      console.log(`⚠️ Нет активных сокетов для водителя ${driverId}`);
    }
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
      const onlineDriversList = await this.cacheStorageService.getOnlineDrivers();
      console.log(`📢 Количество онлайн водителей: ${onlineDriversList.length}`);
      console.log(`📢 Список онлайн водителей: ${onlineDriversList.join(', ')}`);
      
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

        const isDriverOnline = await this.cacheStorageService.isDriverOnline(driver.id);
        console.log(`🔍 Водитель ${driver.id}: категория=${hasMatchingCategory}, онлайн=${isDriverOnline}, не клиент=${clientId !== driver.id}`);

        // Не отправляем заказ самому клиенту если он водитель
        if (hasMatchingCategory && clientId !== driver.id) {
          
          // Отправляем WebSocket уведомление только онлайн водителям
          if (isDriverOnline) {
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
  async getConnectionStats() {
    const onlineDriversCount = await this.cacheStorageService.getOnlineDriversCount();
    return {
      onlineDrivers: onlineDriversCount,
      totalSockets: this.server.sockets.sockets.size
    };
  }

  async isDriverOnline(driverId: string): Promise<boolean> {
    return await this.cacheStorageService.isDriverOnline(driverId);
  }

  async isClientConnected(userId: string): Promise<boolean> {
    return await this.cacheStorageService.hasActiveSockets(userId);
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

