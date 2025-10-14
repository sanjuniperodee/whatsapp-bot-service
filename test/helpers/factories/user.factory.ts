import { UserEntity } from '@domain/user/domain/entities/user.entity';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { Phone } from '@domain/shared/value-objects/phone.value-object';

export interface CreateUserProps {
  phone?: string;
  firstName?: string;
  lastName?: string;
  deviceToken?: string;
}

export class UserFactory {
  static create(props: CreateUserProps = {}): UserEntity {
    const {
      phone = global.testUtils.generateTestPhone(),
      firstName = 'Test',
      lastName = 'User',
      deviceToken = global.testUtils.generateTestDeviceToken(),
    } = props;

    const user = UserEntity.create({
      phone: new Phone({ value: phone }),
      firstName,
      lastName,
      deviceToken,
    });

    // Set additional properties after creation
    // These properties are set directly on the entity after creation

    return user;
  }

  static createClient(props: CreateUserProps = {}): UserEntity {
    return this.create({
      firstName: 'Client',
      lastName: 'Test',
      ...props,
    });
  }

  static createDriver(props: CreateUserProps = {}): UserEntity {
    return this.create({
      firstName: 'Driver',
      lastName: 'Test',
      ...props,
    });
  }

  static createBlockedUser(props: CreateUserProps = {}): UserEntity {
    const blockedUntil = new Date();
    blockedUntil.setHours(blockedUntil.getHours() + 1); // Block for 1 hour

    const user = this.create(props);
    user.blockUser(blockedUntil, 'Test violation');

    return user;
  }

  static createPermanentlyBlockedUser(props: CreateUserProps = {}): UserEntity {
    const user = this.create(props);
    user.blockUser(undefined, 'Serious violation'); // Permanent block

    return user;
  }

  static createExpiredBlockedUser(props: CreateUserProps = {}): UserEntity {
    const blockedUntil = new Date();
    blockedUntil.setHours(blockedUntil.getHours() - 1); // Block expired 1 hour ago

    const user = this.create(props);
    user.blockUser(blockedUntil, 'Expired violation');

    return user;
  }
}
