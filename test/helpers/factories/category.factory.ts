import { CategoryLicenseOrmEntity } from '@infrastructure/database/entities/category-license.orm-entity';
import { OrderType } from '@infrastructure/enums';

export interface CreateCategoryProps {
  driverId?: string;
  categoryType?: OrderType;
  brand?: string;
  model?: string;
  number?: string;
  color?: string;
  SSN?: string;
}

export class CategoryFactory {
  static create(props: CreateCategoryProps = {}): Partial<CategoryLicenseOrmEntity> {
    const {
      driverId = global.testUtils.generateTestUUID(),
      categoryType = OrderType.TAXI,
      brand = 'Toyota',
      model = 'Camry',
      number = '123ABC01',
      color = 'Белый',
      SSN = '123456789012',
    } = props;

    return {
      driverId,
      categoryType,
      brand,
      model,
      number,
      color,
      SSN,
    };
  }

  static createTaxiCategory(props: CreateCategoryProps = {}): Partial<CategoryLicenseOrmEntity> {
    return this.create({
      categoryType: OrderType.TAXI,
      ...props,
    });
  }

  static createDeliveryCategory(props: CreateCategoryProps = {}): Partial<CategoryLicenseOrmEntity> {
    return this.create({
      categoryType: OrderType.DELIVERY,
      ...props,
    });
  }

  static createCargoCategory(props: CreateCategoryProps = {}): Partial<CategoryLicenseOrmEntity> {
    return this.create({
      categoryType: OrderType.CARGO,
      ...props,
    });
  }

  static createIntercityCategory(props: CreateCategoryProps = {}): Partial<CategoryLicenseOrmEntity> {
    return this.create({
      categoryType: OrderType.INTERCITY_TAXI,
      ...props,
    });
  }
}
