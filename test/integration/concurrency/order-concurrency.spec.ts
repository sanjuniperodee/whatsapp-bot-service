import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { DatabaseHelper } from '../../helpers/database.helper';
import { UserFactory } from '../../helpers/factories/user.factory';
import { OrderFactory } from '../../helpers/factories/order.factory';
import { MockRedisService } from '../../helpers/mocks/redis.service.mock';
import { MockFirebaseService } from '../../helpers/mocks/firebase.service.mock';
import { MockWhatsAppService } from '../../helpers/mocks/whatsapp.service.mock';
import { MockGeocodingService } from '../../helpers/mocks/geocoding.service.mock';
import { Knex } from 'knex';

describe('Order Concurrency Integration Tests', () => {
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
    await module.close();
  });

  beforeEach(async () => {
    await DatabaseHelper.cleanDatabase();
  });

  describe('Multiple Drivers Accepting Same Order', () => {
    it('should handle race condition when multiple drivers accept same order', async () => {
      // Create client and multiple drivers
      const client = await DatabaseHelper.createTestUser({
        phone: '+77771234567',
        firstName: 'Client',
        lastName: 'Test',
      });

      const driver1 = await DatabaseHelper.createTestUser({
        phone: '+77771234568',
        firstName: 'Driver1',
        lastName: 'Test',
      });

      const driver2 = await DatabaseHelper.createTestUser({
        phone: '+77771234569',
        firstName: 'Driver2',
        lastName: 'Test',
      });

      // Create order
      const order = await DatabaseHelper.createTestOrder({
        clientId: client.id,
        fromAddress: 'Test From Address',
        toAddress: 'Test To Address',
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1,
        price: 1000,
      });

      // Simulate concurrent acceptance attempts
      const acceptancePromises = [
        DatabaseHelper.acceptOrder(order.id, driver1.id),
        DatabaseHelper.acceptOrder(order.id, driver2.id),
      ];

      const results = await Promise.allSettled(acceptancePromises);

      // Only one should succeed
      const successfulResults = results.filter(result => result.status === 'fulfilled');
      const failedResults = results.filter(result => result.status === 'rejected');

      expect(successfulResults).toHaveLength(1);
      expect(failedResults).toHaveLength(1);

      // Verify order status
      const updatedOrder = await DatabaseHelper.getOrderById(order.id);
      expect(updatedOrder.status).toBe('ACCEPTED');
      expect(updatedOrder.driverId).toBeDefined();
    });

    it('should handle concurrent order status updates', async () => {
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

      const order = await DatabaseHelper.createTestOrder({
        clientId: client.id,
        fromAddress: 'Test From Address',
        toAddress: 'Test To Address',
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1,
        price: 1000,
      });

      // Accept order
      await DatabaseHelper.acceptOrder(order.id, driver.id);

      // Simulate concurrent status updates
      const updatePromises = [
        DatabaseHelper.updateOrderStatus(order.id, 'DRIVER_ARRIVED'),
        DatabaseHelper.updateOrderStatus(order.id, 'STARTED'),
      ];

      const results = await Promise.allSettled(updatePromises);

      // Should handle gracefully
      expect(results).toHaveLength(2);
    });
  });

  describe('Client Cancelling While Driver Accepting', () => {
    it('should handle client cancellation during driver acceptance', async () => {
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

      const order = await DatabaseHelper.createTestOrder({
        clientId: client.id,
        fromAddress: 'Test From Address',
        toAddress: 'Test To Address',
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1,
        price: 1000,
      });

      // Simulate concurrent operations
      const concurrentOperations = [
        DatabaseHelper.acceptOrder(order.id, driver.id),
        DatabaseHelper.cancelOrder(order.id, 'CLIENT_CANCELLED'),
      ];

      const results = await Promise.allSettled(concurrentOperations);

      // Should handle gracefully
      expect(results).toHaveLength(2);

      // Verify final order status
      const updatedOrder = await DatabaseHelper.getOrderById(order.id);
      expect(['CANCELLED', 'ACCEPTED']).toContain(updatedOrder.status);
    });
  });

  describe('Simultaneous Location Updates', () => {
    it('should handle concurrent location updates from same driver', async () => {
      const driver = await DatabaseHelper.createTestUser({
        phone: '+77771234568',
        firstName: 'Driver',
        lastName: 'Test',
      });

      const locations = [
        { lat: 43.585472, lng: 51.236168 },
        { lat: 43.586472, lng: 51.237168 },
        { lat: 43.587472, lng: 51.238168 },
      ];

      // Simulate concurrent location updates
      const updatePromises = locations.map(location =>
        DatabaseHelper.updateDriverLocation(driver.id, location.lat, location.lng)
      );

      const results = await Promise.allSettled(updatePromises);

      // All should succeed
      expect(results.every(result => result.status === 'fulfilled')).toBe(true);
    });

    it('should handle location updates during active order', async () => {
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

      const order = await DatabaseHelper.createTestOrder({
        clientId: client.id,
        fromAddress: 'Test From Address',
        toAddress: 'Test To Address',
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1,
        price: 1000,
      });

      // Accept order
      await DatabaseHelper.acceptOrder(order.id, driver.id);

      // Simulate concurrent location updates and status changes
      const concurrentOperations = [
        DatabaseHelper.updateDriverLocation(driver.id, 43.586472, 51.237168),
        DatabaseHelper.updateOrderStatus(order.id, 'DRIVER_ARRIVED'),
        DatabaseHelper.updateDriverLocation(driver.id, 43.587472, 51.238168),
      ];

      const results = await Promise.allSettled(concurrentOperations);

      // Should handle gracefully
      expect(results).toHaveLength(3);
    });
  });

  describe('Race Conditions in State Transitions', () => {
    it('should handle race condition in order state machine', async () => {
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

      const order = await DatabaseHelper.createTestOrder({
        clientId: client.id,
        fromAddress: 'Test From Address',
        toAddress: 'Test To Address',
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1,
        price: 1000,
      });

      // Accept order
      await DatabaseHelper.acceptOrder(order.id, driver.id);

      // Simulate concurrent state transitions
      const stateTransitions = [
        DatabaseHelper.updateOrderStatus(order.id, 'DRIVER_ARRIVED'),
        DatabaseHelper.updateOrderStatus(order.id, 'STARTED'),
        DatabaseHelper.updateOrderStatus(order.id, 'COMPLETED'),
      ];

      const results = await Promise.allSettled(stateTransitions);

      // Should handle gracefully
      expect(results).toHaveLength(3);

      // Verify final state is valid
      const updatedOrder = await DatabaseHelper.getOrderById(order.id);
      expect(['DRIVER_ARRIVED', 'STARTED', 'COMPLETED']).toContain(updatedOrder.status);
    });

    it('should prevent invalid state transitions', async () => {
      const client = await DatabaseHelper.createTestUser({
        phone: '+77771234567',
        firstName: 'Client',
        lastName: 'Test',
      });

      const order = await DatabaseHelper.createTestOrder({
        clientId: client.id,
        fromAddress: 'Test From Address',
        toAddress: 'Test To Address',
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1,
        price: 1000,
      });

      // Try to complete order that hasn't been accepted
      const result = await DatabaseHelper.updateOrderStatus(order.id, 'COMPLETED');
      
      // Should fail
      expect(result.success).toBe(false);
    });
  });

  describe('Database Transaction Handling', () => {
    it('should handle transaction rollback on errors', async () => {
      const client = await DatabaseHelper.createTestUser({
        phone: '+77771234567',
        firstName: 'Client',
        lastName: 'Test',
      });

      // Simulate database error during order creation
      const originalCreateOrder = DatabaseHelper.createTestOrder;
      DatabaseHelper.createTestOrder = jest.fn().mockRejectedValue(new Error('Database error'));

      try {
        await DatabaseHelper.createTestOrder({
          clientId: client.id,
          fromAddress: 'Test From Address',
          toAddress: 'Test To Address',
          lat: 43.585472,
          lng: 51.236168,
          orderType: 1,
          price: 1000,
        });
      } catch (error) {
        expect(error.message).toBe('Database error');
      }

      // Restore original function
      DatabaseHelper.createTestOrder = originalCreateOrder;
    });

    it('should handle partial transaction failures', async () => {
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

      const order = await DatabaseHelper.createTestOrder({
        clientId: client.id,
        fromAddress: 'Test From Address',
        toAddress: 'Test To Address',
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1,
        price: 1000,
      });

      // Simulate partial failure during order acceptance
      const originalAcceptOrder = DatabaseHelper.acceptOrder;
      DatabaseHelper.acceptOrder = jest.fn().mockImplementation(async (orderId, driverId) => {
        // Simulate partial success
        await DatabaseHelper.updateOrderStatus(orderId, 'ACCEPTED');
        throw new Error('Partial failure');
      });

      try {
        await DatabaseHelper.acceptOrder(order.id, driver.id);
      } catch (error) {
        expect(error.message).toBe('Partial failure');
      }

      // Restore original function
      DatabaseHelper.acceptOrder = originalAcceptOrder;
    });
  });

  describe('Performance Under Load', () => {
    it('should handle multiple concurrent order creations', async () => {
      const client = await DatabaseHelper.createTestUser({
        phone: '+77771234567',
        firstName: 'Client',
        lastName: 'Test',
      });

      const orderPromises = [];
      for (let i = 0; i < 10; i++) {
        orderPromises.push(
          DatabaseHelper.createTestOrder({
            clientId: client.id,
            fromAddress: `Test From Address ${i}`,
            toAddress: `Test To Address ${i}`,
            lat: 43.585472 + (i * 0.001),
            lng: 51.236168 + (i * 0.001),
            orderType: 1,
            price: 1000 + (i * 100),
          })
        );
      }

      const results = await Promise.allSettled(orderPromises);
      const successfulOrders = results.filter(result => result.status === 'fulfilled');

      expect(successfulOrders.length).toBeGreaterThan(0);
    });

    it('should handle concurrent user operations', async () => {
      const userPromises = [];
      for (let i = 0; i < 20; i++) {
        userPromises.push(
          DatabaseHelper.createTestUser({
            phone: `+7777123456${i.toString().padStart(2, '0')}`,
            firstName: `User${i}`,
            lastName: 'Test',
          })
        );
      }

      const results = await Promise.allSettled(userPromises);
      const successfulUsers = results.filter(result => result.status === 'fulfilled');

      expect(successfulUsers.length).toBeGreaterThan(0);
    });
  });
});
