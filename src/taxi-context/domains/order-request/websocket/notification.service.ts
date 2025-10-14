import { Injectable } from '@nestjs/common';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { Logger } from '@libs/ddd/domain/ports/logger.port';
import { Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@Injectable()
export class NotificationService {
  constructor(
    private readonly cacheStorageService: CloudCacheStorageService,
    @Inject('Logger') private readonly logger: Logger,
  ) {}

  async notifyClient(clientId: string, event: string, data: any, server?: Server): Promise<void> {
    try {
      const socketId = await this.cacheStorageService.getUserSocket(clientId);
      if (socketId && server) {
        server.to(socketId).emit(event, data);
        this.logger.debug(`Notification sent to client ${clientId}: ${event}`);
      } else {
        this.logger.warn(`Client ${clientId} not found or server not available`);
      }
    } catch (error) {
      this.logger.error(`Failed to notify client ${clientId}:`, error);
    }
  }

  async notifyDriver(driverId: string, event: string, data: any, server?: Server): Promise<void> {
    try {
      const socketId = await this.cacheStorageService.getUserSocket(driverId);
      if (socketId && server) {
        server.to(socketId).emit(event, data);
        this.logger.debug(`Notification sent to driver ${driverId}: ${event}`);
      } else {
        this.logger.warn(`Driver ${driverId} not found or server not available`);
      }
    } catch (error) {
      this.logger.error(`Failed to notify driver ${driverId}:`, error);
    }
  }

  async broadcastToOnlineDrivers(event: string, data: any, server?: Server): Promise<void> {
    try {
      if (!server) {
        this.logger.warn('Server not available for broadcast');
        return;
      }

      // Получаем всех онлайн водителей
      const onlineDrivers = await this.cacheStorageService.getOnlineDrivers();
      
      for (const driverId of onlineDrivers) {
        const socketId = await this.cacheStorageService.getUserSocket(driverId);
        if (socketId) {
          server.to(socketId).emit(event, data);
        }
      }

      this.logger.debug(`Broadcast sent to ${onlineDrivers.length} online drivers: ${event}`);
    } catch (error) {
      this.logger.error(`Failed to broadcast to online drivers:`, error);
    }
  }

  async broadcastToOnlineClients(event: string, data: any, server?: Server): Promise<void> {
    try {
      if (!server) {
        this.logger.warn('Server not available for broadcast');
        return;
      }

      // Получаем всех онлайн клиентов
      const onlineClients = await this.cacheStorageService.getOnlineClients();
      
      for (const clientId of onlineClients) {
        const socketId = await this.cacheStorageService.getUserSocket(clientId);
        if (socketId) {
          server.to(socketId).emit(event, data);
        }
      }

      this.logger.debug(`Broadcast sent to ${onlineClients.length} online clients: ${event}`);
    } catch (error) {
      this.logger.error(`Failed to broadcast to online clients:`, error);
    }
  }
}
