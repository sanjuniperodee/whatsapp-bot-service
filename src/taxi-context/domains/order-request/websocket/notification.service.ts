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
      console.log(`🔍 [NOTIFICATION] Пытаемся уведомить клиента ${clientId} событием ${event}`);
      
      const socketIds = await this.cacheStorageService.getSocketIds(clientId);
      console.log(`🔍 [NOTIFICATION] Socket IDs для клиента ${clientId}:`, socketIds);
      console.log(`🔍 [NOTIFICATION] Server доступен:`, !!server);
      
      if (socketIds && socketIds.length > 0 && server) {
        console.log(`📤 [NOTIFICATION] Отправляем событие ${event} на ${socketIds.length} сокетов`);
        
        let successCount = 0;
        const inactiveSockets = [];
        
        for (const socketId of socketIds) {
          try {
            const socket = server.sockets.sockets.get(socketId);
            if (socket && socket.connected) {
              socket.emit(event, data);
              successCount++;
            } else {
              console.log(`⚠️ [NOTIFICATION] Сокет ${socketId} клиента ${clientId} неактивен, удаляем из Redis`);
              inactiveSockets.push(socketId);
            }
          } catch (error) {
            console.error(`❌ [NOTIFICATION] Ошибка отправки на сокет ${socketId}:`, error);
            inactiveSockets.push(socketId);
          }
        }
        
        // Удаляем неактивные сокеты из Redis
        for (const socketId of inactiveSockets) {
          try {
            await this.cacheStorageService.removeSocketId(clientId, socketId);
            console.log(`🧹 [NOTIFICATION] Удален неактивный сокет ${socketId} клиента ${clientId} из Redis`);
          } catch (error) {
            console.error(`❌ [NOTIFICATION] Ошибка удаления сокета ${socketId} из Redis:`, error);
          }
        }
        
        this.logger.debug(`Notification sent to client ${clientId}: ${event} on ${successCount}/${socketIds.length} sockets`);
        console.log(`✅ [NOTIFICATION] Уведомление отправлено на ${successCount}/${socketIds.length} сокетов`);
      } else {
        console.log(`❌ [NOTIFICATION] Клиент ${clientId} не найден или сервер недоступен`);
        this.logger.warn(`Client ${clientId} not found or server not available`);
      }
    } catch (error) {
      console.error(`❌ [NOTIFICATION] Ошибка при уведомлении клиента ${clientId}:`, error);
      this.logger.error(`Failed to notify client ${clientId}:`, error);
    }
  }

  async notifyDriver(driverId: string, event: string, data: any, server?: Server): Promise<void> {
    try {
      console.log(`🔍 [NOTIFICATION] Пытаемся уведомить водителя ${driverId} событием ${event}`);
      
      const socketIds = await this.cacheStorageService.getSocketIds(driverId);
      console.log(`🔍 [NOTIFICATION] Socket IDs для водителя ${driverId}:`, socketIds);
      
      if (socketIds && socketIds.length > 0 && server) {
        console.log(`📤 [NOTIFICATION] Отправляем событие ${event} на ${socketIds.length} сокетов`);
        
        let successCount = 0;
        const inactiveSockets = [];
        
        for (const socketId of socketIds) {
          try {
            const socket = server.sockets.sockets.get(socketId);
            if (socket && socket.connected) {
              socket.emit(event, data);
              successCount++;
            } else {
              console.log(`⚠️ [NOTIFICATION] Сокет ${socketId} водителя ${driverId} неактивен, удаляем из Redis`);
              inactiveSockets.push(socketId);
            }
          } catch (error) {
            console.error(`❌ [NOTIFICATION] Ошибка отправки на сокет ${socketId}:`, error);
            inactiveSockets.push(socketId);
          }
        }
        
        // Удаляем неактивные сокеты из Redis
        for (const socketId of inactiveSockets) {
          try {
            await this.cacheStorageService.removeSocketId(driverId, socketId);
            console.log(`🧹 [NOTIFICATION] Удален неактивный сокет ${socketId} водителя ${driverId} из Redis`);
          } catch (error) {
            console.error(`❌ [NOTIFICATION] Ошибка удаления сокета ${socketId} из Redis:`, error);
          }
        }
        
        // Если у водителя не осталось активных сокетов, убираем его из онлайн
        if (successCount === 0 && socketIds.length > 0) {
          const hasActiveSockets = await this.cacheStorageService.hasActiveSockets(driverId);
          if (!hasActiveSockets) {
            await this.cacheStorageService.setDriverOffline(driverId);
            console.log(`🔴 [NOTIFICATION] Водитель ${driverId} убран из онлайн (нет активных сокетов)`);
          }
        }
        
        this.logger.debug(`Notification sent to driver ${driverId}: ${event} on ${successCount}/${socketIds.length} sockets`);
        console.log(`✅ [NOTIFICATION] Уведомление отправлено на ${successCount}/${socketIds.length} сокетов`);
      } else {
        console.log(`❌ [NOTIFICATION] Водитель ${driverId} не найден или сервер недоступен`);
        this.logger.warn(`Driver ${driverId} not found or server not available`);
      }
    } catch (error) {
      console.error(`❌ [NOTIFICATION] Ошибка при уведомлении водителя ${driverId}:`, error);
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
      console.log(`📢 [BROADCAST] Рассылаем событие ${event} ${onlineDrivers.length} онлайн водителям`);
      
      let totalSockets = 0;
      let activeSockets = 0;
      
      for (const driverId of onlineDrivers) {
        const socketIds = await this.cacheStorageService.getSocketIds(driverId);
        totalSockets += socketIds.length;
        
        for (const socketId of socketIds) {
          try {
            const socket = server.sockets.sockets.get(socketId);
            if (socket && socket.connected) {
              socket.emit(event, data);
              activeSockets++;
            } else {
              // Удаляем неактивный сокет
              await this.cacheStorageService.removeSocketId(driverId, socketId);
            }
          } catch (error) {
            console.error(`❌ [BROADCAST] Ошибка отправки на сокет ${socketId}:`, error);
            await this.cacheStorageService.removeSocketId(driverId, socketId);
          }
        }
      }

      this.logger.debug(`Broadcast sent to ${activeSockets}/${totalSockets} sockets of ${onlineDrivers.length} online drivers: ${event}`);
      console.log(`📢 [BROADCAST] Рассылка завершена: ${activeSockets}/${totalSockets} сокетов`);
    } catch (error) {
      console.error(`❌ [BROADCAST] Ошибка при рассылке водителям:`, error);
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
      console.log(`📢 [BROADCAST] Рассылаем событие ${event} ${onlineClients.length} онлайн клиентам`);
      
      let totalSockets = 0;
      let activeSockets = 0;
      
      for (const clientId of onlineClients) {
        const socketIds = await this.cacheStorageService.getSocketIds(clientId);
        totalSockets += socketIds.length;
        
        for (const socketId of socketIds) {
          try {
            const socket = server.sockets.sockets.get(socketId);
            if (socket && socket.connected) {
              socket.emit(event, data);
              activeSockets++;
            } else {
              // Удаляем неактивный сокет
              await this.cacheStorageService.removeSocketId(clientId, socketId);
            }
          } catch (error) {
            console.error(`❌ [BROADCAST] Ошибка отправки на сокет ${socketId}:`, error);
            await this.cacheStorageService.removeSocketId(clientId, socketId);
          }
        }
      }

      this.logger.debug(`Broadcast sent to ${activeSockets}/${totalSockets} sockets of ${onlineClients.length} online clients: ${event}`);
      console.log(`📢 [BROADCAST] Рассылка завершена: ${activeSockets}/${totalSockets} сокетов`);
    } catch (error) {
      console.error(`❌ [BROADCAST] Ошибка при рассылке клиентам:`, error);
      this.logger.error(`Failed to broadcast to online clients:`, error);
    }
  }
}
