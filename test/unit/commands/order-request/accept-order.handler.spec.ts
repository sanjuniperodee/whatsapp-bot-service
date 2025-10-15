import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { AcceptOrderHandler } from '@domain/order-request/commands/accept-order/accept-order.handler';
import { AcceptOrderCommand } from '@domain/order-request/commands/accept-order/accept-order.command';
// Using string tokens for providers
import { OrderFactory } from '../../../helpers/factories/order.factory';
import { UserFactory } from '../../../helpers/factories/user.factory';
import { OrderStatus } from '@infrastructure/enums';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';

describe('AcceptOrderHandler', () => {
  let handler: AcceptOrderHandler;
  let orderRepository: any;
  let userRepository: any;
  let orderGateway: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcceptOrderHandler,
        {
          provide: 'OrderRequestRepository',
          useValue: {
            findOneById: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: 'UserRepository',
          useValue: {
            findOneById: jest.fn(),
          },
        },
        {
          provide: 'OrderRequestGateway',
          useValue: {
            handleOrderAccepted: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<AcceptOrderHandler>(AcceptOrderHandler);
    orderRepository = module.get('OrderRequestRepository');
    userRepository = module.get('UserRepository');
    orderGateway = module.get('OrderRequestGateway');
  });

  const validCommand = new AcceptOrderCommand(
    new UUID(global.testUtils.generateTestUUID()),
    new UUID(global.testUtils.generateTestUUID()),
  );

  describe('execute', () => {

    it('should accept order successfully', async () => {
      const order = OrderFactory.createCreatedOrder();
      const driver = UserFactory.createDriver();
      
      orderRepository.findOneById.mockResolvedValue(order);
      userRepository.findOneById.mockResolvedValue(driver);
      orderRepository.save.mockResolvedValue(undefined);
      orderGateway.handleOrderAccepted.mockResolvedValue(undefined);

      await handler.execute(validCommand);

      expect(order.getPropsCopy().driverId?.value).toBe(validCommand.driverId.value);
      expect(order.getPropsCopy().orderStatus).toBe(OrderStatus.STARTED);
      expect(orderRepository.findOneById).toHaveBeenCalledWith(validCommand.orderId.value);
      expect(userRepository.findOneById).toHaveBeenCalledWith(validCommand.driverId.value);
      expect(orderRepository.save).toHaveBeenCalledWith(order);
      expect(orderGateway.handleOrderAccepted).toHaveBeenCalledWith(order, driver);
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepository.findOneById.mockResolvedValue(null);

      await expect(handler.execute(validCommand)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(validCommand)).rejects.toThrow('Order not found');
    });

    it('should throw ConflictException when order is not in CREATED status', async () => {
      const startedOrder = OrderFactory.createStartedOrder();
      orderRepository.findOneById.mockResolvedValue(startedOrder);

      await expect(handler.execute(validCommand)).rejects.toThrow(ConflictException);
      await expect(handler.execute(validCommand)).rejects.toThrow('Order is not in CREATED status');
    });

    it('should throw ConflictException when order already has driver', async () => {
      const order = OrderFactory.createCreatedOrder();
      const existingDriverId = new UUID(global.testUtils.generateTestUUID());
      order.accept(existingDriverId);
      
      orderRepository.findOneById.mockResolvedValue(order);

      await expect(handler.execute(validCommand)).rejects.toThrow(ConflictException);
      await expect(handler.execute(validCommand)).rejects.toThrow('Order already has a driver');
    });

    it('should throw NotFoundException when driver not found', async () => {
      const order = OrderFactory.createCreatedOrder();
      orderRepository.findOneById.mockResolvedValue(order);
      userRepository.findOneById.mockResolvedValue(null);

      await expect(handler.execute(validCommand)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(validCommand)).rejects.toThrow('Driver not found');
    });

    it('should handle different order statuses correctly', async () => {
      const statuses = [
        OrderStatus.STARTED,
        OrderStatus.WAITING,
        OrderStatus.ONGOING,
        OrderStatus.COMPLETED,
        OrderStatus.REJECTED,
        OrderStatus.REJECTED_BY_CLIENT,
        OrderStatus.REJECTED_BY_DRIVER,
      ];

      for (const status of statuses) {
        const order = OrderFactory.createWithStatus(status);
        orderRepository.findOneById.mockResolvedValue(order);

        await expect(handler.execute(validCommand)).rejects.toThrow(ConflictException);
      }
    });

    it('should handle repository save error', async () => {
      const order = OrderFactory.createCreatedOrder();
      const driver = UserFactory.createDriver();
      
      orderRepository.findOneById.mockResolvedValue(order);
      userRepository.findOneById.mockResolvedValue(driver);
      orderRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(handler.execute(validCommand)).rejects.toThrow('Database error');
    });

    it('should handle gateway notification error', async () => {
      const order = OrderFactory.createCreatedOrder();
      const driver = UserFactory.createDriver();
      
      orderRepository.findOneById.mockResolvedValue(order);
      userRepository.findOneById.mockResolvedValue(driver);
      orderRepository.save.mockResolvedValue(undefined);
      orderGateway.handleOrderAccepted.mockRejectedValue(new Error('Gateway error'));

      await expect(handler.execute(validCommand)).rejects.toThrow('Gateway error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent order acceptance', async () => {
      const order = OrderFactory.createCreatedOrder();
      const driver = UserFactory.createDriver();
      
      orderRepository.findOneById.mockResolvedValue(order);
      userRepository.findOneById.mockResolvedValue(driver);
      orderRepository.save.mockResolvedValue(undefined);
      orderGateway.handleOrderAccepted.mockResolvedValue(undefined);

      const command1 = new AcceptOrderCommand(
        validCommand.orderId,
        new UUID(global.testUtils.generateTestUUID()),
      );
      
      const command2 = new AcceptOrderCommand(
        validCommand.orderId,
        new UUID(global.testUtils.generateTestUUID()),
      );

      // First acceptance should succeed
      await handler.execute(command1);
      
      // Second acceptance should fail
      await expect(handler.execute(command2)).rejects.toThrow(ConflictException);
    });

    it('should handle driver accepting their own order', async () => {
      const driver = UserFactory.createDriver();
      const order = OrderFactory.createCreatedOrder();
      
      orderRepository.findOneById.mockResolvedValue(order);
      userRepository.findOneById.mockResolvedValue(driver);
      orderRepository.save.mockResolvedValue(undefined);
      orderGateway.handleOrderAccepted.mockResolvedValue(undefined);

      const command = new AcceptOrderCommand(
        order.id,
        new UUID(driver.id.value),
      );

      await handler.execute(command);

      expect(order.getPropsCopy().driverId?.value).toBe(driver.id.value);
    });

    it('should handle order with invalid driver ID', async () => {
      const order = OrderFactory.createCreatedOrder();
      orderRepository.findOneById.mockResolvedValue(order);
      userRepository.findOneById.mockResolvedValue(null);

      await expect(handler.execute(validCommand)).rejects.toThrow(NotFoundException);
    });
  });
});
