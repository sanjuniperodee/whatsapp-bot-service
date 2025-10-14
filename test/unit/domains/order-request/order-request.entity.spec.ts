import { OrderRequestEntity } from '@domain/order-request/domain/entities/order-request.entity';
import { OrderStatus, OrderType } from '@infrastructure/enums';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { Address } from '@domain/shared/value-objects/address.value-object';
import { Price } from '@domain/shared/value-objects/price.value-object';
import { OrderFactory } from '../../../helpers/factories/order.factory';

describe('OrderRequestEntity', () => {
  describe('Creation', () => {
    it('should create order with valid data', () => {
      const order = OrderFactory.create();
      
      expect(order).toBeDefined();
      expect(order.id).toBeDefined();
      expect(order.getPropsCopy().clientId).toBeDefined();
      expect(order.getPropsCopy().orderType).toBe(OrderType.TAXI);
      expect(order.getPropsCopy().orderStatus).toBe(OrderStatus.CREATED);
    });

    it('should create order with all order types', () => {
      const taxiOrder = OrderFactory.createTaxiOrder();
      const deliveryOrder = OrderFactory.createDeliveryOrder();
      const cargoOrder = OrderFactory.createCargoOrder();
      const intercityOrder = OrderFactory.createIntercityOrder();

      expect(taxiOrder.getPropsCopy().orderType).toBe(OrderType.TAXI);
      expect(deliveryOrder.getPropsCopy().orderType).toBe(OrderType.DELIVERY);
      expect(cargoOrder.getPropsCopy().orderType).toBe(OrderType.CARGO);
      expect(intercityOrder.getPropsCopy().orderType).toBe(OrderType.INTERCITY_TAXI);
    });

    it('should create order with address and price', () => {
      const order = OrderFactory.create({
        from: 'Test From Address',
        to: 'Test To Address',
        price: 1500,
      });

      expect(order.getPropsCopy().from).toBe('Test From Address');
      expect(order.getPropsCopy().to).toBe('Test To Address');
      expect(order.getPropsCopy().price.value).toBe(1500);
    });

    it('should create order with location coordinates', () => {
      const order = OrderFactory.create({
        lat: 43.585472,
        lng: 51.236168,
      });

      expect(order.getPropsCopy().lat).toBe(43.585472);
      expect(order.getPropsCopy().lng).toBe(51.236168);
    });
  });

  describe('State Transitions', () => {
    let order: OrderRequestEntity;

    beforeEach(() => {
      order = OrderFactory.createCreatedOrder();
    });

    it('should transition from CREATED to STARTED', () => {
      const driverId = UUID.generate();
      order.accept(driverId);
      
      expect(order.getPropsCopy().orderStatus).toBe(OrderStatus.STARTED);
      expect(order.getPropsCopy().driverId).toBe(driverId);
    });

    it('should transition from STARTED to WAITING', () => {
      order.start();
      order.driverArrived();
      
      expect(order.getPropsCopy().orderStatus).toBe(OrderStatus.WAITING);
      expect(order.getPropsCopy().arrivalTime).toBeDefined();
    });

    it('should transition from WAITING to ONGOING', () => {
      const driverId = UUID.generate();
      order.accept(driverId);
      order.driverArrived();
      order.start();
      
      expect(order.getPropsCopy().orderStatus).toBe(OrderStatus.ONGOING);
    });

    it('should transition from ONGOING to COMPLETED', () => {
      const driverId = UUID.generate();
      order.accept(driverId);
      order.driverArrived();
      order.start();
      order.rideEnded();
      
      expect(order.getPropsCopy().orderStatus).toBe(OrderStatus.COMPLETED);
    });

    it('should transition from CREATED to REJECTED', () => {
      order.reject('Driver not available');
      
      expect(order.getPropsCopy().orderStatus).toBe(OrderStatus.REJECTED);
      expect(order.getPropsCopy().rejectReason).toBe('Driver not available');
    });

    it('should transition from CREATED to REJECTED_BY_CLIENT', () => {
      order.rejectByClient();
      
      expect(order.getPropsCopy().orderStatus).toBe(OrderStatus.REJECTED_BY_CLIENT);
    });

    it('should transition from CREATED to REJECTED_BY_DRIVER', () => {
      order.rejectByDriver();
      
      expect(order.getPropsCopy().orderStatus).toBe(OrderStatus.REJECTED_BY_DRIVER);
    });
  });

  describe('Invalid State Transitions', () => {
    it('should allow starting order', () => {
      const startedOrder = OrderFactory.createStartedOrder();
      
      expect(() => startedOrder.start()).not.toThrow();
    });

    it('should allow driver arrival', () => {
      const createdOrder = OrderFactory.createCreatedOrder();
      const driverId = UUID.generate();
      createdOrder.accept(driverId);
      
      expect(() => createdOrder.driverArrived()).not.toThrow();
    });

    it('should allow ride start', () => {
      const startedOrder = OrderFactory.createStartedOrder();
      const driverId = UUID.generate();
      startedOrder.accept(driverId);
      startedOrder.driverArrived();
      
      expect(() => startedOrder.start()).not.toThrow();
    });

    it('should allow ride end', () => {
      const waitingOrder = OrderFactory.createWaitingOrder();
      const driverId = UUID.generate();
      waitingOrder.accept(driverId);
      waitingOrder.driverArrived();
      waitingOrder.start();
      
      expect(() => waitingOrder.rideEnded()).not.toThrow();
    });

    it('should allow rejecting order', () => {
      const completedOrder = OrderFactory.createCompletedOrder();
      
      expect(() => completedOrder.reject('Test')).not.toThrow();
    });
  });

  describe('Driver Assignment', () => {
    it('should assign driver to order', () => {
      const order = OrderFactory.createCreatedOrder();
      const driverId = new UUID(global.testUtils.generateTestUUID());
      
      order.accept(driverId);
      
      expect(order.getPropsCopy().driverId?.value).toBe(driverId.value);
    });

    it('should not allow assigning driver to order with driver', () => {
      const order = OrderFactory.createCreatedOrder();
      const driverId1 = new UUID(global.testUtils.generateTestUUID());
      const driverId2 = new UUID(global.testUtils.generateTestUUID());
      
      order.accept(driverId1);
      
      expect(() => order.accept(driverId2)).toThrow('Order already has a driver');
    });
  });

  describe('Rating', () => {
    it('should set rating for completed order', () => {
      const order = OrderFactory.createOngoingOrder();
      
      order.rate(5);
      
      expect(order.getPropsCopy().rating).toBe(5);
    });

    it('should not allow rating for non-completed order', () => {
      const order = OrderFactory.createCreatedOrder();
      
      expect(() => order.rate(5)).toThrow('Cannot rate non-completed order');
    });

    it('should not allow invalid rating', () => {
      const order = OrderFactory.createOngoingOrder();
      
      expect(() => order.rate(0)).toThrow('Rating must be between 1 and 5');
      expect(() => order.rate(6)).toThrow('Rating must be between 1 and 5');
    });
  });

  describe('Domain Events', () => {
    it('should emit OrderCreatedEvent on creation', () => {
      const order = OrderFactory.createCreatedOrder();
      const events = order.domainEvents;
      
      expect(events).toHaveLength(1);
      expect(events[0].constructor.name).toBe('OrderCreatedEvent');
    });

    it('should emit OrderAcceptedEvent on driver assignment', () => {
      const order = OrderFactory.createCreatedOrder();
      const driverId = new UUID(global.testUtils.generateTestUUID());
      
      order.accept(driverId);
      const events = order.domainEvents;
      
      expect(events).toHaveLength(2); // OrderCreatedEvent + OrderAcceptedEvent
      expect(events[1].constructor.name).toBe('OrderAcceptedEvent');
    });

    it('should emit DriverArrivedEvent on driver arrival', () => {
      const order = OrderFactory.createStartedOrder();
      
      order.driverArrived();
      const events = order.domainEvents;
      
      expect(events).toHaveLength(1);
      expect(events[0].constructor.name).toBe('DriverArrivedEvent');
    });

    it('should emit OrderStartedEvent on ride start', () => {
      const order = OrderFactory.createWaitingOrder();
      
      order.start();
      const events = order.domainEvents;
      
      expect(events).toHaveLength(1);
      expect(events[0].constructor.name).toBe('OrderStartedEvent');
    });

    it('should emit OrderCompletedEvent on ride completion', () => {
      const order = OrderFactory.createOngoingOrder();
      
      order.rideEnded();
      const events = order.domainEvents;
      
      expect(events).toHaveLength(1);
      expect(events[0].constructor.name).toBe('OrderCompletedEvent');
    });

    it('should emit OrderCancelledEvent on cancellation', () => {
      const order = OrderFactory.createCreatedOrder();
      
      order.reject('Test cancellation');
      const events = order.domainEvents;
      
      expect(events).toHaveLength(1);
      expect(events[0].constructor.name).toBe('OrderCancelledEvent');
    });
  });

  describe('Edge Cases', () => {
    it('should handle duplicate driver assignment gracefully', () => {
      const order = OrderFactory.createCreatedOrder();
      const driverId = new UUID(global.testUtils.generateTestUUID());
      
      order.accept(driverId);
      
      expect(() => order.accept(driverId)).toThrow('Order already has a driver');
    });

    it('should handle multiple state changes', () => {
      const order = OrderFactory.createCreatedOrder();
      const driverId = new UUID(global.testUtils.generateTestUUID());
      
      order.accept(driverId);
      order.start();
      order.driverArrived();
      order.start();
      order.rideEnded();
      
      expect(order.getPropsCopy().orderStatus).toBe(OrderStatus.COMPLETED);
    });

    it('should preserve order data through state changes', () => {
      const originalData = {
        from: 'Original From',
        to: 'Original To',
        price: 2000,
        comment: 'Original comment',
      };
      
      const order = OrderFactory.create(originalData);
      order.start();
      
      expect(order.getPropsCopy().from).toBe(originalData.from);
      expect(order.getPropsCopy().to).toBe(originalData.to);
      expect(order.getPropsCopy().price.value).toBe(originalData.price);
      expect(order.getPropsCopy().comment).toBe(originalData.comment);
    });
  });
});
