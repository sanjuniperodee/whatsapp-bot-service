import { ObjectionEntityBase } from '@libs/ddd/infrastructure/database/objection.entity.base';
import { Model, RelationMappingsThunk } from 'objection';
import { CategoryLicenseOrmEntity } from '@infrastructure/database/entities/category-license.orm-entity';

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

  categoryLicenses?: CategoryLicenseOrmEntity[]

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
