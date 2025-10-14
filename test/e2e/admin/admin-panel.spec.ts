import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../../src/app.module';
import { DatabaseHelper } from '../../helpers/database.helper';
import { MockFirebaseService } from '../../helpers/mocks/firebase.service.mock';
import * as request from 'supertest';
import { Knex } from 'knex';

describe('Admin Panel E2E Tests', () => {
  let app: INestApplication;
  let knex: Knex;
  let module: TestingModule;
  let adminToken: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    })
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
    
    // Generate admin token
    adminToken = 'test-admin-token-' + Date.now();
  });

  afterAll(async () => {
    await knex.destroy();
    await app.close();
    await module.close();
  });

  beforeEach(async () => {
    await DatabaseHelper.cleanDatabase();
    
    // Create test data
    await DatabaseHelper.createTestScenario('client-driver-order');
  });

  describe('Client Management', () => {
    it('should get all clients', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should get clients with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/clients?_start=0&_end=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(10);
    });

    it('should get client by ID', async () => {
      const client = await DatabaseHelper.createTestUser({
        phone: '+77771234567',
        firstName: 'Test',
        lastName: 'Client',
      });

      const response = await request(app.getHttpServer())
        .get(`/admin/clients/${client.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', client.id);
      expect(response.body).toHaveProperty('phone', '+77771234567');
    });

    it('should block user temporarily', async () => {
      const client = await DatabaseHelper.createTestUser({
        phone: '+77771234568',
        firstName: 'Blocked',
        lastName: 'User',
      });

      const blockData = {
        userId: client.id,
        blockedUntil: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        reason: 'Test violation',
      };

      const response = await request(app.getHttpServer())
        .post('/admin/users/block')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(blockData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'User blocked successfully');
      expect(response.body).toHaveProperty('userId', client.id);
    });

    it('should block user permanently', async () => {
      const client = await DatabaseHelper.createTestUser({
        phone: '+77771234569',
        firstName: 'Permanently',
        lastName: 'Blocked',
      });

      const blockData = {
        userId: client.id,
        reason: 'Serious violation',
      };

      const response = await request(app.getHttpServer())
        .post('/admin/users/block')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(blockData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'User blocked successfully');
    });

    it('should unblock user', async () => {
      const client = await DatabaseHelper.createTestUser({
        phone: '+77771234570',
        firstName: 'Unblocked',
        lastName: 'User',
        isBlocked: true,
        blockedUntil: new Date(Date.now() + 3600000),
        blockReason: 'Test violation',
      });

      const response = await request(app.getHttpServer())
        .put(`/admin/users/${client.id}/unblock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'User unblocked successfully');
    });

    it('should handle blocking non-existent user', async () => {
      const blockData = {
        userId: 'non-existent-user-id',
        reason: 'Test violation',
      };

      await request(app.getHttpServer())
        .post('/admin/users/block')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(blockData)
        .expect(404);
    });

    it('should handle unblocking non-existent user', async () => {
      await request(app.getHttpServer())
        .put('/admin/users/non-existent-user-id/unblock')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Driver Management', () => {
    it('should get all drivers', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get drivers with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/drivers?_start=0&_end=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(10);
    });

    it('should get driver by ID', async () => {
      const driver = await DatabaseHelper.createTestUser({
        phone: '+77771234571',
        firstName: 'Test',
        lastName: 'Driver',
      });

      const response = await request(app.getHttpServer())
        .get(`/admin/drivers/${driver.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', driver.id);
    });

    it('should get driver with category licenses', async () => {
      const driver = await DatabaseHelper.createTestUser({
        phone: '+77771234572',
        firstName: 'Licensed',
        lastName: 'Driver',
      });

      // Add category license
      await DatabaseHelper.createTestCategory({
        driverId: driver.id,
        categoryType: 'TAXI',
        brand: 'Toyota',
        model: 'Camry',
        number: '123ABC01',
      });

      const response = await request(app.getHttpServer())
        .get(`/admin/drivers/${driver.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('categoryLicenses');
      expect(Array.isArray(response.body.categoryLicenses)).toBe(true);
    });
  });

  describe('Order Management', () => {
    it('should get all orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/order-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get orders with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/order-requests?_start=0&_end=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(10);
    });

    it('should filter orders by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/order-requests?orderStatus=CREATED')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter orders by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/order-requests?orderType=TAXI')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter orders by multiple criteria', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/order-requests?orderType=TAXI&orderStatus=CREATED&_start=0&_end=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });

    it('should get order by ID', async () => {
      const order = await DatabaseHelper.createTestOrder({
        orderType: 'TAXI',
        orderStatus: 'CREATED',
      });

      const response = await request(app.getHttpServer())
        .get(`/admin/order-requests/${order.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', order.id);
    });

    it('should get order with client and driver information', async () => {
      const client = await DatabaseHelper.createTestUser({
        phone: '+77771234573',
        firstName: 'Order',
        lastName: 'Client',
      });

      const driver = await DatabaseHelper.createTestUser({
        phone: '+77771234574',
        firstName: 'Order',
        lastName: 'Driver',
      });

      const order = await DatabaseHelper.createTestOrder({
        clientId: client.id,
        driverId: driver.id,
        orderType: 'TAXI',
        orderStatus: 'STARTED',
      });

      const response = await request(app.getHttpServer())
        .get(`/admin/order-requests/${order.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('client');
      expect(response.body).toHaveProperty('driver');
      expect(response.body.client).toHaveProperty('firstName', 'Order');
      expect(response.body.driver).toHaveProperty('firstName', 'Order');
    });
  });

  describe('Statistics and Analytics', () => {
    it('should get system statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('totalOrders');
      expect(response.body).toHaveProperty('activeOrders');
      expect(response.body).toHaveProperty('blockedUsers');
    });

    it('should get order statistics by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/statistics/orders-by-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('CREATED');
      expect(response.body).toHaveProperty('COMPLETED');
      expect(response.body).toHaveProperty('REJECTED');
    });

    it('should get order statistics by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/statistics/orders-by-type')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('TAXI');
      expect(response.body).toHaveProperty('DELIVERY');
      expect(response.body).toHaveProperty('CARGO');
      expect(response.body).toHaveProperty('INTERCITY_TAXI');
    });
  });

  describe('Error Handling', () => {
    it('should handle unauthorized access', async () => {
      await request(app.getHttpServer())
        .get('/admin/clients')
        .expect(401);
    });

    it('should handle invalid admin token', async () => {
      await request(app.getHttpServer())
        .get('/admin/clients')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should handle malformed requests', async () => {
      await request(app.getHttpServer())
        .post('/admin/users/block')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('should handle invalid pagination parameters', async () => {
      await request(app.getHttpServer())
        .get('/admin/clients?_start=invalid&_end=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      // Create multiple test records
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(DatabaseHelper.createTestUser({
          phone: `+77771234${i.toString().padStart(3, '0')}`,
          firstName: `User${i}`,
          lastName: `Test${i}`,
        }));
      }
      await Promise.all(promises);

      const startTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .get('/admin/clients?_start=0&_end=50')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(50);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});
