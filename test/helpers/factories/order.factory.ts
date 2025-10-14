import { OrderRequestEntity } from '@domain/order-request/domain/entities/order-request.entity';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { Address } from '@domain/shared/value-objects/address.value-object';
import { Price } from '@domain/shared/value-objects/price.value-object';
import { OrderStatus, OrderType } from '@infrastructure/enums';

export interface CreateOrderProps {
  clientId?: UUID;
  driverId?: UUID;
  orderType?: OrderType;
  orderStatus?: OrderStatus;
  from?: string;
  to?: string;
  fromMapboxId?: string;
  toMapboxId?: string;
  lat?: number;
  lng?: number;
  price?: number;
  comment?: string;
  startTime?: Date;
  arrivalTime?: Date;
}

export class OrderFactory {
  static create(props: CreateOrderProps = {}): OrderRequestEntity {
    const {
      clientId = new UUID(global.testUtils.generateTestUUID()),
      driverId,
      orderType = OrderType.TAXI,
      orderStatus = OrderStatus.CREATED,
      from = 'Test From Address',
      to = 'Test To Address',
      fromMapboxId = 'test-from-mapbox-id',
      toMapboxId = 'test-to-mapbox-id',
      lat = 43.585472,
      lng = 51.236168,
      price = 1000,
      comment = 'Test order comment',
      startTime,
      arrivalTime,
    } = props;

    return OrderRequestEntity.create({
      clientId,
      driverId,
      orderType,
      orderStatus,
      address: new Address({ from, to }),
      from,
      to,
      fromMapboxId,
      toMapboxId,
      lat,
      lng,
      price: new Price({ value: price }),
      comment,
      startTime,
      arrivalTime,
    });
  }

  static createTaxiOrder(props: CreateOrderProps = {}): OrderRequestEntity {
    return this.create({
      orderType: OrderType.TAXI,
      ...props,
    });
  }

  static createDeliveryOrder(props: CreateOrderProps = {}): OrderRequestEntity {
    return this.create({
      orderType: OrderType.DELIVERY,
      ...props,
    });
  }

  static createCargoOrder(props: CreateOrderProps = {}): OrderRequestEntity {
    return this.create({
      orderType: OrderType.CARGO,
      ...props,
    });
  }

  static createIntercityOrder(props: CreateOrderProps = {}): OrderRequestEntity {
    return this.create({
      orderType: OrderType.INTERCITY_TAXI,
      ...props,
    });
  }

  static createWithStatus(status: OrderStatus, props: CreateOrderProps = {}): OrderRequestEntity {
    return this.create({
      orderStatus: status,
      ...props,
    });
  }

  static createCreatedOrder(props: CreateOrderProps = {}): OrderRequestEntity {
    return this.createWithStatus(OrderStatus.CREATED, props);
  }

  static createStartedOrder(props: CreateOrderProps = {}): OrderRequestEntity {
    return this.createWithStatus(OrderStatus.STARTED, props);
  }

  static createWaitingOrder(props: CreateOrderProps = {}): OrderRequestEntity {
    return this.createWithStatus(OrderStatus.WAITING, props);
  }

  static createOngoingOrder(props: CreateOrderProps = {}): OrderRequestEntity {
    return this.createWithStatus(OrderStatus.ONGOING, props);
  }

  static createCompletedOrder(props: CreateOrderProps = {}): OrderRequestEntity {
    return this.createWithStatus(OrderStatus.COMPLETED, props);
  }

  static createRejectedOrder(props: CreateOrderProps = {}): OrderRequestEntity {
    return this.createWithStatus(OrderStatus.REJECTED, props);
  }

  static createRejectedByClientOrder(props: CreateOrderProps = {}): OrderRequestEntity {
    return this.createWithStatus(OrderStatus.REJECTED_BY_CLIENT, props);
  }

  static createRejectedByDriverOrder(props: CreateOrderProps = {}): OrderRequestEntity {
    return this.createWithStatus(OrderStatus.REJECTED_BY_DRIVER, props);
  }
}
