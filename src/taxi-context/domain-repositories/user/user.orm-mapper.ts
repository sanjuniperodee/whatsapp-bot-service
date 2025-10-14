import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { EntityProps, OrmEntityProps, OrmMapper } from '../../../libs/ddd/infrastructure/database/orm-mapper.base';
import { UserEntity, UserProps } from '../../domains/user/domain/entities/user.entity';
import { UUID } from '../../../libs/ddd/domain/value-objects/uuid.value-object';
import { Phone } from '@domain/shared/value-objects/phone.value-object';

export class UserOrmMapper extends OrmMapper<UserEntity, UserOrmEntity> {
  protected async toOrmProps(entity: UserEntity): Promise<OrmEntityProps<UserOrmEntity>> {
    const props = entity.getPropsCopy();

    return {
      firstName: props.firstName,
      lastName: props.lastName,
      middleName: props.middleName,
      phone: props.phone.value,
      lastSms: props.lastSms,
      deviceToken: props.deviceToken,
      isBlocked: props.isBlocked || false,
      blockedUntil: props.blockedUntil,
      blockReason: props.blockReason,
    };
  }

  protected async toDomainProps(ormEntity: UserOrmEntity): Promise<EntityProps<UserProps>> {
    const id = new UUID(ormEntity.id);

    const props: UserProps = {
      phone: new Phone({ value: ormEntity.phone }),
      firstName: ormEntity.firstName,
      lastName: ormEntity.lastName,
      middleName: ormEntity.middleName,
      lastSms: ormEntity.lastSms,
      deviceToken: ormEntity.deviceToken,
      isBlocked: ormEntity.isBlocked,
      blockedUntil: ormEntity.blockedUntil,
      blockReason: ormEntity.blockReason
    };

    return { id, props };
  }
}
