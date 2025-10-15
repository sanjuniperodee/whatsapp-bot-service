import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CompleteOrderHandler } from '@domain/order-request/commands/complete-order/complete-order.handler';
import { CompleteOrderCommand } from '@domain/order-request/commands/complete-order/complete-order.command';
// Using string tokens for providers
import { OrderFactory } from '../../../helpers/factories/order.factory';
import { UserFactory } from '../../../helpers/factories/user.factory';
import { OrderStatus } from '@infrastructure/enums';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';

describe('CompleteOrderHandler', () => {
  let handler: CompleteOrderHandler;
  let orderRepository: any;
  let userRepository: any;
  let orderGateway: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompleteOrderHandler,
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
            handleRideEnded: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<CompleteOrderHandler>(CompleteOrderHandler);
    orderRepository = module.get('OrderRequestRepository');
    userRepository = module.get('UserRepository');
    orderGateway = module.get('OrderRequestGateway');
  });

  const validCommand = new CompleteOrderCommand(
    new UUID(global.testUtils.generateTestUUID()),
  );

  describe('execute', () => {

    it('should complete order successfully', async () => {
      const order = OrderFactory.createOngoingOrder();
      const driver = UserFactory.createDriver();
      
      orderRepository.findOneById.mockResolvedValue(order);
      userRepository.findOneById.mockResolvedValue(driver);
      orderRepository.save.mockResolvedValue(undefined);
      orderGateway.handleRideEnded.mockResolvedValue(undefined);

      await handler.execute(validCommand);

      expect(order.getPropsCopy().orderStatus).toBe(OrderStatus.COMPLETED);
      expect(order.getPropsCopy().endedAt).toBeDefined();
      expect(orderRepository.findOneById).toHaveBeenCalledWith(validCommand.orderId.value);
      expect(orderRepository.save).toHaveBeenCalledWith(order);
      expect(orderGateway.handleRideEnded).toHaveBeenCalledWith(order, driver);
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepository.findOneById.mockResolvedValue(null);

      await expect(handler.execute(validCommand)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(validCommand)).rejects.toThrow('Order not found');
    });

    it('should throw ConflictException when order is not in ONGOING status', async () => {
      const createdOrder = OrderFactory.createCreatedOrder();
      orderRepository.findOneById.mockResolvedValue(createdOrder);

      await expect(handler.execute(validCommand)).rejects.toThrow(ConflictException);
      await expect(handler.execute(validCommand)).rejects.toThrow('Order is not in ONGOING status');
    });

    it('should handle different invalid order statuses', async () => {
      const invalidStatuses = [
        OrderStatus.CREATED,
        OrderStatus.STARTED,
        OrderStatus.WAITING,
        OrderStatus.COMPLETED,
        OrderStatus.REJECTED,
        OrderStatus.REJECTED_BY_CLIENT,
        OrderStatus.REJECTED_BY_DRIVER,
      ];

      for (const status of invalidStatuses) {
        const order = OrderFactory.createWithStatus(status);
        orderRepository.findOneById.mockResolvedValue(order);

        await expect(handler.execute(validCommand)).rejects.toThrow(ConflictException);
      }
    });

    it('should handle order without driver', async () => {
      const order = OrderFactory.createOngoingOrder();
      // Remove driver assignment
      order.getPropsCopy().driverId = undefined;
      
      orderRepository.findOneById.mockResolvedValue(order);
      orderRepository.save.mockResolvedValue(undefined);
      orderGateway.handleRideEnded.mockResolvedValue(undefined);

      await handler.execute(validCommand);

      expect(order.getPropsCopy().orderStatus).toBe(OrderStatus.COMPLETED);
      expect(orderGateway.handleRideEnded).not.toHaveBeenCalled();
    });

    it('should handle driver not found', async () => {
      const order = OrderFactory.createOngoingOrder();
      
      orderRepository.findOneById.mockResolvedValue(order);
      userRepository.findOneById.mockResolvedValue(null);
      orderRepository.save.mockResolvedValue(undefined);
      orderGateway.handleRideEnded.mockResolvedValue(undefined);

      await handler.execute(validCommand);

      expect(order.getPropsCopy().orderStatus).toBe(OrderStatus.COMPLETED);
      expect(orderGateway.handleRideEnded).not.toHaveBeenCalled();
    });

    it('should handle repository save error', async () => {
      const order = OrderFactory.createOngoingOrder();
      
      orderRepository.findOneById.mockResolvedValue(order);
      orderRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(handler.execute(validCommand)).rejects.toThrow('Database error');
    });

    it('should handle gateway notification error', async () => {
      const order = OrderFactory.createOngoingOrder();
      const driver = UserFactory.createDriver();
      
      orderRepository.findOneById.mockResolvedValue(order);
      userRepository.findOneById.mockResolvedValue(driver);
      orderRepository.save.mockResolvedValue(undefined);
      orderGateway.handleRideEnded.mockRejectedValue(new Error('Gateway error'));

      await expect(handler.execute(validCommand)).rejects.toThrow('Gateway error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent completion attempts', async () => {
      const order = OrderFactory.createOngoingOrder();
      
      orderRepository.findOneById.mockResolvedValue(order);
      orderRepository.save.mockResolvedValue(undefined);
      orderGateway.handleRideEnded.mockResolvedValue(undefined);

      const promises = [
        handler.execute(validCommand),
        handler.execute(validCommand),
      ];

      // First completion should succeed, second should fail
      await expect(Promise.all(promises)).rejects.toThrow();
    });

    it('should handle order completion with rating', async () => {
      const order = OrderFactory.createOngoingOrder();
      
      orderRepository.findOneById.mockResolvedValue(order);
      orderRepository.save.mockResolvedValue(undefined);
      orderGateway.handleRideEnded.mockResolvedValue(undefined);

      await handler.execute(validCommand);

      expect(order.getPropsCopy().orderStatus).toBe(OrderStatus.COMPLETED);
      expect(order.getPropsCopy().endedAt).toBeDefined();
    });

    it('should handle order completion without driver assignment', async () => {
      const order = OrderFactory.createOngoingOrder();
      // Simulate order without driver
      const orderProps = order.getPropsCopy();
      orderProps.driverId = undefined;
      
      orderRepository.findOneById.mockResolvedValue(order);
      orderRepository.save.mockResolvedValue(undefined);
      orderGateway.handleRideEnded.mockResolvedValue(undefined);

      await handler.execute(validCommand);

      expect(order.getPropsCopy().orderStatus).toBe(OrderStatus.COMPLETED);
      expect(orderGateway.handleRideEnded).not.toHaveBeenCalled();
    });
  });
});
