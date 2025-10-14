import { Injectable } from '@nestjs/common';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { Logger } from '@libs/ddd/domain/ports/logger.port';
import { Inject } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class LocationTrackingService {
  constructor(
    private readonly cacheStorageService: CloudCacheStorageService,
    @Inject('Logger') private readonly logger: Logger,
  ) {}

  async handleDriverLocationUpdate(
    driverId: string, 
    lng: number, 
    lat: number, 
    orderId?: string,
    server?: Server
  ): Promise<void> {
    try {
      // Обновляем геолокацию водителя в кеше
      await this.cacheStorageService.updateDriverLocation(driverId, lng.toString(), lat.toString());
      
      if (orderId) {
        // Если есть активный заказ, уведомляем клиента
        const clientSocketId = await this.cacheStorageService.getSocketClientId(orderId);
        if (clientSocketId && server) {
          server.to(clientSocketId).emit('driverLocationUpdate', {
            driverId,
            lng,
            lat,
            orderId,
            timestamp: Date.now()
          });
          this.logger.debug(`Driver location update sent to client for order ${orderId}`);
        }
      }

      this.logger.debug(`Driver ${driverId} location updated: ${lat}, ${lng}`);
    } catch (error) {
      this.logger.error(`Failed to handle driver location update for ${driverId}:`, error);
    }
  }

  async broadcastDriversLocationToClients(server?: Server): Promise<void> {
    try {
      if (!server) {
        this.logger.warn('Server not available for location broadcast');
        return;
      }

      // Получаем всех онлайн водителей с их геолокацией
      const onlineDrivers = await this.cacheStorageService.getOnlineDrivers();
      
      for (const driverId of onlineDrivers) {
        const location = await this.cacheStorageService.getDriverLocation(driverId);
        if (location) {
          const socketId = await this.cacheStorageService.getUserSocket(driverId);
          if (socketId) {
            server.to(socketId).emit('driversLocationUpdate', {
              driverId,
              location,
              timestamp: Date.now()
            });
          }
        }
      }

      this.logger.debug(`Drivers location broadcast sent to ${onlineDrivers.length} drivers`);
    } catch (error) {
      this.logger.error(`Failed to broadcast drivers location:`, error);
    }
  }

  async getDriverLocation(driverId: string): Promise<{ lng: number; lat: number } | null> {
    try {
      const location = await this.cacheStorageService.getDriverLocation(driverId);
      if (location) {
        return {
          lng: location.longitude,
          lat: location.latitude
        };
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get driver location for ${driverId}:`, error);
      return null;
    }
  }

  async getNearbyDrivers(lat: number, lng: number, radius: number = 5): Promise<string[]> {
    try {
      return await this.cacheStorageService.findNearestDrivers(lat, lng, radius);
    } catch (error) {
      this.logger.error(`Failed to get nearby drivers:`, error);
      return [];
    }
  }
}
