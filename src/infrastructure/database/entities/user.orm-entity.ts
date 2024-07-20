import { ObjectionEntityBase } from '@libs/ddd/infrastructure/database/objection.entity.base';
import { Model } from 'objection';

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

  static get jsonSchema() {
    return {
      type: 'object',
      properties: {
        guarantors: { type: 'array' },
      },
    };
  }
}
