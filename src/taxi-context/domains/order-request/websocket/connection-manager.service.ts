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
      console.log(`🔍 [CONNECTION] Обрабатываем подключение: socketId=${socketId}, userId=${userId}, userType=${userType}`);
      
      // Устанавливаем связь socketId -> userId
      await this.cacheStorageService.setSocketUser(socketId, userId);
      console.log(`✅ [CONNECTION] Установлена связь socketId -> userId`);
      
      // Добавляем сокет к пользователю (поддержка множественных сокетов)
      await this.cacheStorageService.addSocketId(userId, socketId);
      console.log(`✅ [CONNECTION] Socket ${socketId} добавлен к пользователю ${userId}`);
      
      if (userType === 'driver') {
        await this.cacheStorageService.setDriverOnline(userId);
        console.log(`✅ [CONNECTION] Водитель ${userId} добавлен в онлайн`);
        this.logger.debug(`Driver ${userId} connected with socket ${socketId}`);
      } else {
        await this.cacheStorageService.addOnlineClient(userId);
        console.log(`✅ [CONNECTION] Клиент ${userId} добавлен в онлайн`);
        this.logger.debug(`Client ${userId} connected with socket ${socketId}`);
      }
      
      console.log(`🎉 [CONNECTION] Подключение обработано успешно`);
    } catch (error) {
      console.error(`❌ [CONNECTION] Ошибка при обработке подключения:`, error);
      this.logger.error(`Failed to handle connection for user ${userId}:`, error);
      throw error;
    }
  }

  async handleDisconnection(socketId: string): Promise<void> {
    try {
      console.log(`🔍 [DISCONNECTION] Обрабатываем отключение сокета: ${socketId}`);
      
      const userId = await this.cacheStorageService.getSocketUser(socketId);
      if (userId) {
        console.log(`🔍 [DISCONNECTION] Найден пользователь ${userId} для сокета ${socketId}`);
        
        // Удаляем конкретный сокет из множества сокетов пользователя
        await this.cacheStorageService.removeSocketId(userId, socketId);
        console.log(`✅ [DISCONNECTION] Socket ${socketId} удален из множества сокетов пользователя ${userId}`);
        
        // Удаляем связь socketId -> userId
        await this.cacheStorageService.removeSocketUser(socketId);
        console.log(`✅ [DISCONNECTION] Связь socketId -> userId удалена`);
        
        // Проверяем, остались ли активные сокеты у пользователя
        const hasActiveSockets = await this.cacheStorageService.hasActiveSockets(userId);
        console.log(`🔍 [DISCONNECTION] У пользователя ${userId} остались активные сокеты: ${hasActiveSockets}`);
        
        if (!hasActiveSockets) {
          // Если нет активных сокетов, убираем пользователя из онлайн
          const isDriver = await this.cacheStorageService.isDriverOnline(userId);
          const isClient = await this.cacheStorageService.isClientOnline(userId);
          
          if (isDriver) {
            await this.cacheStorageService.setDriverOffline(userId);
            console.log(`🔴 [DISCONNECTION] Водитель ${userId} убран из онлайн (нет активных сокетов)`);
          }
          if (isClient) {
            await this.cacheStorageService.removeOnlineClient(userId);
            console.log(`🔴 [DISCONNECTION] Клиент ${userId} убран из онлайн (нет активных сокетов)`);
          }
        }
        
        this.logger.debug(`User ${userId} disconnected from socket ${socketId}`);
        console.log(`✅ [DISCONNECTION] Отключение обработано успешно`);
      } else {
        console.log(`⚠️ [DISCONNECTION] Пользователь не найден для сокета ${socketId}`);
      }
      
      this.logger.debug(`Socket ${socketId} disconnected`);
    } catch (error) {
      console.error(`❌ [DISCONNECTION] Ошибка при обработке отключения:`, error);
      this.logger.error(`Failed to handle disconnection for socket ${socketId}:`, error);
    }
  }

  async handleReconnect(socketId: string, userId: string, userType: 'client' | 'driver'): Promise<void> {
    try {
      console.log(`🔍 [RECONNECT] Обрабатываем переподключение: socketId=${socketId}, userId=${userId}, userType=${userType}`);
      
      // Устанавливаем новое подключение (добавляет новый сокет к существующим)
      await this.handleConnection(socketId, userId, userType);
      
      this.logger.debug(`User ${userId} reconnected with socket ${socketId}`);
      console.log(`✅ [RECONNECT] Переподключение обработано успешно`);
    } catch (error) {
      console.error(`❌ [RECONNECT] Ошибка при обработке переподключения:`, error);
      this.logger.error(`Failed to handle reconnect for user ${userId}:`, error);
      throw error;
    }
  }

  async isUserOnline(userId: string): Promise<boolean> {
    try {
      const hasActiveSockets = await this.cacheStorageService.hasActiveSockets(userId);
      return hasActiveSockets;
    } catch (error) {
      this.logger.error(`Failed to check online status for user ${userId}:`, error);
      return false;
    }
  }

  async getUserSockets(userId: string): Promise<string[]> {
    try {
      return await this.cacheStorageService.getSocketIds(userId);
    } catch (error) {
      this.logger.error(`Failed to get sockets for user ${userId}:`, error);
      return [];
    }
  }

  async getSocketUser(socketId: string): Promise<string | null> {
    try {
      return await this.cacheStorageService.getSocketUser(socketId);
    } catch (error) {
      this.logger.error(`Failed to get user for socket ${socketId}:`, error);
      return null;
    }
  }
}
