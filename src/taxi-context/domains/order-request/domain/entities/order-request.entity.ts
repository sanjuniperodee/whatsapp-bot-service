import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { AggregateRoot } from '@libs/ddd/domain/base-classes/aggregate-root.base';
import { ArgumentInvalidException } from '@libs/exceptions';
import { OrderStatus, OrderType } from '@infrastructure/enums';
import { UserEntity } from '@domain/user/domain/entities/user.entity';
import { OrderCreatedEvent } from '../events/order-created.event';
import { OrderAcceptedEvent } from '../events/order-accepted.event';
import { DriverArrivedEvent } from '../events/driver-arrived.event';
import { OrderStartedEvent } from '../events/order-started.event';
import { OrderCompletedEvent } from '../events/order-completed.event';
import { OrderCancelledEvent } from '../events/order-cancelled.event';
import { Price } from '@domain/shared/value-objects/price.value-object';
import { Location } from '@domain/shared/value-objects/location.value-object';
import { Address } from '@domain/shared/value-objects/address.value-object';

export interface CreateOrderRequestProps {
  driverId?: UUID;
  clientId: UUID;
  orderType: OrderType;
  orderStatus: OrderStatus,
  address: Address,
  from: string;
  to: string;
  fromMapboxId: string;
  toMapboxId: string;
  lat: number;
  lng: number;
  startTime?: Date;
  arrivalTime?: Date;
  location?: Location;
  price: Price,
  comment?: string;
}

export type OrderRequestProps = CreateOrderRequestProps & {
  rejectReason?: string;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
  endedAt?: Date;
  client?: UserEntity;
  driver?: UserEntity;
};

export class OrderRequestEntity extends AggregateRoot<OrderRequestProps> {
  protected readonly _id: UUID;

  static create({
      driverId,
      clientId,
      orderType,
      orderStatus,
      from,
      to,
      fromMapboxId,
      toMapboxId,
      lat,
      lng,
      startTime,
      arrivalTime,
      address,
      location,
      price,
      comment,
    }: CreateOrderRequestProps): OrderRequestEntity {
    const id = UUID.generate();

    const props: OrderRequestProps = {
      driverId,
      clientId,
      orderType,
      orderStatus,
      from,
      to,
      fromMapboxId,
      toMapboxId,
      lat,
      lng,
      address,
      startTime,
      arrivalTime,
      location,
      comment,
      price,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const entity = new OrderRequestEntity({ id, props });
    
    // Добавляем событие создания заказа
    entity.addEvent(new OrderCreatedEvent(
      id.value,
      orderType,
      clientId.value,
      from,
      to,
      lat,
      lng,
      price.value,
      comment
    ));
    
    return entity;
  }

  get id() {
    return this._id;
  }

  get comment() {
    return this.props.comment;
  }

  get client() {
    return this.props.client;
  }

  get driver() {
    return this.props.driver;
  }

  reject(reason: string) {
    this.props.orderStatus = OrderStatus.REJECTED;
    this.props.rejectReason = reason;

    this.validate();
  }

  rate(rating: number, comment?: string){
    this.props.rating = rating;
    this.props.comment = comment;
  }

  accept(driverId: UUID) {
    this.props.driverId = driverId;
    this.props.orderStatus = OrderStatus.STARTED;

    // Добавляем событие принятия заказа
    this.addEvent(new OrderAcceptedEvent(
      this.id.value,
      driverId.value,
      this.props.clientId.value
    ));

    this.validate();
  }

  driverArrived() {
    this.props.orderStatus = OrderStatus.WAITING;
    this.props.updatedAt = new Date();

    // Добавляем событие прибытия водителя
    this.addEvent(new DriverArrivedEvent(
      this.id.value,
      this.props.driverId!.value,
      this.props.clientId.value
    ));
  }

  start(){
    this.props.orderStatus = OrderStatus.ONGOING;
    this.props.updatedAt = new Date();

    // Добавляем событие начала поездки
    this.addEvent(new OrderStartedEvent(
      this.id.value,
      this.props.driverId!.value,
      this.props.clientId.value
    ));
  }

  rejectByClient(){
    this.props.orderStatus = OrderStatus.REJECTED_BY_CLIENT;
    this.props.updatedAt = new Date();

    // Добавляем событие отмены заказа клиентом
    this.addEvent(new OrderCancelledEvent(
      this.id.value,
      this.props.clientId.value,
      this.props.driverId?.value,
      'cancelled_by_client'
    ));
  }

  rejectByDriver(){
    this.props.orderStatus = OrderStatus.REJECTED_BY_DRIVER;
    this.props.updatedAt = new Date();

    // Добавляем событие отмены заказа водителем
    this.addEvent(new OrderCancelledEvent(
      this.id.value,
      this.props.clientId.value,
      this.props.driverId?.value,
      'cancelled_by_driver'
    ));
  }

  rideEnded() {
    this.props.orderStatus = OrderStatus.COMPLETED;
    this.props.updatedAt = new Date();

    // Добавляем событие завершения поездки
    this.addEvent(new OrderCompletedEvent(
      this.id.value,
      this.props.driverId!.value,
      this.props.clientId.value,
      this.props.price.value
    ));
  }

  validate(): void {
    const { clientId, orderType } = this.props;

    const fields = [clientId, orderType];

    if (fields.some((f) => f == null)) {
      throw new ArgumentInvalidException('Order must have all required fields');
    }
  }
}
