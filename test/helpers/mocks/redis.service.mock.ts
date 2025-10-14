import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/cloud-cache-storage.service';

export class MockRedisService implements Partial<CloudCacheStorageService> {
  private cache = new Map<string, any>();
  private socketIds = new Map<string, string[]>();

  public updateOrderLocation = jest.fn().mockImplementation(async (orderId: string, lat: number, lng: number, orderType: string) => {
    this.cache.set(`order:${orderId}`, { lat, lng, orderType });
  });

  public updateDriverLocation = jest.fn().mockImplementation(async (driverId: string, lat: string, lng: string) => {
    this.cache.set(`driver:${driverId}`, { lat, lng });
  });

  public getSocketIds = jest.fn().mockImplementation(async (userId: string) => {
    return this.socketIds.get(userId) || [];
  });

  public addSocketId = jest.fn().mockImplementation(async (userId: string, socketId: string) => {
    const existing = this.socketIds.get(userId) || [];
    existing.push(socketId);
    this.socketIds.set(userId, existing);
  });

  public removeSocketId = jest.fn().mockImplementation(async (userId: string, socketId: string) => {
    const existing = this.socketIds.get(userId) || [];
    const filtered = existing.filter(id => id !== socketId);
    this.socketIds.set(userId, filtered);
  });

  public saveSMSCode = jest.fn().mockImplementation(async (code: string, phone: string) => {
    this.cache.set(`sms:${phone}`, { code, expiresAt: Date.now() + 300000 }); // 5 minutes
  });

  public getSMSCode = jest.fn().mockImplementation(async (phone: string) => {
    const data = this.cache.get(`sms:${phone}`);
    if (!data || data.expiresAt < Date.now()) {
      return null;
    }
    return data;
  });

  // Test utilities
  public getOrderLocation(orderId: string): { lat: number; lng: number; orderType: string } | null {
    return this.cache.get(`order:${orderId}`) || null;
  }

  public getDriverLocation(driverId: string): { lat: string; lng: string } | null {
    return this.cache.get(`driver:${driverId}`) || null;
  }

  public getUserSockets(userId: string): string[] {
    return this.socketIds.get(userId) || [];
  }

  public getSMSCodeData(phone: string): { code: string; expiresAt: number } | null {
    return this.cache.get(`sms:${phone}`) || null;
  }

  public reset(): void {
    this.cache.clear();
    this.socketIds.clear();
    this.updateOrderLocation.mockClear();
    this.updateDriverLocation.mockClear();
    this.getSocketIds.mockClear();
    this.addSocketId.mockClear();
    this.removeSocketId.mockClear();
    this.saveSMSCode.mockClear();
    this.getSMSCode.mockClear();
  }

  public simulateError(error: Error): void {
    this.updateOrderLocation.mockRejectedValue(error);
    this.updateDriverLocation.mockRejectedValue(error);
    this.getSocketIds.mockRejectedValue(error);
    this.addSocketId.mockRejectedValue(error);
    this.removeSocketId.mockRejectedValue(error);
    this.saveSMSCode.mockRejectedValue(error);
    this.getSMSCode.mockRejectedValue(error);
  }

  public simulateConnectionFailure(): void {
    this.updateOrderLocation.mockRejectedValue(new Error('Redis connection failed'));
    this.updateDriverLocation.mockRejectedValue(new Error('Redis connection failed'));
    this.getSocketIds.mockRejectedValue(new Error('Redis connection failed'));
    this.addSocketId.mockRejectedValue(new Error('Redis connection failed'));
    this.removeSocketId.mockRejectedValue(new Error('Redis connection failed'));
    this.saveSMSCode.mockRejectedValue(new Error('Redis connection failed'));
    this.getSMSCode.mockRejectedValue(new Error('Redis connection failed'));
  }
}
