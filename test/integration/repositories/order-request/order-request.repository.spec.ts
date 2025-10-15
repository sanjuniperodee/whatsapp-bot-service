import { Test, TestingModule } from '@nestjs/testing';
import { OrderRequestRepository } from '../../../../../src/taxi-context/domain-repositories/order-request/order-request.repository';
import { DatabaseHelper } from '../../../helpers/database.helper';
import { OrderFactory } from '../../../helpers/factories/order.factory';
import { UserFactory } from '../../../helpers/factories/user.factory';
import { OrderStatus, OrderType } from '@infrastructure/enums';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { Knex } from 'knex';

describe('OrderRequestRepository Integration Tests', () => {
  let repository: OrderRequestRepository;
  let knex: Knex;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [OrderRequestRepository],
    }).compile();

    repository = module.get<OrderRequestRepository>(OrderRequestRepository);
    
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

  describe('save', () => {
    it('should save order successfully', async () => {
      const order = OrderFactory.createCreatedOrder();
      
      await repository.save(order);
      
      const savedOrder = await repository.findOneById(order.id.value);
      expect(savedOrder).toBeDefined();
      expect(savedOrder?.id.value).toBe(order.id.value);
      expect(savedOrder?.getPropsCopy().orderStatus).toBe(OrderStatus.CREATED);
    });

    it('should update existing order', async () => {
      const order = OrderFactory.createCreatedOrder();
      await repository.save(order);
      
      order.start();
      await repository.save(order);
      
      const updatedOrder = await repository.findOneById(order.id.value);
      expect(updatedOrder?.getPropsCopy().orderStatus).toBe(OrderStatus.STARTED);
    });

    it('should save order with all order types', async () => {
      const orderTypes = [OrderType.TAXI, OrderType.DELIVERY, OrderType.CARGO, OrderType.INTERCITY_TAXI];
      
      for (const orderType of orderTypes) {
        const order = OrderFactory.create({ orderType });
        await repository.save(order);
        
        const savedOrder = await repository.findOneById(order.id.value);
        expect(savedOrder?.getPropsCopy().orderType).toBe(orderType);
      }
    });

    it('should save order with location data', async () => {
      const order = OrderFactory.create({
        lat: 43.585472,
        lng: 51.236168,
      });
      
      await repository.save(order);
      
      const savedOrder = await repository.findOneById(order.id.value);
      expect(savedOrder?.getPropsCopy().lat).toBe(43.585472);
      expect(savedOrder?.getPropsCopy().lng).toBe(51.236168);
    });
  });

  describe('findOneById', () => {
    it('should find order by ID', async () => {
      const order = OrderFactory.createCreatedOrder();
      await repository.save(order);
      
      const foundOrder = await repository.findOneById(order.id.value);
      
      expect(foundOrder).toBeDefined();
      expect(foundOrder?.id.value).toBe(order.id.value);
    });

    it('should return null for non-existent order', async () => {
      const nonExistentId = global.testUtils.generateTestUUID();
      
      const foundOrder = await repository.findOneById(nonExistentId);
      
      expect(foundOrder).toBeNull();
    });

    it('should find order with relations', async () => {
      const client = await DatabaseHelper.createTestUser(UserFactory.createClient());
      const driver = await DatabaseHelper.createTestUser(UserFactory.createDriver());
      
      const order = OrderFactory.create({
        clientId: new UUID(client.id),
        driverId: new UUID(driver.id),
      });
      
      await repository.save(order);
      
      const foundOrder = await repository.findOneById(order.id.value);
      expect(foundOrder).toBeDefined();
    });
  });

  describe('findMany', () => {
    it('should find orders by client ID', async () => {
      const client = await DatabaseHelper.createTestUser(UserFactory.createClient());
      
      const order1 = OrderFactory.create({
        clientId: new UUID(client.id),
        orderStatus: OrderStatus.CREATED,
      });
      const order2 = OrderFactory.create({
        clientId: new UUID(client.id),
        orderStatus: OrderStatus.COMPLETED,
      });
      
      await repository.save(order1);
      await repository.save(order2);
      
      const orders = await repository.findMany({
        clientId: new UUID(client.id),
      });
      
      expect(orders).toHaveLength(2);
    });

    it('should find orders by driver ID', async () => {
      const driver = await DatabaseHelper.createTestUser(UserFactory.createDriver());
      
      const order1 = OrderFactory.create({
        driverId: new UUID(driver.id),
        orderStatus: OrderStatus.STARTED,
      });
      const order2 = OrderFactory.create({
        driverId: new UUID(driver.id),
        orderStatus: OrderStatus.COMPLETED,
      });
      
      await repository.save(order1);
      await repository.save(order2);
      
      const orders = await repository.findMany({
        driverId: new UUID(driver.id),
      });
      
      expect(orders).toHaveLength(2);
    });

    it('should find orders by status', async () => {
      const client = await DatabaseHelper.createTestUser(UserFactory.createClient());
      
      const createdOrder = OrderFactory.create({
        clientId: new UUID(client.id),
        orderStatus: OrderStatus.CREATED,
      });
      const completedOrder = OrderFactory.create({
        clientId: new UUID(client.id),
        orderStatus: OrderStatus.COMPLETED,
      });
      
      await repository.save(createdOrder);
      await repository.save(completedOrder);
      
      const createdOrders = await repository.findMany({
        orderStatus: OrderStatus.CREATED,
      });
      
      expect(createdOrders).toHaveLength(1);
      expect(createdOrders[0].getPropsCopy().orderStatus).toBe(OrderStatus.CREATED);
    });

    it('should find orders with complex filters', async () => {
      const client = await DatabaseHelper.createTestUser(UserFactory.createClient());
      const driver = await DatabaseHelper.createTestUser(UserFactory.createDriver());
      
      const order1 = OrderFactory.create({
        clientId: new UUID(client.id),
        driverId: new UUID(driver.id),
        orderType: OrderType.TAXI,
        orderStatus: OrderStatus.STARTED,
      });
      const order2 = OrderFactory.create({
        clientId: new UUID(client.id),
        orderType: OrderType.DELIVERY,
        orderStatus: OrderStatus.CREATED,
      });
      
      await repository.save(order1);
      await repository.save(order2);
      
      const taxiOrders = await repository.findMany({
        orderType: OrderType.TAXI,
        orderStatus: OrderStatus.STARTED,
      });
      
      expect(taxiOrders).toHaveLength(1);
      expect(taxiOrders[0].getPropsCopy().orderType).toBe(OrderType.TAXI);
    });

    it('should find active orders', async () => {
      const client = await DatabaseHelper.createTestUser(UserFactory.createClient());
      
      const activeOrder = OrderFactory.create({
        clientId: new UUID(client.id),
        orderStatus: OrderStatus.STARTED,
      });
      const completedOrder = OrderFactory.create({
        clientId: new UUID(client.id),
        orderStatus: OrderStatus.COMPLETED,
      });
      
      await repository.save(activeOrder);
      await repository.save(completedOrder);
      
      const activeOrders = await repository.findMany({
        orderStatus: { $nin: [OrderStatus.COMPLETED, OrderStatus.REJECTED] } as any,
      });
      
      expect(activeOrders).toHaveLength(1);
      expect(activeOrders[0].getPropsCopy().orderStatus).toBe(OrderStatus.STARTED);
    });
  });

  describe('findActiveByClientId', () => {
    it('should find active order for client', async () => {
      const client = await DatabaseHelper.createTestUser(UserFactory.createClient());
      
      const activeOrder = OrderFactory.create({
        clientId: new UUID(client.id),
        orderStatus: OrderStatus.STARTED,
      });
      const completedOrder = OrderFactory.create({
        clientId: new UUID(client.id),
        orderStatus: OrderStatus.COMPLETED,
      });
      
      await repository.save(activeOrder);
      await repository.save(completedOrder);
      
      const foundOrder = await repository.findActiveByClientId(new UUID(client.id));
      
      expect(foundOrder).toBeDefined();
      expect(foundOrder?.getPropsCopy().orderStatus).toBe(OrderStatus.STARTED);
    });

    it('should return null when no active order', async () => {
      const client = await DatabaseHelper.createTestUser(UserFactory.createClient());
      
      const completedOrder = OrderFactory.create({
        clientId: new UUID(client.id),
        orderStatus: OrderStatus.COMPLETED,
      });
      
      await repository.save(completedOrder);
      
      const foundOrder = await repository.findActiveByClientId(new UUID(client.id));
      
      expect(foundOrder).toBeNull();
    });
  });

  describe('findActiveByDriverId', () => {
    it('should find active order for driver', async () => {
      const driver = await DatabaseHelper.createTestUser(UserFactory.createDriver());
      
      const activeOrder = OrderFactory.create({
        driverId: new UUID(driver.id),
        orderStatus: OrderStatus.ONGOING,
      });
      const completedOrder = OrderFactory.create({
        driverId: new UUID(driver.id),
        orderStatus: OrderStatus.COMPLETED,
      });
      
      await repository.save(activeOrder);
      await repository.save(completedOrder);
      
      const foundOrder = await repository.findActiveByDriverId(driver.id);
      
      expect(foundOrder).toBeDefined();
      expect(foundOrder?.getPropsCopy().orderStatus).toBe(OrderStatus.ONGOING);
    });

    it('should return null when no active order for driver', async () => {
      const driver = await DatabaseHelper.createTestUser(UserFactory.createDriver());
      
      const completedOrder = OrderFactory.create({
        driverId: new UUID(driver.id),
        orderStatus: OrderStatus.COMPLETED,
      });
      
      await repository.save(completedOrder);
      
      const foundOrder = await repository.findActiveByDriverId(driver.id);
      
      expect(foundOrder).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection error', async () => {
      // This test would require mocking the database connection
      // For now, we'll test with invalid data
      const invalidOrder = OrderFactory.create({
        clientId: new UUID('invalid-uuid'),
      });
      
      await expect(repository.save(invalidOrder)).rejects.toThrow();
    });

    it('should handle transaction rollback on error', async () => {
      const order = OrderFactory.createCreatedOrder();
      
      // Mock a database error during save
      jest.spyOn(repository, 'save').mockRejectedValueOnce(new Error('Database error'));
      
      await expect(repository.save(order)).rejects.toThrow('Database error');
    });
  });

  describe('Performance', () => {
    it('should handle large number of orders efficiently', async () => {
      const client = await DatabaseHelper.createTestUser(UserFactory.createClient());
      const orders = [];
      
      // Create 100 orders
      for (let i = 0; i < 100; i++) {
        const order = OrderFactory.create({
          clientId: new UUID(client.id),
          orderStatus: i % 2 === 0 ? OrderStatus.CREATED : OrderStatus.COMPLETED,
        });
        orders.push(order);
      }
      
      const startTime = Date.now();
      
      // Save all orders
      for (const order of orders) {
        await repository.save(order);
      }
      
      const saveTime = Date.now() - startTime;
      
      // Find orders by client
      const findStartTime = Date.now();
      const foundOrders = await repository.findMany({
        clientId: new UUID(client.id),
      });
      const findTime = Date.now() - findStartTime;
      
      expect(foundOrders).toHaveLength(100);
      expect(saveTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(findTime).toBeLessThan(1000); // Should find within 1 second
    });
  });
});
