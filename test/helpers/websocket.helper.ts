import { io, Socket } from 'socket.io-client';
import { Server } from 'socket.io';

export class WebSocketHelper {
  private static clients: Socket[] = [];

  static async connectClient(serverUrl: string, userId: string, userType: 'client' | 'driver' = 'client'): Promise<Socket> {
    const client = io(serverUrl, {
      transports: ['websocket'],
      timeout: 5000,
      forceNew: true,
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);

      client.on('connect', () => {
        clearTimeout(timeout);
        client.emit('join', { userId, userType });
        this.clients.push(client);
        resolve(client);
      });

      client.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  static async connectDriver(serverUrl: string, driverId: string): Promise<Socket> {
    return this.connectClient(serverUrl, driverId, 'driver');
  }

  static async waitForEvent(client: Socket, event: string, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      client.once(event, (data) => {
        clearTimeout(timeoutId);
        resolve(data);
      });
    });
  }

  static async waitForEvents(client: Socket, events: string[], timeout: number = 5000): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    const promises = events.map(event => 
      this.waitForEvent(client, event, timeout).then(data => {
        results[event] = data;
      })
    );

    await Promise.all(promises);
    return results;
  }

  static async emitAndWait(client: Socket, event: string, data: any, responseEvent: string, timeout: number = 5000): Promise<any> {
    const responsePromise = this.waitForEvent(client, responseEvent, timeout);
    client.emit(event, data);
    return responsePromise;
  }

  static async updateLocation(client: Socket, lat: number, lng: number, orderId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Location update timeout'));
      }, 5000);

      client.emit('driverLocationUpdate', { lat, lng, orderId });
      
      client.once('locationUpdated', () => {
        clearTimeout(timeout);
        resolve();
      });

      client.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  static async disconnectAll(): Promise<void> {
    const disconnectPromises = this.clients.map(client => 
      new Promise<void>((resolve) => {
        client.disconnect();
        client.on('disconnect', () => resolve());
      })
    );

    await Promise.all(disconnectPromises);
    this.clients = [];
  }

  static getConnectedClients(): Socket[] {
    return this.clients.filter(client => client.connected);
  }

  static getClientCount(): number {
    return this.clients.length;
  }

  static async simulateConnectionLoss(client: Socket): Promise<void> {
    client.disconnect();
  }

  static async simulateReconnection(client: Socket, serverUrl: string): Promise<Socket> {
    const userId = client.handshake.query.userId as string;
    const userType = client.handshake.query.userType as 'client' | 'driver';
    
    await this.disconnectAll();
    return this.connectClient(serverUrl, userId, userType);
  }
}
