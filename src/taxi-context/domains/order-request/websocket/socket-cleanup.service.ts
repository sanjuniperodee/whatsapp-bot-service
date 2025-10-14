import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { Logger } from '@libs/ddd/domain/ports/logger.port';
import { Inject } from '@nestjs/common';

@Injectable()
export class SocketCleanupService {
  constructor(
    private readonly cacheStorageService: CloudCacheStorageService,
    @Inject('Logger') private readonly logger: Logger,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupInactiveSockets(): Promise<void> {
    try {
      this.logger.debug('Starting cleanup of inactive sockets...');
      
      // Получаем всех пользователей с активными сокетами
      const allUsers = await this.cacheStorageService.getAllUsersWithSockets();
      
      let cleanedCount = 0;
      for (const userId of allUsers) {
        const socketId = await this.cacheStorageService.getUserSocket(userId);
        if (socketId) {
          // Проверяем активность сокета
          const isActive = await this.cacheStorageService.isSocketActive(socketId);
          if (!isActive) {
            await this.cacheStorageService.setDriverOffline(userId);
            await this.cacheStorageService.removeUserSocket(userId);
            await this.cacheStorageService.removeSocketUser(socketId);
            cleanedCount++;
            this.logger.debug(`Cleaned up inactive socket for user ${userId}`);
          }
        }
      }

      this.logger.debug(`Socket cleanup completed. Cleaned ${cleanedCount} inactive sockets.`);
    } catch (error) {
      this.logger.error('Failed to cleanup inactive sockets:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredData(): Promise<void> {
    try {
      this.logger.debug('Starting cleanup of expired data...');
      
      // Очищаем истекшие данные о заказах
      await this.cacheStorageService.cleanupExpiredOrders();
      
      // Очищаем старые геолокации
      await this.cacheStorageService.cleanupOldLocations();
      
      this.logger.debug('Expired data cleanup completed.');
    } catch (error) {
      this.logger.error('Failed to cleanup expired data:', error);
    }
  }

  async forceCleanupUser(userId: string): Promise<void> {
    try {
      const socketId = await this.cacheStorageService.getUserSocket(userId);
      if (socketId) {
        await this.cacheStorageService.setDriverOffline(userId);
        await this.cacheStorageService.removeUserSocket(userId);
        await this.cacheStorageService.removeSocketUser(socketId);
        this.logger.debug(`Force cleaned up user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to force cleanup user ${userId}:`, error);
    }
  }
}
