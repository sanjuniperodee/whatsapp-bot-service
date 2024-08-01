import { ObjectionEntityBase } from '@libs/ddd/infrastructure/database/objection.entity.base';
import { Model } from 'objection';

export class WhatsappUserOrmEntity extends ObjectionEntityBase {
  static create(data: Omit<WhatsappUserOrmEntity, keyof Model>) {
    return WhatsappUserOrmEntity.fromJson(data);
  }
  static tableName = 'users';

  phone: string;
  name: string;

  static get jsonSchema() {
    return {
      type: 'object',
      properties: {
        guarantors: { type: 'array' },
      },
    };
  }
}
