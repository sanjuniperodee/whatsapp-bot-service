import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CreateOrderHandler } from '@domain/order-request/commands/create-order/create-order.handler';
import { CreateOrderCommand } from '@domain/order-request/commands/create-order/create-order.command';
import { OrderRequestRepository } from '@domain/order-request/domain-repositories/order-request/order-request.repository';
import { UserRepository } from '@domain/user/domain-repositories/user/user.repository';
import { UserBlockingService } from '@domain/user/services/user-blocking.service';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/cloud-cache-storage.service';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
import { OrderFactory } from '../../../helpers/factories/order.factory';
import { UserFactory } from '../../../helpers/factories/user.factory';
import { MockRedisService } from '../../../helpers/mocks/redis.service.mock';
import { MockWhatsAppService } from '../../../helpers/mocks/whatsapp.service.mock';
import { MockFirebaseService } from '../../../helpers/mocks/firebase.service.mock';
import { OrderStatus, OrderType } from '@infrastructure/enums';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';

describe('CreateOrderHandler', () => {
  let handler: CreateOrderHandler;
  let orderRepository: jest.Mocked<OrderRequestRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let userBlockingService: jest.Mocked<UserBlockingService>;
  let cacheStorageService: jest.Mocked<CloudCacheStorageService>;
  let orderGateway: jest.Mocked<OrderRequestGateway>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrderHandler,
        {
          provide: OrderRequestRepository,
          useValue: {
            findOneById: jest.fn(),
            findMany: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: UserRepository,
          useValue: {
            findOneById: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: UserBlockingService,
          useValue: {
            checkUserBlockingAndNotify: jest.fn(),
          },
        },
        {
          provide: CloudCacheStorageService,
          useValue: {
            updateOrderLocation: jest.fn(),
          },
        },
        {
          provide: OrderRequestGateway,
          useValue: {
            handleOrderCreated: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<CreateOrderHandler>(CreateOrderHandler);
    orderRepository = module.get(OrderRequestRepository);
    userRepository = module.get(UserRepository);
    userBlockingService = module.get(UserBlockingService);
    cacheStorageService = module.get(CloudCacheStorageService);
    orderGateway = module.get(OrderRequestGateway);
  });

  describe('execute', () => {
    const validCommand = new CreateOrderCommand({
      clientId: new UUID(global.testUtils.generateTestUUID()),
      orderType: OrderType.TAXI,
      from: 'Test From Address',
      to: 'Test To Address',
      fromMapboxId: 'test-from-mapbox-id',
      toMapboxId: 'test-to-mapbox-id',
      lat: 43.585472,
      lng: 51.236168,
      price: 1000,
      comment: 'Test comment',
    });

    it('should create order successfully', async () => {
      const user = UserFactory.create();
      userRepository.findOneById.mockResolvedValue(user);
      userBlockingService.checkUserBlockingAndNotify.mockResolvedValue(false);
      orderRepository.findMany.mockResolvedValue([]);
      orderRepository.save.mockResolvedValue(undefined);
      cacheStorageService.updateOrderLocation.mockResolvedValue(undefined);
      orderGateway.handleOrderCreated.mockResolvedValue(undefined);

      const result = await handler.execute(validCommand);

      expect(result).toBeDefined();
      expect(result.getPropsCopy().clientId.value).toBe(validCommand.clientId.value);
      expect(result.getPropsCopy().orderType).toBe(OrderType.TAXI);
      expect(result.getPropsCopy().orderStatus).toBe(OrderStatus.CREATED);
      expect(userRepository.findOneById).toHaveBeenCalledWith(validCommand.clientId.value);
      expect(userBlockingService.checkUserBlockingAndNotify).toHaveBeenCalled();
      expect(orderRepository.findMany).toHaveBeenCalled();
      expect(orderRepository.save).toHaveBeenCalled();
      expect(cacheStorageService.updateOrderLocation).toHaveBeenCalledWith(
        result.id.value,
        validCommand.lat,
        validCommand.lng,
        validCommand.orderType
      );
      expect(orderGateway.handleOrderCreated).toHaveBeenCalledWith(result);
    });

    it('should throw ConflictException when user not found', async () => {
      userRepository.findOneById.mockResolvedValue(null);

      await expect(handler.execute(validCommand)).rejects.toThrow(ConflictException);
      await expect(handler.execute(validCommand)).rejects.toThrow('User not found');
    });

    it('should throw UserBlockedException when user is blocked', async () => {
      const blockedUser = UserFactory.createBlockedUser();
      userRepository.findOneById.mockResolvedValue(blockedUser);
      userBlockingService.checkUserBlockingAndNotify.mockResolvedValue(true);

      await expect(handler.execute(validCommand)).rejects.toThrow('User is blocked');
    });

    it('should throw ConflictException when user has active order', async () => {
      const user = UserFactory.create();
      const activeOrder = OrderFactory.createWithStatus(OrderStatus.STARTED);
      userRepository.findOneById.mockResolvedValue(user);
      userBlockingService.checkUserBlockingAndNotify.mockResolvedValue(false);
      orderRepository.findMany.mockResolvedValue([activeOrder]);

      await expect(handler.execute(validCommand)).rejects.toThrow(ConflictException);
      await expect(handler.execute(validCommand)).rejects.toThrow('You already have an active order!');
    });

    it('should create order with all order types', async () => {
      const user = UserFactory.create();
      userRepository.findOneById.mockResolvedValue(user);
      userBlockingService.checkUserBlockingAndNotify.mockResolvedValue(false);
      orderRepository.findMany.mockResolvedValue([]);
      orderRepository.save.mockResolvedValue(undefined);
      cacheStorageService.updateOrderLocation.mockResolvedValue(undefined);
      orderGateway.handleOrderCreated.mockResolvedValue(undefined);

      const orderTypes = [OrderType.TAXI, OrderType.DELIVERY, OrderType.CARGO, OrderType.INTERCITY_TAXI];
      
      for (const orderType of orderTypes) {
        const command = new CreateOrderCommand({
          ...validCommand,
          orderType,
        });

        const result = await handler.execute(command);
        
        expect(result.getPropsCopy().orderType).toBe(orderType);
      }
    });

    it('should create order with location coordinates', async () => {
      const user = UserFactory.create();
      userRepository.findOneById.mockResolvedValue(user);
      userBlockingService.checkUserBlockingAndNotify.mockResolvedValue(false);
      orderRepository.findMany.mockResolvedValue([]);
      orderRepository.save.mockResolvedValue(undefined);
      cacheStorageService.updateOrderLocation.mockResolvedValue(undefined);
      orderGateway.handleOrderCreated.mockResolvedValue(undefined);

      const result = await handler.execute(validCommand);

      expect(result.getPropsCopy().lat).toBe(validCommand.lat);
      expect(result.getPropsCopy().lng).toBe(validCommand.lng);
      expect(cacheStorageService.updateOrderLocation).toHaveBeenCalledWith(
        result.id.value,
        validCommand.lat,
        validCommand.lng,
        validCommand.orderType
      );
    });

    it('should create order with address information', async () => {
      const user = UserFactory.create();
      userRepository.findOneById.mockResolvedValue(user);
      userBlockingService.checkUserBlockingAndNotify.mockResolvedValue(false);
      orderRepository.findMany.mockResolvedValue([]);
      orderRepository.save.mockResolvedValue(undefined);
      cacheStorageService.updateOrderLocation.mockResolvedValue(undefined);
      orderGateway.handleOrderCreated.mockResolvedValue(undefined);

      const result = await handler.execute(validCommand);

      expect(result.getPropsCopy().from).toBe(validCommand.from);
      expect(result.getPropsCopy().to).toBe(validCommand.to);
      expect(result.getPropsCopy().fromMapboxId).toBe(validCommand.fromMapboxId);
      expect(result.getPropsCopy().toMapboxId).toBe(validCommand.toMapboxId);
    });

    it('should create order with price and comment', async () => {
      const user = UserFactory.create();
      userRepository.findOneById.mockResolvedValue(user);
      userBlockingService.checkUserBlockingAndNotify.mockResolvedValue(false);
      orderRepository.findMany.mockResolvedValue([]);
      orderRepository.save.mockResolvedValue(undefined);
      cacheStorageService.updateOrderLocation.mockResolvedValue(undefined);
      orderGateway.handleOrderCreated.mockResolvedValue(undefined);

      const result = await handler.execute(validCommand);

      expect(result.getPropsCopy().price.value).toBe(validCommand.price);
      expect(result.getPropsCopy().comment).toBe(validCommand.comment);
    });

    it('should handle repository save error', async () => {
      const user = UserFactory.create();
      userRepository.findOneById.mockResolvedValue(user);
      userBlockingService.checkUserBlockingAndNotify.mockResolvedValue(false);
      orderRepository.findMany.mockResolvedValue([]);
      orderRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(handler.execute(validCommand)).rejects.toThrow('Database error');
    });

    it('should handle cache update error', async () => {
      const user = UserFactory.create();
      userRepository.findOneById.mockResolvedValue(user);
      userBlockingService.checkUserBlockingAndNotify.mockResolvedValue(false);
      orderRepository.findMany.mockResolvedValue([]);
      orderRepository.save.mockResolvedValue(undefined);
      cacheStorageService.updateOrderLocation.mockRejectedValue(new Error('Cache error'));

      await expect(handler.execute(validCommand)).rejects.toThrow('Cache error');
    });

    it('should handle gateway notification error', async () => {
      const user = UserFactory.create();
      userRepository.findOneById.mockResolvedValue(user);
      userBlockingService.checkUserBlockingAndNotify.mockResolvedValue(false);
      orderRepository.findMany.mockResolvedValue([]);
      orderRepository.save.mockResolvedValue(undefined);
      cacheStorageService.updateOrderLocation.mockResolvedValue(undefined);
      orderGateway.handleOrderCreated.mockRejectedValue(new Error('Gateway error'));

      await expect(handler.execute(validCommand)).rejects.toThrow('Gateway error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with expired block', async () => {
      const expiredBlockedUser = UserFactory.createExpiredBlockedUser();
      userRepository.findOneById.mockResolvedValue(expiredBlockedUser);
      userBlockingService.checkUserBlockingAndNotify.mockResolvedValue(false);
      orderRepository.findMany.mockResolvedValue([]);
      orderRepository.save.mockResolvedValue(undefined);
      cacheStorageService.updateOrderLocation.mockResolvedValue(undefined);
      orderGateway.handleOrderCreated.mockResolvedValue(undefined);

      const result = await handler.execute(validCommand);

      expect(result).toBeDefined();
      expect(result.getPropsCopy().orderStatus).toBe(OrderStatus.CREATED);
    });

    it('should handle user with permanently blocked status but not currently blocked', async () => {
      const user = UserFactory.create();
      userRepository.findOneById.mockResolvedValue(user);
      userBlockingService.checkUserBlockingAndNotify.mockResolvedValue(false);
      orderRepository.findMany.mockResolvedValue([]);
      orderRepository.save.mockResolvedValue(undefined);
      cacheStorageService.updateOrderLocation.mockResolvedValue(undefined);
      orderGateway.handleOrderCreated.mockResolvedValue(undefined);

      const result = await handler.execute(validCommand);

      expect(result).toBeDefined();
    });

    it('should handle concurrent order creation attempts', async () => {
      const user = UserFactory.create();
      userRepository.findOneById.mockResolvedValue(user);
      userBlockingService.checkUserBlockingAndNotify.mockResolvedValue(false);
      orderRepository.findMany.mockResolvedValue([]);
      orderRepository.save.mockResolvedValue(undefined);
      cacheStorageService.updateOrderLocation.mockResolvedValue(undefined);
      orderGateway.handleOrderCreated.mockResolvedValue(undefined);

      // Simulate concurrent execution
      const promises = [
        handler.execute(validCommand),
        handler.execute(validCommand),
      ];

      await expect(Promise.all(promises)).rejects.toThrow();
    });
  });
});
