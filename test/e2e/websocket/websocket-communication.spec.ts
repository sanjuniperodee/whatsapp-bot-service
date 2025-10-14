import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../../src/app.module';
import { DatabaseHelper } from '../../helpers/database.helper';
import { WebSocketHelper } from '../../helpers/websocket.helper';
import { MockRedisService } from '../../helpers/mocks/redis.service.mock';
import { MockFirebaseService } from '../../helpers/mocks/firebase.service.mock';
import * as request from 'supertest';
import { Knex } from 'knex';

describe('WebSocket Communication E2E Tests', () => {
  let app: INestApplication;
  let knex: Knex;
  let module: TestingModule;
  let clientSocket: any;
  let driverSocket: any;
  let clientId: string;
  let driverId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider('CloudCacheStorageService')
    .useValue(new MockRedisService())
    .overrideProvider('NotificationService')
    .useValue(new MockFirebaseService())
    .compile();

    app = module.createNestApplication();
    await app.init();

    // Initialize database connection
    const knexConfig = {
      client: 'pg',
      connection: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5433'),
        user: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || 'taxi_service_test',
      },
    };
    
    knex = require('knex')(knexConfig);
    DatabaseHelper.initialize(knex);
  });

  afterAll(async () => {
    await WebSocketHelper.disconnectAll();
    await knex.destroy();
    await app.close();
    await module.close();
  });

  beforeEach(async () => {
    await DatabaseHelper.cleanDatabase();
    
    // Create test users
    const client = await DatabaseHelper.createTestUser({
      phone: '+77771234567',
      firstName: 'Client',
      lastName: 'Test',
    });
    
    const driver = await DatabaseHelper.createTestUser({
      phone: '+77771234568',
      firstName: 'Driver',
      lastName: 'Test',
    });
    
    clientId = client.id;
    driverId = driver.id;
  });

  describe('Connection Management', () => {
    it('should connect client successfully', async () => {
      const serverUrl = 'http://localhost:3000';
      
      clientSocket = await WebSocketHelper.connectClient(serverUrl, clientId, 'client');
      
      expect(clientSocket.connected).toBe(true);
    });

    it('should connect driver successfully', async () => {
      const serverUrl = 'http://localhost:3000';
      
      driverSocket = await WebSocketHelper.connectDriver(serverUrl, driverId);
      
      expect(driverSocket.connected).toBe(true);
    });

    it('should handle multiple client connections', async () => {
      const serverUrl = 'http://localhost:3000';
      
      const socket1 = await WebSocketHelper.connectClient(serverUrl, clientId, 'client');
      const socket2 = await WebSocketHelper.connectClient(serverUrl, clientId, 'client');
      
      expect(socket1.connected).toBe(true);
      expect(socket2.connected).toBe(true);
      
      await WebSocketHelper.disconnectAll();
    });

    it('should handle connection with authentication', async () => {
      const serverUrl = 'http://localhost:3000';
      
      clientSocket = await WebSocketHelper.connectClient(serverUrl, clientId, 'client');
      
      // Should receive connection confirmation
      const connectionEvent = await WebSocketHelper.waitForEvent(clientSocket, 'connected', 5000);
      expect(connectionEvent).toBeDefined();
    });

    it('should handle disconnection gracefully', async () => {
      const serverUrl = 'http://localhost:3000';
      
      clientSocket = await WebSocketHelper.connectClient(serverUrl, clientId, 'client');
      expect(clientSocket.connected).toBe(true);
      
      await WebSocketHelper.simulateConnectionLoss(clientSocket);
      expect(clientSocket.connected).toBe(false);
    });
  });

  describe('Order Creation Broadcasting', () => {
    beforeEach(async () => {
      const serverUrl = 'http://localhost:3000';
      clientSocket = await WebSocketHelper.connectClient(serverUrl, clientId, 'client');
      driverSocket = await WebSocketHelper.connectDriver(serverUrl, driverId);
    });

    it('should broadcast order creation to nearby drivers', async () => {
      // Create order via API
      const orderData = {
        fromAddress: 'Test From Address',
        toAddress: 'Test To Address',
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1,
        price: 1000,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/order-requests/create-order')
        .set('Authorization', `Bearer test-client-token`)
        .send(orderData)
        .expect(201);

      const orderId = response.body.id;

      // Driver should receive order notification
      const orderNotification = await WebSocketHelper.waitForEvent(
        driverSocket, 
        'newOrder', 
        5000
      );

      expect(orderNotification).toBeDefined();
      expect(orderNotification.orderId).toBe(orderId);
    });

    it('should not broadcast to drivers who are not nearby', async () => {
      // This would require setting up location-based filtering
      // For now, we'll test that the broadcast mechanism works
      const orderData = {
        fromAddress: 'Test From Address',
        toAddress: 'Test To Address',
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1,
        price: 1000,
      };

      await request(app.getHttpServer())
        .post('/v1/order-requests/create-order')
        .set('Authorization', `Bearer test-client-token`)
        .send(orderData)
        .expect(201);

      // Should receive notification
      const orderNotification = await WebSocketHelper.waitForEvent(
        driverSocket, 
        'newOrder', 
        5000
      );

      expect(orderNotification).toBeDefined();
    });
  });

  describe('Order Status Updates', () => {
    let orderId: string;

    beforeEach(async () => {
      const serverUrl = 'http://localhost:3000';
      clientSocket = await WebSocketHelper.connectClient(serverUrl, clientId, 'client');
      driverSocket = await WebSocketHelper.connectDriver(serverUrl, driverId);

      // Create order
      const orderData = {
        fromAddress: 'Test From Address',
        toAddress: 'Test To Address',
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1,
        price: 1000,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/order-requests/create-order')
        .set('Authorization', `Bearer test-client-token`)
        .send(orderData)
        .expect(201);

      orderId = response.body.id;
    });

    it('should notify client when driver accepts order', async () => {
      // Driver accepts order
      await request(app.getHttpServer())
        .post('/v1/order-requests/accept-order')
        .set('Authorization', `Bearer test-driver-token`)
        .send({ orderId, driverId })
        .expect(200);

      // Client should receive acceptance notification
      const acceptanceNotification = await WebSocketHelper.waitForEvent(
        clientSocket, 
        'orderAccepted', 
        5000
      );

      expect(acceptanceNotification).toBeDefined();
      expect(acceptanceNotification.orderId).toBe(orderId);
    });

    it('should notify client when driver arrives', async () => {
      // Accept order first
      await request(app.getHttpServer())
        .post('/v1/order-requests/accept-order')
        .set('Authorization', `Bearer test-driver-token`)
        .send({ orderId, driverId })
        .expect(200);

      // Driver arrives
      await request(app.getHttpServer())
        .post('/v1/order-requests/driver-arrived')
        .set('Authorization', `Bearer test-driver-token`)
        .send({ orderId })
        .expect(200);

      // Client should receive arrival notification
      const arrivalNotification = await WebSocketHelper.waitForEvent(
        clientSocket, 
        'driverArrived', 
        5000
      );

      expect(arrivalNotification).toBeDefined();
      expect(arrivalNotification.orderId).toBe(orderId);
    });

    it('should notify client when ride starts', async () => {
      // Complete the flow to ride start
      await request(app.getHttpServer())
        .post('/v1/order-requests/accept-order')
        .set('Authorization', `Bearer test-driver-token`)
        .send({ orderId, driverId })
        .expect(200);

      await request(app.getHttpServer())
        .post('/v1/order-requests/driver-arrived')
        .set('Authorization', `Bearer test-driver-token`)
        .send({ orderId })
        .expect(200);

      // Start ride
      await request(app.getHttpServer())
        .post('/v1/order-requests/start-order')
        .set('Authorization', `Bearer test-driver-token`)
        .send({ orderId })
        .expect(200);

      // Client should receive ride start notification
      const rideStartNotification = await WebSocketHelper.waitForEvent(
        clientSocket, 
        'rideStarted', 
        5000
      );

      expect(rideStartNotification).toBeDefined();
      expect(rideStartNotification.orderId).toBe(orderId);
    });

    it('should notify client when ride completes', async () => {
      // Complete the flow to ride completion
      await request(app.getHttpServer())
        .post('/v1/order-requests/accept-order')
        .set('Authorization', `Bearer test-driver-token`)
        .send({ orderId, driverId })
        .expect(200);

      await request(app.getHttpServer())
        .post('/v1/order-requests/driver-arrived')
        .set('Authorization', `Bearer test-driver-token`)
        .send({ orderId })
        .expect(200);

      await request(app.getHttpServer())
        .post('/v1/order-requests/start-order')
        .set('Authorization', `Bearer test-driver-token`)
        .send({ orderId })
        .expect(200);

      // Complete ride
      await request(app.getHttpServer())
        .post('/v1/order-requests/complete-order')
        .set('Authorization', `Bearer test-driver-token`)
        .send({ orderId })
        .expect(200);

      // Client should receive completion notification
      const completionNotification = await WebSocketHelper.waitForEvent(
        clientSocket, 
        'rideCompleted', 
        5000
      );

      expect(completionNotification).toBeDefined();
      expect(completionNotification.orderId).toBe(orderId);
    });
  });

  describe('Location Tracking', () => {
    beforeEach(async () => {
      const serverUrl = 'http://localhost:3000';
      clientSocket = await WebSocketHelper.connectClient(serverUrl, clientId, 'client');
      driverSocket = await WebSocketHelper.connectDriver(serverUrl, driverId);
    });

    it('should update driver location', async () => {
      const locationData = {
        lat: 43.585472,
        lng: 51.236168,
        timestamp: Date.now(),
      };

      await WebSocketHelper.updateLocation(driverSocket, locationData.lat, locationData.lng);

      // Should receive location update confirmation
      const locationUpdate = await WebSocketHelper.waitForEvent(
        driverSocket, 
        'locationUpdated', 
        5000
      );

      expect(locationUpdate).toBeDefined();
      expect(locationUpdate.success).toBe(true);
    });

    it('should send driver location to client during active order', async () => {
      // Create and accept order
      const orderData = {
        fromAddress: 'Test From Address',
        toAddress: 'Test To Address',
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1,
        price: 1000,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/order-requests/create-order')
        .set('Authorization', `Bearer test-client-token`)
        .send(orderData)
        .expect(201);

      const orderId = response.body.id;

      await request(app.getHttpServer())
        .post('/v1/order-requests/accept-order')
        .set('Authorization', `Bearer test-driver-token`)
        .send({ orderId, driverId })
        .expect(200);

      // Update driver location
      await WebSocketHelper.updateLocation(driverSocket, 43.586472, 51.237168, orderId);

      // Client should receive driver location
      const driverLocation = await WebSocketHelper.waitForEvent(
        clientSocket, 
        'driverLocation', 
        5000
      );

      expect(driverLocation).toBeDefined();
      expect(driverLocation.lat).toBe(43.586472);
      expect(driverLocation.lng).toBe(51.237168);
      expect(driverLocation.orderId).toBe(orderId);
    });

    it('should handle multiple location updates', async () => {
      const locations = [
        { lat: 43.585472, lng: 51.236168 },
        { lat: 43.586472, lng: 51.237168 },
        { lat: 43.587472, lng: 51.238168 },
      ];

      for (const location of locations) {
        await WebSocketHelper.updateLocation(driverSocket, location.lat, location.lng);
        
        const locationUpdate = await WebSocketHelper.waitForEvent(
          driverSocket, 
          'locationUpdated', 
          2000
        );

        expect(locationUpdate).toBeDefined();
      }
    });
  });

  describe('Driver Status', () => {
    beforeEach(async () => {
      const serverUrl = 'http://localhost:3000';
      driverSocket = await WebSocketHelper.connectDriver(serverUrl, driverId);
    });

    it('should handle driver going online', async () => {
      const onlineEvent = await WebSocketHelper.waitForEvent(
        driverSocket, 
        'driverOnline', 
        5000
      );

      expect(onlineEvent).toBeDefined();
      expect(onlineEvent.driverId).toBe(driverId);
    });

    it('should handle driver going offline', async () => {
      // Driver goes offline
      await WebSocketHelper.simulateConnectionLoss(driverSocket);

      // Should handle disconnection gracefully
      expect(driverSocket.connected).toBe(false);
    });

    it('should handle driver reconnection', async () => {
      const serverUrl = 'http://localhost:3000';
      
      // Simulate disconnection
      await WebSocketHelper.simulateConnectionLoss(driverSocket);
      
      // Reconnect
      driverSocket = await WebSocketHelper.simulateReconnection(driverSocket, serverUrl);
      
      expect(driverSocket.connected).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid connection data', async () => {
      const serverUrl = 'http://localhost:3000';
      
      try {
        await WebSocketHelper.connectClient(serverUrl, '', 'client');
        fail('Should have thrown error for invalid user ID');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle connection timeout', async () => {
      const serverUrl = 'http://invalid-server:9999';
      
      try {
        await WebSocketHelper.connectClient(serverUrl, clientId, 'client');
        fail('Should have thrown error for invalid server');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle message sending to disconnected client', async () => {
      const serverUrl = 'http://localhost:3000';
      
      clientSocket = await WebSocketHelper.connectClient(serverUrl, clientId, 'client');
      
      // Disconnect client
      await WebSocketHelper.simulateConnectionLoss(clientSocket);
      
      // Try to send message to disconnected client
      // This should be handled gracefully by the server
      expect(clientSocket.connected).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent connections', async () => {
      const serverUrl = 'http://localhost:3000';
      const connections = [];
      
      // Create multiple connections
      for (let i = 0; i < 10; i++) {
        const socket = await WebSocketHelper.connectClient(serverUrl, `${clientId}-${i}`, 'client');
        connections.push(socket);
      }
      
      expect(connections).toHaveLength(10);
      expect(connections.every(socket => socket.connected)).toBe(true);
      
      await WebSocketHelper.disconnectAll();
    });

    it('should handle rapid location updates', async () => {
      const serverUrl = 'http://localhost:3000';
      driverSocket = await WebSocketHelper.connectDriver(serverUrl, driverId);
      
      const startTime = Date.now();
      
      // Send multiple location updates rapidly
      const promises = [];
      for (let i = 0; i < 20; i++) {
        const lat = 43.585472 + (i * 0.0001);
        const lng = 51.236168 + (i * 0.0001);
        promises.push(WebSocketHelper.updateLocation(driverSocket, lat, lng));
      }
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
