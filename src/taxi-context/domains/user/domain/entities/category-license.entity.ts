import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { AggregateRoot } from '@libs/ddd/domain/base-classes/aggregate-root.base';
import { UserHasEmptyFieldsError } from '../errors/user.errors';
import { OrderType } from '@infrastructure/enums';

export type CategoryLicenseProps =  {
  driverId: UUID;
  categoryType: OrderType;
  brand: string;
  model: string;
  number: string;
  color: string;
  SSN: string;
};

export class CategoryLicenseEntity extends AggregateRoot<CategoryLicenseProps> {
  protected readonly _id: UUID;

  static create(create: CategoryLicenseProps): CategoryLicenseEntity {
    const id = UUID.generate();

    const props: CategoryLicenseProps = {
      ...create,
    };

    return new CategoryLicenseEntity({ id, props });
  }

  get id() {
    return this._id;
  }
  validate(): void {
    const { driverId, categoryType, brand, SSN, model, color, number } = this.props;

    const fields = [driverId, categoryType, brand, SSN, model, color, number];

    if (fields.some((f) => f == null)) {
      throw new UserHasEmptyFieldsError('User must complete all required fields');
    }
  }
}
