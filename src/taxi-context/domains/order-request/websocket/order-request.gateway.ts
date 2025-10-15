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

}
