import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { AggregateRoot } from '@libs/ddd/domain/base-classes/aggregate-root.base';
import { UserHasEmptyFieldsError } from '../errors/user.errors';

export interface CreateUserProps {
  phone: string;
  firstName: string;
  lastName: string;
}

// All properties that a User has
export type UserProps = CreateUserProps & {
  middleName?: string;
  lastSms?: string;
};

export class UserEntity extends AggregateRoot<UserProps> {
  protected readonly _id: UUID;

  static create(create: CreateUserProps): UserEntity {
    const id = UUID.generate();

    const props: UserProps = {
      ...create,
      lastSms: undefined,
      middleName: undefined
    };

    return new UserEntity({ id, props });
  }

  get id() {
    return this._id;
  }

  get phone() {
    return this.props.phone;
  }

  private baseEditPersonalName(firstName: string, lastName: string, middleName?: string): UserEntity {
    this.props.firstName = firstName;
    this.props.lastName = lastName;
    this.props.middleName = middleName;

    return this;
  }

  validate(): void {
    const { firstName, lastName } = this.props;

    const fields = [firstName, lastName];

    if (fields.some((f) => f == null)) {
      throw new UserHasEmptyFieldsError('User must complete all required fields');
    }
  }
}
