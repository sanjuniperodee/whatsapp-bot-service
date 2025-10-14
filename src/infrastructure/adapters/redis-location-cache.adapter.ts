import { Injectable } from '@nestjs/common';
import { LocationCachePort, LocationData } from '@domain/shared/ports/location-cache.port';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { Logger } from '@libs/ddd/domain/ports/logger.port';
import { Inject } from '@nestjs/common';

@Injectable()
export class RedisLocationCacheAdapter implements LocationCachePort {
  constructor(
    private readonly cacheStorageService: CloudCacheStorageService,
    @Inject('Logger') private readonly logger: Logger,
  ) {}

  async updateDriverLocation(driverId: string, lng: number, lat: number): Promise<void> {
    await this.cacheStorageService.updateDriverLocation(driverId, lng.toString(), lat.toString());
  }

  async getDriverLocation(driverId: string): Promise<LocationData | null> {
    const location = await this.cacheStorageService.getDriverLocation(driverId);
    if (location) {
      return {
        lng: location.longitude,
        lat: location.latitude,
        timestamp: Date.now()
      };
    }
    return null;
  }

  async findNearestDrivers(lat: number, lng: number, radius: number = 5): Promise<string[]> {
    return await this.cacheStorageService.findNearestDrivers(lat, lng, radius);
  }

  async setDriverOnline(driverId: string): Promise<void> {
    await this.cacheStorageService.setDriverOnline(driverId);
  }

  async setDriverOffline(driverId: string): Promise<void> {
    await this.cacheStorageService.setDriverOffline(driverId);
  }

  async isDriverOnline(driverId: string): Promise<boolean> {
    return await this.cacheStorageService.isDriverOnline(driverId);
  }

  async getOnlineDrivers(): Promise<string[]> {
    return await this.cacheStorageService.getOnlineDrivers();
  }

  async getOnlineClients(): Promise<string[]> {
    return await this.cacheStorageService.getOnlineClients();
  }

  async setUserSocket(userId: string, socketId: string): Promise<void> {
    await this.cacheStorageService.setUserSocket(userId, socketId);
  }

  async getUserSocket(userId: string): Promise<string | null> {
    return await this.cacheStorageService.getUserSocket(userId);
  }

  async removeUserSocket(userId: string): Promise<void> {
    await this.cacheStorageService.removeUserSocket(userId);
  }

  async setSocketUser(socketId: string, userId: string): Promise<void> {
    await this.cacheStorageService.setSocketUser(socketId, userId);
  }

  async getSocketUser(socketId: string): Promise<string | null> {
    return await this.cacheStorageService.getSocketUser(socketId);
  }

  async removeSocketUser(socketId: string): Promise<void> {
    await this.cacheStorageService.removeSocketUser(socketId);
  }

  async setSocketClientId(orderId: string, socketId: string): Promise<void> {
    await this.cacheStorageService.setSocketClientId(orderId, socketId);
  }

  async getSocketClientId(orderId: string): Promise<string | null> {
    return await this.cacheStorageService.getSocketClientId(orderId);
  }

  async isSocketActive(socketId: string): Promise<boolean> {
    return await this.cacheStorageService.isSocketActive(socketId);
  }

  async getAllUsersWithSockets(): Promise<string[]> {
    return await this.cacheStorageService.getAllUsersWithSockets();
  }

  async cleanupExpiredOrders(): Promise<void> {
    await this.cacheStorageService.cleanupExpiredOrders();
  }

  async cleanupOldLocations(): Promise<void> {
    await this.cacheStorageService.cleanupOldLocations();
  }
}
