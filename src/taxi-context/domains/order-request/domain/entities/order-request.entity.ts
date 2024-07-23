import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { AggregateRoot } from '@libs/ddd/domain/base-classes/aggregate-root.base';
import { ArgumentInvalidException } from '@libs/exceptions';

export interface CreateOrderRequestProps {
  driverId?: UUID;
  user_phone?: string;
  orderType: string;
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
                  startTime,
                  arrivalTime,
                  lat,
                  lng,
                  comment,
                }: CreateOrderRequestProps): OrderRequestEntity {
    const id = UUID.generate();

    const props: OrderRequestProps = {
      driverId,
      user_phone,
      orderType,
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

  validate(): void {
    const { user_phone, orderType } = this.props;

    const fields = [user_phone, orderType];

    if (fields.some((f) => f == null)) {
      throw new ArgumentInvalidException('Order must have all required fields');
    }
  }
}
