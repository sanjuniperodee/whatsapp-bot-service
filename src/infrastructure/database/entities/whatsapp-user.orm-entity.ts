import { ObjectionEntityBase } from '@libs/ddd/infrastructure/database/objection.entity.base';
import { Model } from 'objection';

export class WhatsappUserOrmEntity extends ObjectionEntityBase {
  static create(data: Omit<WhatsappUserOrmEntity, keyof Model>) {
    return WhatsappUserOrmEntity.fromJson(data);
  }
  static tableName = 'whatsapp_users';

  phone: string;
  name: string;
  session?: string

  static get jsonSchema() {
    return {
      type: 'object',
      properties: {
        guarantors: { type: 'array' },
      },
    };
  }
}
