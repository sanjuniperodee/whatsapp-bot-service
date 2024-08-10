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
  async handleLocationUpdate(client: Socket, data: { driverId: string, latitude: number, longitude: number }) {
    const { driverId, latitude, longitude } = data;
    console.log(data)
    await this.cacheStorageService.updateDriverLocation(driverId, 55, 55);
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
    const parsedData = JSON.parse(data.toString())
    const { driverId, orderId } = parsedData;
    const order = await this.orderRequestRepository.findOneById(orderId);

    if (order) {
      order.accept(new UUID(driverId));
      await this.orderRequestRepository.save(order);

      const driver = await this.userRepository.findOneById(driverId)

      const userPhone = order.getPropsCopy().user_phone;
      console.log(userPhone)
      if (userPhone) {
        const user = await this.whatsappUserRepository.findOneByPhone(userPhone)
        console.log(user)
        if(!user){
          throw new Error("SOMETHING WENT WRONG")
        }
        await this.whatsAppService.sendMessage(userPhone + "@c.us", 'Водитель принял ваш заказ, приедет золотой кабан')

        const clientSocketId = await this.cacheStorageService.getSocketClientId(user.id.value);
        console.log(clientSocketId)
        if (clientSocketId) {
          this.server.to(clientSocketId).emit('orderAccepted', { order: order.getPropsCopy(), status: 'ACCEPTED', driver: driver?.getPropsCopy() });
        }
      }
    }
  }

  @SubscribeMessage('driverArrived')
  async handleDriverArrived(client: Socket, data: { driverId: string, orderId: string }) {
    const parsedData = JSON.parse(data.toString())
    const { driverId, orderId } = parsedData;
    const order = await this.orderRequestRepository.findOneById(orderId);

    if (order && order.getPropsCopy().driverId?.value == driverId) {
      order.driverArrived();
      await this.orderRequestRepository.save(order);

      const driver = await this.userRepository.findOneById(driverId)

      const userPhone = order.getPropsCopy().user_phone;
      if (userPhone) {
        const user = await this.whatsappUserRepository.findOneByPhone(userPhone);
        if (!user) {
          throw new Error("SOMETHING WENT WRONG");
        }

        await this.whatsAppService.sendMessage(userPhone + "@c.us", 'Водитель приехал, вас ожидает золотой кабан')

        const clientSocketId = await this.cacheStorageService.getSocketClientId(user.id.value);
        if (clientSocketId) {
          this.server.to(clientSocketId).emit('driverArrived', { order: order.getPropsCopy(), status: 'DRIVER_ARRIVED', driver: driver?.getPropsCopy() });
        }
      }
    }
  }

  @SubscribeMessage('rideEnded')
  async handleRideEnded(client: Socket, data: { driverId: string, orderId: string }) {
    const parsedData = JSON.parse(data.toString())
    const { driverId, orderId } = parsedData;
    const order = await this.orderRequestRepository.findOneById(orderId);

    if (order && order.getPropsCopy().driverId?.value == driverId) {
      order.rideEnded();
      await this.orderRequestRepository.save(order);

      const driver = await this.userRepository.findOneById(driverId)

      const userPhone = order.getPropsCopy().user_phone;
      if (userPhone) {
        const user = await this.whatsappUserRepository.findOneByPhone(userPhone);
        if (!user) {
          throw new Error("SOMETHING WENT WRONG");
        }

        await this.whatsAppService.sendMessage(userPhone + "@c.us", 'Заказ завершен, оцените пожалуйста поездку')

        const clientSocketId = await this.cacheStorageService.getSocketClientId(user.id.value);
        if (clientSocketId) {
          this.server.to(clientSocketId).emit('rideEnded', { order: order.getPropsCopy(), status: 'RIDE_ENDED', driver: driver });
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
