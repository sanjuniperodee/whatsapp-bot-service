import { ObjectionEntityBase } from '@libs/ddd/infrastructure/database/objection.entity.base';
import { Model } from 'objection';
import { OrderStatus, OrderType } from '@infrastructure/enums';

export class OrderRequestOrmEntity extends ObjectionEntityBase {
  static create(data: Omit<OrderRequestOrmEntity, keyof Model>) {
    return OrderRequestOrmEntity.fromJson(data);
  }
  static tableName = 'order_request';

  driverId?: string;
  user_phone?: string;
  orderType: OrderType;
  orderStatus: OrderStatus;
  from: string;
  to: string;
  startTime?: Date;
  arrivalTime?: Date;
  lat?: number;
  lng?: number;
  comment?: string;
  rejectReason?: string;

  static get jsonSchema() {
    return {
      type: 'object',
      properties: {
        guarantors: { type: 'array' },
      },
    };
  }
}
