import { Test, TestingModule } from '@nestjs/testing';
import { OrderCreatedHandler } from '@domain/order-request/event-handlers/order-created.handler';
import { OrderRequestGateway } from '@infrastructure/websocket/order-request.gateway';
import { OrderRequestEntity } from '@domain/order-request/entities/order-request.entity';
import { UserId } from '@libs/ddd/value-objects/user-id.value-object';
import { Phone } from '@libs/ddd/value-objects/phone.value-object';
import { Address } from '@libs/ddd/value-objects/address.value-object';
import { Price } from '@libs/ddd/value-objects/price.value-object';
import { OrderCreatedEvent } from '@domain/order-request/events/order-created.event';

describe('OrderCreatedHandler Unit Tests', () => {
  let handler: OrderCreatedHandler;
  let gateway: jest.Mocked<OrderRequestGateway>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderCreatedHandler,
        {
          provide: OrderRequestGateway,
          useValue: {
            broadcastOrderToNearbyDrivers: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<OrderCreatedHandler>(OrderCreatedHandler);
    gateway = module.get(OrderRequestGateway);
  });

  describe('handle', () => {
    it('should broadcast order to nearby drivers', async () => {
      const order = OrderRequestEntity.create({
        clientId: new UserId('client-123'),
        fromAddress: new Address('Test From Address'),
        toAddress: new Address('Test To Address'),
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1,
        price: new Price(1000),
      });

      const event = new OrderCreatedEvent(order);

      await handler.handle(event);

      expect(gateway.broadcastOrderToNearbyDrivers).toHaveBeenCalledWith(order);
    });

    it('should handle broadcast errors gracefully', async () => {
      const order = OrderRequestEntity.create({
        clientId: new UserId('client-123'),
        fromAddress: new Address('Test From Address'),
        toAddress: new Address('Test To Address'),
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1,
        price: new Price(1000),
      });

      const event = new OrderCreatedEvent(order);
      gateway.broadcastOrderToNearbyDrivers.mockRejectedValue(new Error('Broadcast failed'));

      await expect(handler.handle(event)).resolves.not.toThrow();
    });

    it('should handle null order gracefully', async () => {
      const event = new OrderCreatedEvent(null as any);

      await expect(handler.handle(event)).resolves.not.toThrow();
    });
  });
});
