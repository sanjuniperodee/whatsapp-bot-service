import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OrderRequestRepository } from '../../domain-repositories/order-request/order-request.repository';
import { OrderRequestEntity } from '@domain/order-request/domain/entities/order-request.entity';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { forwardRef, Inject } from '@nestjs/common';
import { UserRepository } from '../../domain-repositories/user/user.repository';
import { SMSCodeRecord } from '@domain/user/types';
import { UserEntity } from '@domain/user/domain/entities/user.entity';
import { OrderStatus } from '@infrastructure/enums';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';

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
    // @Inject(forwardRef(() => WhatsAppService))
    // private readonly whatsAppService: WhatsAppService,
  ) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (userId) {
      await this.cacheStorageService.addSocketId(userId, client.id);
      client.join(userId);
    }

    console.log(userId, client.id);
  }

  async handleDisconnect(client: Socket) {
    console.log('DISCONNECTED', client.id);
    const userId = client.handshake.query.userId as string;

    if (userId) {
      // Удаляем Socket ID из множества
      await this.cacheStorageService.removeSocketId(userId, client.id);
      client.leave(userId);
    }
  }

  @SubscribeMessage('updateLocation')
  async handleLocationUpdate(client: Socket, data: { driverId: string, latitude: number, longitude: number, orderId: string }) {
    const parsedData = JSON.parse(data.toString())
    const { driverId, latitude, longitude } = parsedData;
    await this.cacheStorageService.updateDriverLocation(driverId, latitude, longitude);

    const orderRequests = await this.orderRequestRepository.findMany({ driverId: new UUID(driverId) })

    for (const orderRequest of orderRequests) {
      if (orderRequest && (orderRequest.getPropsCopy().orderStatus !== OrderStatus.REJECTED && orderRequest.getPropsCopy().orderStatus !== OrderStatus.COMPLETED)) {
        const user = await this.userRepository.findOneById(orderRequest.getPropsCopy().clientId.value);
        if (user) {
          const clientSocketIds = await this.cacheStorageService.getSocketIds(user.id.value);
          if (clientSocketIds) {
            clientSocketIds.forEach(socketId => {
              this.server.to(socketId).emit('driverLocation', { lat: longitude, lng: latitude });
            });
          }
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
    for (const driverId of nearestDrivers) {
      const driverSocketIds = await this.cacheStorageService.getSocketIds(driverId);
      if (driverSocketIds) {
        driverSocketIds.forEach(socketId => {
          this.server.to(socketId).emit('newOrder');
        });
      }    }
  }

  async handleOrderRejected(userId: string) {
    const clientSocketIds = await this.cacheStorageService.getSocketIds(userId);
    if (clientSocketIds) {
      clientSocketIds.forEach(socketId => {
        this.server.to(socketId).emit('orderRejected');
      });
    }
  }

  async emitEvent(userId: string, event: string, order: OrderRequestEntity, driver: UserEntity){
    const socketIds = await this.cacheStorageService.getSocketIds(userId);

    if (socketIds) {
      socketIds.forEach(socketId => {
        this.server.to(socketId).emit(event, { order: order.getPropsCopy(), status: order.getPropsCopy().orderStatus, driver: driver.getPropsCopy() });
      });
    }
  }
}
