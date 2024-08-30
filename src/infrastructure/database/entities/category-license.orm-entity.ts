import { ObjectionEntityBase } from '@libs/ddd/infrastructure/database/objection.entity.base';
import { Model } from 'objection';
import { OrderStatus, OrderType } from '@infrastructure/enums';

export class CategoryLicenseOrmEntity extends ObjectionEntityBase {
  static create(data: Omit<CategoryLicenseOrmEntity, keyof Model>) {
    return CategoryLicenseOrmEntity.fromJson(data);
  }
  static tableName = 'category_license';

  driverId: string;
  categoryType: OrderType;
  brand: string;
  model: string;
  number: string;
  color: string;
  SSN: string;
}
