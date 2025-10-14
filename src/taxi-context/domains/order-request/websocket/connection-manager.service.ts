import { Injectable } from '@nestjs/common';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { Logger } from '@libs/ddd/domain/ports/logger.port';
import { Inject } from '@nestjs/common';

@Injectable()
export class ConnectionManagerService {
  constructor(
    private readonly cacheStorageService: CloudCacheStorageService,
    @Inject('Logger') private readonly logger: Logger,
  ) {}

  async handleConnection(socketId: string, userId: string, userType: 'client' | 'driver'): Promise<void> {
    try {
      // TODO: Добавить методы в CloudCacheStorageService
      await this.cacheStorageService.setSocketUser(socketId, userId);
      await this.cacheStorageService.setUserSocket(userId, socketId);
      
      if (userType === 'driver') {
        await this.cacheStorageService.setDriverOnline(userId);
        this.logger.debug(`Driver ${userId} connected with socket ${socketId}`);
      } else {
        this.logger.debug(`Client ${userId} connected with socket ${socketId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle connection for user ${userId}:`, error);
      throw error;
    }
  }

  async handleDisconnection(socketId: string): Promise<void> {
    try {
      // TODO: Добавить методы в CloudCacheStorageService
      const userId = await this.cacheStorageService.getSocketUser(socketId);
      if (userId) {
        await this.cacheStorageService.setDriverOffline(userId);
        await this.cacheStorageService.removeUserSocket(userId);
        await this.cacheStorageService.removeSocketUser(socketId);
        this.logger.debug(`User ${userId} disconnected from socket ${socketId}`);
      }
      this.logger.debug(`Socket ${socketId} disconnected`);
    } catch (error) {
      this.logger.error(`Failed to handle disconnection for socket ${socketId}:`, error);
    }
  }

  async handleReconnect(socketId: string, userId: string, userType: 'client' | 'driver'): Promise<void> {
    try {
      // TODO: Добавить методы в CloudCacheStorageService
      const oldSocketId = await this.cacheStorageService.getUserSocket(userId);
      if (oldSocketId && oldSocketId !== socketId) {
        await this.cacheStorageService.removeSocketUser(oldSocketId);
      }

      // Устанавливаем новое подключение
      await this.handleConnection(socketId, userId, userType);
      this.logger.debug(`User ${userId} reconnected with socket ${socketId}`);
    } catch (error) {
      this.logger.error(`Failed to handle reconnect for user ${userId}:`, error);
      throw error;
    }
  }

  async isUserOnline(userId: string): Promise<boolean> {
    try {
      // TODO: Добавить методы в CloudCacheStorageService
      const socketId = await this.cacheStorageService.getUserSocket(userId);
      return !!socketId;
    } catch (error) {
      this.logger.error(`Failed to check online status for user ${userId}:`, error);
      return false;
    }
  }

  async getUserSocket(userId: string): Promise<string | null> {
    try {
      // TODO: Добавить методы в CloudCacheStorageService
      return await this.cacheStorageService.getUserSocket(userId);
    } catch (error) {
      this.logger.error(`Failed to get socket for user ${userId}:`, error);
      return null;
    }
  }
}
