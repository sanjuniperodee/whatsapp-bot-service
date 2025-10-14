import { Test, TestingModule } from '@nestjs/testing';
import { OrderAcceptedHandler } from '@domain/order-request/event-handlers/order-accepted.handler';
import { OrderRequestGateway } from '@infrastructure/websocket/order-request.gateway';
import { NotificationService } from '@modules/firebase/notification.service';
import { OrderRequestEntity } from '@domain/order-request/entities/order-request.entity';
import { UserId } from '@libs/ddd/value-objects/user-id.value-object';
import { Phone } from '@libs/ddd/value-objects/phone.value-object';
import { Address } from '@libs/ddd/value-objects/address.value-object';
import { Price } from '@libs/ddd/value-objects/price.value-object';
import { OrderAcceptedEvent } from '@domain/order-request/events/order-accepted.event';
import { MockFirebaseService } from '../../helpers/mocks/firebase.service.mock';

describe('OrderAcceptedHandler Unit Tests', () => {
  let handler: OrderAcceptedHandler;
  let gateway: jest.Mocked<OrderRequestGateway>;
  let notificationService: jest.Mocked<NotificationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderAcceptedHandler,
        {
          provide: OrderRequestGateway,
          useValue: {
            notifyClientOrderAccepted: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: new MockFirebaseService(),
        },
      ],
    }).compile();

    handler = module.get<OrderAcceptedHandler>(OrderAcceptedHandler);
    gateway = module.get(OrderRequestGateway);
    notificationService = module.get(NotificationService);
  });

  describe('handle', () => {
    it('should notify client and send push notification', async () => {
      const order = OrderRequestEntity.create({
        clientId: new UserId('client-123'),
        fromAddress: new Address('Test From Address'),
        toAddress: new Address('Test To Address'),
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1,
        price: new Price(1000),
      });

      const driverId = new UserId('driver-123');
      const event = new OrderAcceptedEvent(order, driverId);

      await handler.handle(event);

      expect(gateway.notifyClientOrderAccepted).toHaveBeenCalledWith(order, driverId);
      expect(notificationService.sendNotificationByUserId).toHaveBeenCalledWith(
        'Заказ принят',
        expect.stringContaining('Ваш заказ принят водителем'),
        'client-123'
      );
    });

    it('should handle gateway errors gracefully', async () => {
      const order = OrderRequestEntity.create({
        clientId: new UserId('client-123'),
        fromAddress: new Address('Test From Address'),
        toAddress: new Address('Test To Address'),
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1,
        price: new Price(1000),
      });

      const driverId = new UserId('driver-123');
      const event = new OrderAcceptedEvent(order, driverId);
      gateway.notifyClientOrderAccepted.mockRejectedValue(new Error('Gateway failed'));

      await expect(handler.handle(event)).resolves.not.toThrow();
    });

    it('should handle notification service errors gracefully', async () => {
      const order = OrderRequestEntity.create({
        clientId: new UserId('client-123'),
        fromAddress: new Address('Test From Address'),
        toAddress: new Address('Test To Address'),
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1,
        price: new Price(1000),
      });

      const driverId = new UserId('driver-123');
      const event = new OrderAcceptedEvent(order, driverId);
      notificationService.sendNotificationByUserId.mockRejectedValue(new Error('Notification failed'));

      await expect(handler.handle(event)).resolves.not.toThrow();
    });
  });
});
