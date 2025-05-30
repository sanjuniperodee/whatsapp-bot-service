import { ObjectionEntityBase } from '@libs/ddd/infrastructure/database/objection.entity.base';
import { Model, RelationMappingsThunk } from 'objection';
import { CategoryLicenseOrmEntity } from '@infrastructure/database/entities/category-license.orm-entity';
import { OrderRequestOrmEntity } from '@infrastructure/database/entities/order-request.orm-entity';

export class UserOrmEntity extends ObjectionEntityBase {
  static create(data: Omit<UserOrmEntity, keyof Model>) {
    return UserOrmEntity.fromJson(data);
  }
  static tableName = 'users';

  phone: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  lastSms?: string;
  deviceToken?: string;
  isBlocked: boolean;
  blockedUntil?: Date;
  blockReason?: string;

  categoryLicenses?: CategoryLicenseOrmEntity[]
  orders?: OrderRequestOrmEntity[]
  orders_as_driver?: OrderRequestOrmEntity[]

  static relationMappings: RelationMappingsThunk = () => {
    return {
      categoryLicenses: {
        relation: Model.HasManyRelation,
        modelClass: CategoryLicenseOrmEntity,
        join: {
          from: `${UserOrmEntity.tableName}.id`,
          to: `${CategoryLicenseOrmEntity.tableName}.driverId`,
        },
      },
      orders: {
        relation: Model.HasManyRelation,
        modelClass: OrderRequestOrmEntity,
        join: {
          from: `${UserOrmEntity.tableName}.id`,
          to: `${OrderRequestOrmEntity.tableName}.clientId`,
        },
      },
      orders_as_driver: {
        relation: Model.HasManyRelation,
        modelClass: OrderRequestOrmEntity,
        join: {
          from: `${UserOrmEntity.tableName}.id`,
          to: `${OrderRequestOrmEntity.tableName}.driverId`,
        },
      },
    }
  }

  static get jsonSchema() {
    return {
      type: 'object',
      properties: {
        guarantors: { type: 'array' },
      },
    };
  }
}
