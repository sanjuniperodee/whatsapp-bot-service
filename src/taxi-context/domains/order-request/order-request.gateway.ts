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
  path: '/socket.io/',  // Ensure this matches the client or change it
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  }
})
export class OrderRequestGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer() server: Server;

  constructor(
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly cacheStorageService: CloudCacheStorageService,
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
    // @Inject(forwardRef(() => WhatsAppService))
    // private readonly whatsAppService: WhatsAppService,
  ) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (userId) {
      // Получаем текущие сокеты пользователя
      const connections = await this.cacheStorageService.getSocketIds(userId);

      // Удаляем все предыдущие сокеты из Redis и отключаем их
      // await Promise.all(
      //   connections.map(async (socketId) => {
      //     const existingSocket = this.server.sockets.sockets.get(socketId);
      //     if (existingSocket) {
      //       existingSocket.disconnect(true); // Отключаем сокет
      //     }
      //     await this.cacheStorageService.removeSocketId(userId, socketId); // Удаляем сокет из Redis
      //   }),
      // );

      // Добавляем новый сокет пользователя в Redis
      await this.cacheStorageService.addSocketId(userId, client.id);

      // Логируем подключение
      console.log({ CONNECTED: userId });

      // Отправляем событие пользователю
      this.server.to(client.id).emit('newOrder');

      // Присоединяем сокет к комнате пользователя
      client.join(userId);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (userId) {
      // Удаляем Socket ID из множества
      console.log({"DISCONNECTED:" : userId})

      await this.cacheStorageService.removeSocketId(userId, client.id);
      client.leave(userId);
    }
  }

  @SubscribeMessage('updateLocation')
  async handleLocationUpdate(client: Socket, data: { driverId: string, latitude: number, longitude: number, orderId: string }) {
    const parsedData = JSON.parse(data.toString())
    const { driverId, latitude, longitude } = parsedData;
    await this.cacheStorageService.updateDriverLocation(driverId, latitude, longitude);

    const orderRequest = await this.orderRequestRepository.findActiveByDriverId(driverId)

    if (orderRequest) {
      const user = await this.userRepository.findOneById(orderRequest.getPropsCopy().clientId.value);
      if (user) {
        const clientSocketIds = await this.cacheStorageService.getSocketIds(user.id.value);
        if (clientSocketIds) {
          clientSocketIds.forEach(socketId => {
            this.server.to(socketId).emit('driverLocation', { lat: latitude, lng: longitude });
          });
        }
      }
    }
  }

  async handleOrderCreated(orderRequest: OrderRequestEntity) {
    const lat = orderRequest.getPropsCopy().lat;
    const lng = orderRequest.getPropsCopy().lng;
    if (!lat || !lng) {
      throw new Error('Latitude and Longitude are required');
    }
    const nearestDrivers = await this.cacheStorageService.findNearestDrivers(lat, lng);
    const drivers = await UserOrmEntity.query().findByIds(nearestDrivers).withGraphFetched({categoryLicenses: true})
    console.log(drivers)
    for (const driver of drivers) {
      const driverSocketIds = await this.cacheStorageService.getSocketIds(driver.id);
      console.log('Уведомление о новом заказе!')
      console.log(driver.id)
      const type = orderRequest.getPropsCopy().orderType
      const hasMatchingCategory = driver.categoryLicenses?.some(category => category.categoryType === type);
      if(hasMatchingCategory){
        if (driverSocketIds.length) {
          await Promise.all(driverSocketIds.map(async socketId => {
            await this.server.to(socketId).emit('newOrder');
          }))
        }
        if(driver.deviceToken){
          let text = ''
          switch (type){
            case OrderType.CARGO:
              text = 'Грузоперевозка'
              break
            case OrderType.DELIVERY:
              text = 'Доставка'
              break
            case OrderType.INTERCITY_TAXI:
              text = 'Межгород'
              break
            case OrderType.TAXI:
              text = 'Такси'
          }
          await this.notificationService.sendNotificationByUserId(
            'Aday Go',
            `Появился новый заказ для ${text}`,
            driver.deviceToken
          )
        }
      }
    }
  }

  async handleOrderRejected(userId: string) {
    const clientSocketIds = await this.cacheStorageService.getSocketIds(userId);
    if (clientSocketIds) {
      await clientSocketIds.forEach(socketId => {
        this.server.to(socketId).emit('orderRejected');
      });
    }
  }

  async emitEvent(userId: string, event: string, order: OrderRequestEntity, driver: UserEntity){
    const socketIds = await this.cacheStorageService.getSocketIds(userId);

    if (socketIds.length) {
      // this.server.to(socketIds[socketIds.length-1]).emit(event, { order: order.getPropsCopy(), status: order.getPropsCopy().orderStatus, driver: driver.getPropsCopy() });

      await socketIds.forEach(socketId => {
        this.server.to(socketId).emit(event, { order: order.getPropsCopy(), status: order.getPropsCopy().orderStatus, driver: driver.getPropsCopy() });
      });
    }
  }
}
