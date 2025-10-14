import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { DatabaseHelper } from '../helpers/database.helper';
import { MockRedisService } from '../helpers/mocks/redis.service.mock';
import { MockFirebaseService } from '../helpers/mocks/firebase.service.mock';
import { MockWhatsAppService } from '../helpers/mocks/whatsapp.service.mock';
import { MockGeocodingService } from '../helpers/mocks/geocoding.service.mock';
import { Knex } from 'knex';
import * as request from 'supertest';

describe('Order Creation Load Tests', () => {
  let app: any;
  let module: TestingModule;
  let knex: Knex;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider('CloudCacheStorageService')
    .useValue(new MockRedisService())
    .overrideProvider('NotificationService')
    .useValue(new MockFirebaseService())
    .overrideProvider('WhatsAppService')
    .useValue(new MockWhatsAppService())
    .overrideProvider('GeocodingPort')
    .useValue(new MockGeocodingService())
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
    await knex.destroy();
    await app.close();
    await module.close();
  });

  beforeEach(async () => {
    await DatabaseHelper.cleanDatabase();
  });

  describe('Order Creation Under Load', () => {
    it('should handle 100 concurrent order creations', async () => {
      // Create test users
      const users = [];
      for (let i = 0; i < 10; i++) {
        const user = await DatabaseHelper.createTestUser({
          phone: `+7777123456${i.toString().padStart(2, '0')}`,
          firstName: `User${i}`,
          lastName: 'Test',
        });
        users.push(user);
      }

      const orderPromises = [];
      const startTime = Date.now();

      // Create 100 orders concurrently
      for (let i = 0; i < 100; i++) {
        const user = users[i % users.length];
        const orderData = {
          fromAddress: `Test From Address ${i}`,
          toAddress: `Test To Address ${i}`,
          lat: 43.585472 + (i * 0.001),
          lng: 51.236168 + (i * 0.001),
          orderType: 1,
          price: 1000 + (i * 10),
        };

        orderPromises.push(
          request(app.getHttpServer())
            .post('/v1/order-requests/create-order')
            .set('Authorization', `Bearer test-token-${user.id}`)
            .send(orderData)
        );
      }

      const results = await Promise.allSettled(orderPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successfulOrders = results.filter(result => result.status === 'fulfilled');
      const failedOrders = results.filter(result => result.status === 'rejected');

      console.log(`Load Test Results:`);
      console.log(`- Total orders: 100`);
      console.log(`- Successful: ${successfulOrders.length}`);
      console.log(`- Failed: ${failedOrders.length}`);
      console.log(`- Duration: ${duration}ms`);
      console.log(`- Average response time: ${duration / 100}ms`);

      expect(successfulOrders.length).toBeGreaterThan(80); // At least 80% success rate
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('should handle 50 concurrent order acceptances', async () => {
      // Create client and drivers
      const client = await DatabaseHelper.createTestUser({
        phone: '+77771234567',
        firstName: 'Client',
        lastName: 'Test',
      });

      const drivers = [];
      for (let i = 0; i < 10; i++) {
        const driver = await DatabaseHelper.createTestUser({
          phone: `+7777123456${i.toString().padStart(2, '0')}`,
          firstName: `Driver${i}`,
          lastName: 'Test',
        });
        drivers.push(driver);
      }

      // Create orders
      const orders = [];
      for (let i = 0; i < 50; i++) {
        const order = await DatabaseHelper.createTestOrder({
          clientId: client.id,
          fromAddress: `Test From Address ${i}`,
          toAddress: `Test To Address ${i}`,
          lat: 43.585472 + (i * 0.001),
          lng: 51.236168 + (i * 0.001),
          orderType: 1,
          price: 1000 + (i * 10),
        });
        orders.push(order);
      }

      const acceptancePromises = [];
      const startTime = Date.now();

      // Simulate concurrent acceptances
      for (let i = 0; i < 50; i++) {
        const order = orders[i];
        const driver = drivers[i % drivers.length];
        
        acceptancePromises.push(
          request(app.getHttpServer())
            .post('/v1/order-requests/accept-order')
            .set('Authorization', `Bearer test-token-${driver.id}`)
            .send({ orderId: order.id, driverId: driver.id })
        );
      }

      const results = await Promise.allSettled(acceptancePromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successfulAcceptances = results.filter(result => result.status === 'fulfilled');
      const failedAcceptances = results.filter(result => result.status === 'rejected');

      console.log(`Acceptance Load Test Results:`);
      console.log(`- Total acceptances: 50`);
      console.log(`- Successful: ${successfulAcceptances.length}`);
      console.log(`- Failed: ${failedAcceptances.length}`);
      console.log(`- Duration: ${duration}ms`);

      expect(successfulAcceptances.length).toBeGreaterThan(40); // At least 80% success rate
      expect(duration).toBeLessThan(20000); // Should complete within 20 seconds
    });
  });

  describe('WebSocket Connection Load', () => {
    it('should handle 200 concurrent WebSocket connections', async () => {
      const connections = [];
      const startTime = Date.now();

      try {
        // Create 200 concurrent connections
        for (let i = 0; i < 200; i++) {
          const connectionPromise = DatabaseHelper.createTestUser({
            phone: `+7777123456${i.toString().padStart(3, '0')}`,
            firstName: `User${i}`,
            lastName: 'Test',
          });
          connections.push(connectionPromise);
        }

        const results = await Promise.allSettled(connections);
        const endTime = Date.now();
        const duration = endTime - startTime;

        const successfulConnections = results.filter(result => result.status === 'fulfilled');
        const failedConnections = results.filter(result => result.status === 'rejected');

        console.log(`WebSocket Load Test Results:`);
        console.log(`- Total connections: 200`);
        console.log(`- Successful: ${successfulConnections.length}`);
        console.log(`- Failed: ${failedConnections.length}`);
        console.log(`- Duration: ${duration}ms`);

        expect(successfulConnections.length).toBeGreaterThan(180); // At least 90% success rate
        expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
      } catch (error) {
        console.error('WebSocket load test failed:', error);
        throw error;
      }
    });
  });

  describe('Database Query Performance', () => {
    it('should handle complex order queries efficiently', async () => {
      // Create test data
      const users = [];
      for (let i = 0; i < 50; i++) {
        const user = await DatabaseHelper.createTestUser({
          phone: `+7777123456${i.toString().padStart(2, '0')}`,
          firstName: `User${i}`,
          lastName: 'Test',
        });
        users.push(user);
      }

      // Create orders
      const orders = [];
      for (let i = 0; i < 200; i++) {
        const user = users[i % users.length];
        const order = await DatabaseHelper.createTestOrder({
          clientId: user.id,
          fromAddress: `Test From Address ${i}`,
          toAddress: `Test To Address ${i}`,
          lat: 43.585472 + (i * 0.001),
          lng: 51.236168 + (i * 0.001),
          orderType: 1,
          price: 1000 + (i * 10),
        });
        orders.push(order);
      }

      const startTime = Date.now();

      // Perform complex queries
      const queryPromises = [
        DatabaseHelper.getOrdersByStatus('CREATED'),
        DatabaseHelper.getOrdersByClientId(users[0].id),
        DatabaseHelper.getOrdersByDateRange(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()),
        DatabaseHelper.getOrdersByPriceRange(1000, 5000),
      ];

      const results = await Promise.allSettled(queryPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Database Query Performance:`);
      console.log(`- Total queries: ${queryPromises.length}`);
      console.log(`- Duration: ${duration}ms`);
      console.log(`- Average query time: ${duration / queryPromises.length}ms`);

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(results.every(result => result.status === 'fulfilled')).toBe(true);
    });
  });

  describe('Memory Usage', () => {
    it('should not have memory leaks during load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform memory-intensive operations
      const operations = [];
      for (let i = 0; i < 1000; i++) {
        operations.push(
          DatabaseHelper.createTestUser({
            phone: `+7777123456${i.toString().padStart(3, '0')}`,
            firstName: `User${i}`,
            lastName: 'Test',
          })
        );
      }

      await Promise.allSettled(operations);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Memory Usage:`);
      console.log(`- Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('Response Time Percentiles', () => {
    it('should measure response time percentiles', async () => {
      const responseTimes = [];
      const user = await DatabaseHelper.createTestUser({
        phone: '+77771234567',
        firstName: 'User',
        lastName: 'Test',
      });

      // Perform 100 requests and measure response times
      for (let i = 0; i < 100; i++) {
        const startTime = Date.now();
        
        await request(app.getHttpServer())
          .get('/v1/user/GetMe')
          .set('Authorization', `Bearer test-token-${user.id}`)
          .expect(200);
        
        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }

      // Calculate percentiles
      responseTimes.sort((a, b) => a - b);
      const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
      const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
      const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];

      console.log(`Response Time Percentiles:`);
      console.log(`- P50: ${p50}ms`);
      console.log(`- P95: ${p95}ms`);
      console.log(`- P99: ${p99}ms`);

      expect(p50).toBeLessThan(100); // 50% of requests should be under 100ms
      expect(p95).toBeLessThan(500); // 95% of requests should be under 500ms
      expect(p99).toBeLessThan(1000); // 99% of requests should be under 1000ms
    });
  });
});
