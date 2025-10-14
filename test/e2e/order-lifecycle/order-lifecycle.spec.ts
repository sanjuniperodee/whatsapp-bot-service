import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../../src/app.module';
import { DatabaseHelper } from '../../helpers/database.helper';
import { AuthHelper } from '../../helpers/auth.helper';
import { MockWhatsAppService } from '../../helpers/mocks/whatsapp.service.mock';
import { MockRedisService } from '../../helpers/mocks/redis.service.mock';
import { MockFirebaseService } from '../../helpers/mocks/firebase.service.mock';
import { MockGeocodingService } from '../../helpers/mocks/geocoding.service.mock';
import * as request from 'supertest';
import { Knex } from 'knex';

describe('Order Lifecycle E2E Tests', () => {
  let app: INestApplication;
  let knex: Knex;
  let module: TestingModule;
  let clientToken: string;
  let driverToken: string;
  let clientId: string;
  let driverId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider('WhatsAppService')
    .useValue(new MockWhatsAppService())
    .overrideProvider('CloudCacheStorageService')
    .useValue(new MockRedisService())
    .overrideProvider('NotificationService')
    .useValue(new MockFirebaseService())
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
    
    // Create test users and get tokens
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
    
    // Generate tokens (in real scenario, this would be done through auth flow)
    clientToken = 'test-client-token-' + Date.now();
    driverToken = 'test-driver-token-' + Date.now();
  });

  describe('Order Creation', () => {
    it('should create taxi order successfully', async () => {
      const orderData = {
        fromAddress: 'Test From Address',
        toAddress: 'Test To Address',
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1, // TAXI
        price: 1000,
        comment: 'Test order comment',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/order-requests/create-order')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('orderStatus', 'CREATED');
      expect(response.body).toHaveProperty('orderType', 'TAXI');
      expect(response.body).toHaveProperty('from', orderData.fromAddress);
      expect(response.body).toHaveProperty('to', orderData.toAddress);
    });

    it('should create delivery order successfully', async () => {
      const orderData = {
        fromAddress: 'Restaurant Address',
        toAddress: 'Customer Address',
        lat: 43.585472,
        lng: 51.236168,
        orderType: 2, // DELIVERY
        price: 500,
        comment: 'Food delivery',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/order-requests/create-order')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('orderType', 'DELIVERY');
    });

    it('should create cargo order successfully', async () => {
      const orderData = {
        fromAddress: 'Warehouse Address',
        toAddress: 'Destination Address',
        lat: 43.585472,
        lng: 51.236168,
        orderType: 4, // CARGO
        price: 2000,
        comment: 'Heavy cargo transport',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/order-requests/create-order')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('orderType', 'CARGO');
    });

    it('should create intercity taxi order successfully', async () => {
      const orderData = {
        fromAddress: 'Almaty Address',
        toAddress: 'Astana Address',
        lat: 43.585472,
        lng: 51.236168,
        orderType: 3, // INTERCITY_TAXI
        price: 5000,
        comment: 'Intercity trip',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/order-requests/create-order')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('orderType', 'INTERCITY_TAXI');
    });

    it('should reject order creation for blocked user', async () => {
      // Create blocked user
      const blockedUser = await DatabaseHelper.createTestUser({
        phone: '+77771234569',
        firstName: 'Blocked',
        lastName: 'User',
        isBlocked: true,
        blockedUntil: new Date(Date.now() + 3600000), // 1 hour from now
        blockReason: 'Test violation',
      });

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
        .set('Authorization', `Bearer test-blocked-user-token`)
        .send(orderData)
        .expect(403);
    });

    it('should reject order creation when user has active order', async () => {
      // Create first order
      const orderData1 = {
        fromAddress: 'First From Address',
        toAddress: 'First To Address',
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1,
        price: 1000,
      };

      await request(app.getHttpServer())
        .post('/v1/order-requests/create-order')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(orderData1)
        .expect(201);

      // Try to create second order
      const orderData2 = {
        fromAddress: 'Second From Address',
        toAddress: 'Second To Address',
        lat: 43.586472,
        lng: 51.237168,
        orderType: 1,
        price: 1500,
      };

      await request(app.getHttpServer())
        .post('/v1/order-requests/create-order')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(orderData2)
        .expect(409);
    });

    it('should validate required fields', async () => {
      const invalidOrderData = {
        // Missing required fields
        lat: 43.585472,
        lng: 51.236168,
      };

      await request(app.getHttpServer())
        .post('/v1/order-requests/create-order')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(invalidOrderData)
        .expect(400);
    });

    it('should validate order type', async () => {
      const orderData = {
        fromAddress: 'Test From Address',
        toAddress: 'Test To Address',
        lat: 43.585472,
        lng: 51.236168,
        orderType: 999, // Invalid order type
        price: 1000,
      };

      await request(app.getHttpServer())
        .post('/v1/order-requests/create-order')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(orderData)
        .expect(400);
    });
  });

  describe('Order Acceptance', () => {
    let orderId: string;

    beforeEach(async () => {
      // Create order first
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
        .set('Authorization', `Bearer ${clientToken}`)
        .send(orderData)
        .expect(201);

      orderId = response.body.id;
    });

    it('should accept order successfully', async () => {
      const acceptData = {
        orderId,
        driverId,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/order-requests/accept-order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(acceptData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should reject accepting non-existent order', async () => {
      const acceptData = {
        orderId: 'non-existent-order-id',
        driverId,
      };

      await request(app.getHttpServer())
        .post('/v1/order-requests/accept-order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(acceptData)
        .expect(404);
    });

    it('should reject accepting order in wrong status', async () => {
      // First accept the order
      const acceptData = {
        orderId,
        driverId,
      };

      await request(app.getHttpServer())
        .post('/v1/order-requests/accept-order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(acceptData)
        .expect(200);

      // Try to accept again
      await request(app.getHttpServer())
        .post('/v1/order-requests/accept-order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(acceptData)
        .expect(409);
    });
  });

  describe('Order Lifecycle States', () => {
    let orderId: string;

    beforeEach(async () => {
      // Create and accept order
      const orderData = {
        fromAddress: 'Test From Address',
        toAddress: 'Test To Address',
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1,
        price: 1000,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/v1/order-requests/create-order')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(orderData)
        .expect(201);

      orderId = createResponse.body.id;

      const acceptData = {
        orderId,
        driverId,
      };

      await request(app.getHttpServer())
        .post('/v1/order-requests/accept-order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(acceptData)
        .expect(200);
    });

    it('should handle driver arrival', async () => {
      const arrivalData = {
        orderId,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/order-requests/driver-arrived')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(arrivalData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle ride start', async () => {
      // First driver arrives
      await request(app.getHttpServer())
        .post('/v1/order-requests/driver-arrived')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ orderId })
        .expect(200);

      // Then start ride
      const startData = {
        orderId,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/order-requests/start-order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(startData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle ride completion', async () => {
      // Complete the lifecycle
      await request(app.getHttpServer())
        .post('/v1/order-requests/driver-arrived')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ orderId })
        .expect(200);

      await request(app.getHttpServer())
        .post('/v1/order-requests/start-order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ orderId })
        .expect(200);

      // Complete ride
      const completeData = {
        orderId,
        rating: 5,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/order-requests/complete-order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(completeData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle order cancellation by client', async () => {
      const cancelData = {
        orderId,
        reason: 'Changed mind',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/order-requests/cancel-order')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(cancelData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle order cancellation by driver', async () => {
      const cancelData = {
        orderId,
        reason: 'Emergency',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/order-requests/cancel-order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(cancelData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Order Queries', () => {
    beforeEach(async () => {
      // Create test orders
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
        .set('Authorization', `Bearer ${clientToken}`)
        .send(orderData)
        .expect(201);
    });

    it('should get client active order', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/order-requests/client-active-order')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('order');
    });

    it('should get driver active order', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/order-requests/my-active-order')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('order');
    });

    it('should get order history', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/order-requests/history/pending')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get completed order history', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/order-requests/history/completed')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Location Services', () => {
    it('should get address by coordinates', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/order-requests/address?lat=43.585472&lon=51.236168')
        .expect(200);

      expect(response.body).toHaveProperty('address');
    });

    it('should search places by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/order-requests/find-by-name?lat=43.585472&lon=51.236168&search=Test')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should validate coordinates', async () => {
      await request(app.getHttpServer())
        .get('/v1/order-requests/address?lat=invalid&lon=invalid')
        .expect(400);
    });
  });

  describe('Driver Category Registration', () => {
    it('should register driver category', async () => {
      const categoryData = {
        governmentNumber: '123ABC01',
        model: 'Toyota Camry',
        SSN: '123456789012',
        type: 1, // TAXI
        color: 'Белый',
        brand: 'Toyota',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/order-requests/category/register')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(categoryData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should get category info', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/order-requests/category/info')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid order ID', async () => {
      await request(app.getHttpServer())
        .post('/v1/order-requests/accept-order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ orderId: 'invalid-id', driverId })
        .expect(400);
    });

    it('should handle unauthorized access', async () => {
      await request(app.getHttpServer())
        .post('/v1/order-requests/create-order')
        .send({ fromAddress: 'Test' })
        .expect(401);
    });

    it('should handle invalid order status transitions', async () => {
      const orderData = {
        fromAddress: 'Test From Address',
        toAddress: 'Test To Address',
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1,
        price: 1000,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/v1/order-requests/create-order')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(orderData)
        .expect(201);

      const orderId = createResponse.body.id;

      // Try to complete order without proper flow
      await request(app.getHttpServer())
        .post('/v1/order-requests/complete-order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ orderId })
        .expect(409);
    });
  });
});
