import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { AggregateRoot } from '@libs/ddd/domain/base-classes/aggregate-root.base';
import { ArgumentInvalidException } from '@libs/exceptions';

export interface CreateOrderRequestProps {
  driverId: UUID;
  orderType: string;
  startTime?: Date;
  arrivalTime?: Date;
  lat?: number;
  lng?: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderRequestProps = CreateOrderRequestProps & {
  rejectReason?: string
};

export class OrderRequestEntity extends AggregateRoot<OrderRequestProps> {
  protected readonly _id: UUID;

  static create({
                  driverId,
                  orderType,
                  startTime,
                  arrivalTime,
                  lat,
                  lng,
                  comment,
                  createdAt,
                  updatedAt,
                }: CreateOrderRequestProps): OrderRequestEntity {
    const id = UUID.generate();

    const props: OrderRequestProps = {
      driverId,
      orderType,
      startTime,
      arrivalTime,
      lat,
      lng,
      comment,
      createdAt,
      updatedAt,
    };

    return new OrderRequestEntity({ id, props });
  }

  get id() {
    return this._id;
  }

  get comment() {
    return this.props.comment;
  }

  validate(): void {
    const { driverId, orderType } = this.props;

    const fields = [driverId, orderType];

    if (fields.some((f) => f == null)) {
      throw new ArgumentInvalidException('Order must have all required fields');
    }
  }
}
