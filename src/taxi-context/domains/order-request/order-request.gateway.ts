import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OrderRequestRepository } from '../../domain-repositories/order-request/order-request.repository';
import { OrderRequestEntity } from '@domain/order-request/domain/entities/order-request.entity';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { WhatsappUserRepository } from '../../domain-repositories/whatsapp-user/whatsapp-user.repository';

@WebSocketGateway()
export class OrderRequestGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer() server: Server;

  constructor(
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly cacheStorageService: CloudCacheStorageService,
    private readonly whatsappUserRepository: WhatsappUserRepository,
  ) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      client.join(userId);
    }
    console.log(userId, client.id)
  }

  async handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      client.leave(userId);
    }
  }

  @SubscribeMessage('updateLocation')
  async handleLocationUpdate(client: Socket, data: { driverId: string, latitude: number, longitude: number }) {
    const { driverId, latitude, longitude } = data;
    await this.cacheStorageService.updateDriverLocation(driverId, latitude, longitude);
  }

  async handleOrderCreated(order: OrderRequestEntity) {
    const lat = order.getPropsCopy().lat;
    const lng = order.getPropsCopy().lng;
    if (!lat || !lng) {
      throw new Error('Latitude and Longitude are required');
    }
    const nearestDrivers = await this.cacheStorageService.findNearestDrivers(lat, lng, 3000);
    nearestDrivers.forEach(driverId => {
      this.server.to(driverId).emit('newOrder', { order: order.getPropsCopy() });
    });
  }

  @SubscribeMessage('acceptOrder')
  async handleOrderAcceptance(client: Socket, data: { driverId: string, orderId: string }) {
    const { driverId, orderId } = data;
    const order = await this.orderRequestRepository.findOneById(orderId);
    if (order) {
      order.accept(new UUID(driverId));
      await this.orderRequestRepository.save(order);
      this.server.to(driverId).emit('orderAccepted', { order: order.getPropsCopy(), driverId });

      const userPhone = order.getPropsCopy().user_phone;
      if (userPhone) {
        const user = await this.whatsappUserRepository.findOneByPhone(userPhone)
        if(!user){
          throw new Error("SOMETHING WENT WRONG")
        }
        const clientSocketId = await this.cacheStorageService.getValue<string>(user.id.value);
        if (clientSocketId) {
          this.server.to(clientSocketId).emit('orderAccepted', { order: order.getPropsCopy(), status: 'ACCEPTED' });
        }
      }
    }
  }

  @SubscribeMessage('driverArrived')
  async handleDriverArrived(client: Socket, data: { driverId: string, orderId: string }) {
    const { driverId, orderId } = data;
    const order = await this.orderRequestRepository.findOneById(orderId);
    if (order && order.getPropsCopy().driverId?.value == driverId) {
      order.driverArrived();
      await this.orderRequestRepository.save(order);

      const userPhone = order.getPropsCopy().user_phone;
      if (userPhone) {
        const user = await this.whatsappUserRepository.findOneByPhone(userPhone);
        if (!user) {
          throw new Error("SOMETHING WENT WRONG");
        }
        const clientSocketId = await this.cacheStorageService.getValue<string>(user.id.value);
        if (clientSocketId) {
          this.server.to(clientSocketId).emit('driverArrived', { order: order.getPropsCopy(), status: 'DRIVER_ARRIVED' });
        }
      }
    }
  }

  @SubscribeMessage('rideEnded')
  async handleRideEnded(client: Socket, data: { driverId: string, orderId: string }) {
    const { driverId, orderId } = data;
    const order = await this.orderRequestRepository.findOneById(orderId);
    if (order && order.getPropsCopy().driverId?.value == driverId) {
      order.rideEnded();
      await this.orderRequestRepository.save(order);

      const userPhone = order.getPropsCopy().user_phone;
      if (userPhone) {
        const user = await this.whatsappUserRepository.findOneByPhone(userPhone);
        if (!user) {
          throw new Error("SOMETHING WENT WRONG");
        }
        const clientSocketId = await this.cacheStorageService.getValue<string>(user.id.value);
        if (clientSocketId) {
          this.server.to(clientSocketId).emit('rideEnded', { order: order.getPropsCopy(), status: 'RIDE_ENDED' });
        }
      }
    }
  }


  // async handleOrderStatusUpdate(orderId: string, status: string) {
  //   const order = await this.orderRequestRepository.findOneById(orderId);
  //   if (order) {
  //     order.updateStatus(status);
  //     await this.orderRequestRepository.save(order);
  //     this.server.emit('orderStatusUpdated', { order: order.getPropsCopy(), status });
  //   }
  // }
}
