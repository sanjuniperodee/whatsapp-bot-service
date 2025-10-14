export interface LocationData {
  lng: number;
  lat: number;
  timestamp: number;
}

export interface LocationCachePort {
  updateDriverLocation(driverId: string, lng: number, lat: number): Promise<void>;
  getDriverLocation(driverId: string): Promise<LocationData | null>;
  findNearestDrivers(lat: number, lng: number, radius?: number): Promise<string[]>;
  setDriverOnline(driverId: string): Promise<void>;
  setDriverOffline(driverId: string): Promise<void>;
  isDriverOnline(driverId: string): Promise<boolean>;
  getOnlineDrivers(): Promise<string[]>;
  getOnlineClients(): Promise<string[]>;
  setUserSocket(userId: string, socketId: string): Promise<void>;
  getUserSocket(userId: string): Promise<string | null>;
  removeUserSocket(userId: string): Promise<void>;
  setSocketUser(socketId: string, userId: string): Promise<void>;
  getSocketUser(socketId: string): Promise<string | null>;
  removeSocketUser(socketId: string): Promise<void>;
  setSocketClientId(orderId: string, socketId: string): Promise<void>;
  getSocketClientId(orderId: string): Promise<string | null>;
  isSocketActive(socketId: string): Promise<boolean>;
  getAllUsersWithSockets(): Promise<string[]>;
  cleanupExpiredOrders(): Promise<void>;
  cleanupOldLocations(): Promise<void>;
}
