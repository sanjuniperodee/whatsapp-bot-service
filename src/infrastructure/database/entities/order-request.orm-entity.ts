import { ObjectionEntityBase } from '@libs/ddd/infrastructure/database/objection.entity.base';
import { Model } from 'objection';

export class OrderRequestOrmEntity extends ObjectionEntityBase {
  static create(data: Omit<OrderRequestOrmEntity, keyof Model>) {
    return OrderRequestOrmEntity.fromJson(data);
  }
  static tableName = 'users';

  driverId: string;
  orderType: string;
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