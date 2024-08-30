import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OrderRequestRepository } from '../../domain-repositories/order-request/order-request.repository';
import { OrderRequestEntity } from '@domain/order-request/domain/entities/order-request.entity';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { WhatsappUserRepository } from '../../domain-repositories/whatsapp-user/whatsapp-user.repository';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';
import { forwardRef, Inject } from '@nestjs/common';
import { UserRepository } from '../../domain-repositories/user/user.repository';
import { SMSCodeRecord } from '@domain/user/types';
import { UserEntity } from '@domain/user/domain/entities/user.entity';

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
    private readonly whatsappUserRepository: WhatsappUserRepository,
    @Inject(forwardRef(() => WhatsAppService))
    private readonly whatsAppService: WhatsAppService,
  ) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (userId) {
      client.join(userId);
      await this.cacheStorageService.setSocketId(userId, client.id);
    }

    console.log(userId, client.id)
    const clientSocketId = await this.cacheStorageService.getSocketClientId(userId);
    console.log(clientSocketId)
  }

  async handleDisconnect(client: Socket) {
    console.log('DISCONECTED', client.id)
    const userId = client.handshake.query.userId as string;
    console.log({ 'Disconnected': userId })
    if (userId) {
      client.leave(userId);
    }
  }

  @SubscribeMessage('updateLocation')
  async handleLocationUpdate(client: Socket, data: { driverId: string, latitude: number, longitude: number, orderId: string }) {
    const parsedData = JSON.parse(data.toString())
    const { driverId, latitude, longitude, orderId } = parsedData;
    await this.cacheStorageService.updateDriverLocation(driverId, latitude, longitude);

    if(orderId){
      const order = await this.orderRequestRepository.findOneById(orderId);
      const user = await this.whatsappUserRepository.findOneByPhone(order?.getPropsCopy().user_phone || '')

      if(user){
        const clientSocketId = await this.cacheStorageService.getSocketClientId(user.id.value);
        if (clientSocketId) {
          this.server.to(clientSocketId).emit('driverLocation', { lng: latitude, lat: longitude });
        }
      }
    }
  }

  async handleOrderCreated(order: OrderRequestEntity) {
    const lat = order.getPropsCopy().lat;
    const lng = order.getPropsCopy().lng;
    if (!lat || !lng) {
      throw new Error('Latitude and Longitude are required');
    }
    const nearestDrivers = await this.cacheStorageService.findNearestDrivers(lat, lng, 3000);
    nearestDrivers.forEach(driverId => {
      this.server.to(driverId).emit('nenewOwOrder', { order: order.getPropsCopy() });
    });
  }

  async emitEvent(clientSocketId: string, event: string, order: OrderRequestEntity, driver: UserEntity){
    this.server.to(clientSocketId).emit(event, { order: order.getPropsCopy(), status: order.getPropsCopy().orderstatus, driver: driver.getPropsCopy() });
  }

  // async emitEvent(clientSocketId: string, event: string, args: any){
  //   this.server.to(clientSocketId).emit(event, { order: order.getPropsCopy(), status: order.getPropsCopy().orderstatus, driver: driver.getPropsCopy() });
  // }


  // async handleOrderStatusUpdate(orderId: string, status: string) {
  //   const order = await this.orderRequestRepository.findOneById(orderId);
  //   if (order) {
  //     order.updateStatus(status);
  //     await this.orderRequestRepository.save(order);
  //     this.server.emit('orderStatusUpdated', { order: order.getPropsCopy(), status });
  //   }
  // }

  private getSMScode(phone: string): Promise<SMSCodeRecord | null> {
    return this.cacheStorageService.getValue(phone);
  }
}
