import { ObjectionEntityBase } from '@libs/ddd/infrastructure/database/objection.entity.base';
import { Model, RelationMappingsThunk } from 'objection';
import { OrderStatus, OrderType } from '@infrastructure/enums';
import { UserOrmEntity } from './user.orm-entity';

export class OrderRequestOrmEntity extends ObjectionEntityBase {
  static create(data: Omit<OrderRequestOrmEntity, keyof Model>) {
    return OrderRequestOrmEntity.fromJson(data);
  }
  static tableName = 'order_request';

  driverId?: string;
  clientId: string;
  orderType: OrderType;
  orderStatus: OrderStatus;
  from: string;
  to: string;
  fromMapboxId: string;
  toMapboxId: string;
  startTime?: Date;
  arrivalTime?: Date;
  lat?: number;
  lng?: number;
  price: number;
  comment?: string;
  rejectReason?: string;
  endedAt?: Date;
  rating?: number;

  // Relations
  client?: UserOrmEntity;
  driver?: UserOrmEntity;

  static relationMappings: RelationMappingsThunk = () => {
    return {
      client: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserOrmEntity,
        join: {
          from: `${OrderRequestOrmEntity.tableName}.clientId`,
          to: `${UserOrmEntity.tableName}.id`,
        },
      },
      driver: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserOrmEntity,
        join: {
          from: `${OrderRequestOrmEntity.tableName}.driverId`,
          to: `${UserOrmEntity.tableName}.id`,
        },
      },
    };
  };

  static get jsonSchema() {
    return {
      type: 'object',
      properties: {
        guarantors: { type: 'array' },
      },
    };
  }
}
