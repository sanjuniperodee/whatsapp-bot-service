import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { AggregateRoot } from '@libs/ddd/domain/base-classes/aggregate-root.base';
import { ArgumentInvalidException } from '@libs/exceptions';
import { OrderStatus, OrderType } from '@infrastructure/enums';

export interface CreateOrderRequestProps {
  driverId?: UUID;
  user_phone?: string;
  orderType: OrderType;
  orderStatus: OrderStatus,
  from: string,
  to: string,
  startTime?: Date;
  arrivalTime?: Date;
  lat?: number;
  lng?: number;
  comment?: string;
}

export type OrderRequestProps = CreateOrderRequestProps & {
  rejectReason?: string
  createdAt: Date;
  updatedAt: Date;
};

export class OrderRequestEntity extends AggregateRoot<OrderRequestProps> {
  protected readonly _id: UUID;

  static create({
      driverId,
      user_phone,
      orderType,
      orderStatus,
      startTime,
      arrivalTime,
      from,
      to,
      lat,
      lng,
      comment,
    }: CreateOrderRequestProps): OrderRequestEntity {
    const id = UUID.generate();

    const props: OrderRequestProps = {
      driverId,
      user_phone,
      orderType,
      orderStatus,
      from,
      to,
      startTime,
      arrivalTime,
      lat,
      lng,
      comment,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return new OrderRequestEntity({ id, props });
  }

  get id() {
    return this._id;
  }

  get comment() {
    return this.props.comment;
  }

  reject(reason: string) {
    this.props.orderStatus = OrderStatus.REJECTED;
    this.props.rejectReason = reason;

    this.validate();
  }

  accept(driverId: UUID) {
    this.props.driverId = driverId;
    this.props.orderStatus = OrderStatus.STARTED;

    this.validate();
  }

  driverArrived() {
    this.props.orderStatus = OrderStatus.WAITING;
    this.props.updatedAt = new Date();
  }

  rideEnded() {
    this.props.orderStatus = OrderStatus.COMPLETED;
    this.props.updatedAt = new Date();
  }

  validate(): void {
    const { user_phone, orderType } = this.props;

    const fields = [user_phone, orderType];

    if (fields.some((f) => f == null)) {
      throw new ArgumentInvalidException('Order must have all required fields');
    }
  }
}
