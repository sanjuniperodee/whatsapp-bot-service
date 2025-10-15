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
import { OrderRequestRepository } from '../../../domain-repositories/order-request/order-request.repository';
import { UserRepository } from '../../../domain-repositories/user/user.repository';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { OrderRequestEntity } from '@domain/order-request/domain/entities/order-request.entity';
import { UserEntity } from '@domain/user/domain/entities/user.entity';
import { OrderType } from '@infrastructure/enums';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { NotificationService as FirebaseNotificationService } from '@modules/firebase/notification.service';

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
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly connectionManager: ConnectionManagerService,
    private readonly notificationService: NotificationService,
    private readonly locationTracking: LocationTrackingService,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly userRepository: UserRepository,
    private readonly cacheStorageService: CloudCacheStorageService,
    private readonly firebaseNotificationService: FirebaseNotificationService,
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
      const userId = await this.connectionManager.getSocketUser(client.id);
      
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
}
