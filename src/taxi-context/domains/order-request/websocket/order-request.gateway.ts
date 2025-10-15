import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@libs/ddd/domain/ports/logger.port';
import { Inject } from '@nestjs/common';
import { ConnectionManagerService } from './connection-manager.service';
import { NotificationService } from './notification.service';
import { LocationTrackingService } from './location-tracking.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class OrderRequestGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly connectionManager: ConnectionManagerService,
    private readonly notificationService: NotificationService,
    private readonly locationTracking: LocationTrackingService,
    @Inject('Logger') private readonly logger: Logger,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
    await this.connectionManager.handleDisconnection(client.id);
  }

  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; userType: 'client' | 'driver' },
  ) {
    try {
      const { userId, userType } = data;
      await this.connectionManager.handleConnection(client.id, userId, userType);
      
      client.emit('joined', { success: true, userId, userType });
      this.logger.debug(`User ${userId} joined as ${userType}`);
    } catch (error) {
      this.logger.error(`Failed to handle join for client ${client.id}:`, error);
      client.emit('error', { message: 'Failed to join' });
    }
  }

  @SubscribeMessage('updateLocation')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lng: number; lat: number; orderId?: string },
  ) {
    try {
      const { lng, lat, orderId } = data;
      const userId = await this.connectionManager.getUserSocket(client.id);
      
      if (userId) {
        await this.locationTracking.handleDriverLocationUpdate(userId, lng, lat, orderId, this.server);
        client.emit('locationUpdated', { success: true });
      }
    } catch (error) {
      this.logger.error(`Failed to handle location update for client ${client.id}:`, error);
      client.emit('error', { message: 'Failed to update location' });
    }
  }

  // Методы для уведомлений (используются event handlers)
  async notifyClient(clientId: string, event: string, data: any): Promise<void> {
    await this.notificationService.notifyClient(clientId, event, data, this.server);
  }

  async notifyDriver(driverId: string, event: string, data: any): Promise<void> {
    await this.notificationService.notifyDriver(driverId, event, data, this.server);
  }

  async broadcastToOnlineDrivers(event: string, data: any): Promise<void> {
    await this.notificationService.broadcastToOnlineDrivers(event, data, this.server);
  }

  async broadcastToOnlineClients(event: string, data: any): Promise<void> {
    await this.notificationService.broadcastToOnlineClients(event, data, this.server);
  }

  // Методы для совместимости с существующим кодом
  async handleOrderCreated(orderRequest: any): Promise<void> {
    // Этот метод будет вызываться из event handlers
    await this.broadcastToOnlineDrivers('newOrder', {
      id: orderRequest.id.value,
      from: orderRequest.address.from,
      to: orderRequest.address.to,
      price: orderRequest.price.value,
      orderType: orderRequest.getPropsCopy().orderType,
      clientId: orderRequest.getPropsCopy().clientId.value,
      lat: orderRequest.location?.latitude || 0,
      lng: orderRequest.location?.longitude || 0,
      timestamp: Date.now()
    });
  }

  async handleOrderAccepted(orderRequest: any, driver: any): Promise<void> {
    await this.notifyClient(orderRequest.getPropsCopy().clientId.value, 'orderAccepted', {
      orderId: orderRequest.id.value,
      driverId: orderRequest.getPropsCopy().driverId?.value,
      driver: driver.getPropsCopy(),
      timestamp: Date.now()
    });

    await this.broadcastToOnlineDrivers('orderTaken', {
      orderId: orderRequest.id.value,
      takenBy: orderRequest.getPropsCopy().driverId?.value,
      timestamp: Date.now()
    });
  }

  async handleDriverArrived(orderRequest: any, driver: any): Promise<void> {
    await this.notifyClient(orderRequest.getPropsCopy().clientId.value, 'driverArrived', {
      orderId: orderRequest.id.value,
      driverId: orderRequest.getPropsCopy().driverId?.value,
      driver: driver.getPropsCopy(),
      message: 'Водитель прибыл и ждет вас',
      timestamp: Date.now()
    });
  }

  async handleRideStarted(orderRequest: any, driver: any): Promise<void> {
    await this.notifyClient(orderRequest.getPropsCopy().clientId.value, 'rideStarted', {
      orderId: orderRequest.id.value,
      driverId: orderRequest.getPropsCopy().driverId?.value,
      driver: driver.getPropsCopy(),
      message: 'Поездка началась',
      timestamp: Date.now()
    });
  }

  async handleRideEnded(orderRequest: any, driver: any): Promise<void> {
    await this.notifyClient(orderRequest.getPropsCopy().clientId.value, 'rideEnded', {
      orderId: orderRequest.id.value,
      driverId: orderRequest.getPropsCopy().driverId?.value,
      driver: driver.getPropsCopy(),
      price: orderRequest.price.value,
      message: 'Поездка завершена',
      timestamp: Date.now()
    });
  }

  async handleOrderCancelledByClient(orderRequest: any, reason?: string): Promise<void> {
    await this.broadcastToOnlineDrivers('orderDeleted', {
      orderId: orderRequest.id.value,
      reason: reason || 'cancelled',
      timestamp: Date.now()
    });
  }

  async handleOrderCancelledByDriver(orderRequest: any, driver: any, reason?: string): Promise<void> {
    await this.notifyClient(orderRequest.getPropsCopy().clientId.value, 'orderCancelled', {
      orderId: orderRequest.id.value,
      driver: driver.getPropsCopy(),
      reason: reason || 'cancelled by driver',
      timestamp: Date.now()
    });
  }
}
