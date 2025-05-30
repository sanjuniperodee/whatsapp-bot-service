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
  deviceToken?: string;
  isBlocked?: boolean;
  blockedUntil?: Date;
  blockReason?: string;
};

export class UserEntity extends AggregateRoot<UserProps> {
  protected readonly _id: UUID;

  static create(create: CreateUserProps): UserEntity {
    const id = UUID.generate();

    const props: UserProps = {
      ...create,
      lastSms: undefined,
      middleName: undefined,
      deviceToken: undefined,
      isBlocked: false,
      blockedUntil: undefined,
      blockReason: undefined
    };

    return new UserEntity({ id, props });
  }

  get id() {
    return this._id;
  }

  get phone() {
    return this.props.phone;
  }

  get isBlocked() {
    return this.props.isBlocked || false;
  }

  get blockedUntil() {
    return this.props.blockedUntil;
  }

  get blockReason() {
    return this.props.blockReason;
  }

  isCurrentlyBlocked(): boolean {
    if (!this.props.isBlocked) return false;
    
    if (!this.props.blockedUntil) return true; // permanent block
    
    return new Date() < this.props.blockedUntil;
  }

  blockUser(blockedUntil?: Date, reason?: string): UserEntity {
    this.props.isBlocked = true;
    this.props.blockedUntil = blockedUntil;
    this.props.blockReason = reason;
    return this;
  }

  unblockUser(): UserEntity {
    this.props.isBlocked = false;
    this.props.blockedUntil = undefined;
    this.props.blockReason = undefined;
    return this;
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
