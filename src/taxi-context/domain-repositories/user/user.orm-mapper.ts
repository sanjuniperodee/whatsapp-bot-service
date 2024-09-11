import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { EntityProps, OrmEntityProps, OrmMapper } from '../../../libs/ddd/infrastructure/database/orm-mapper.base';
import { UserEntity, UserProps } from '../../domains/user/domain/entities/user.entity';
import { UUID } from '../../../libs/ddd/domain/value-objects/uuid.value-object';

export class UserOrmMapper extends OrmMapper<UserEntity, UserOrmEntity> {
  protected async toOrmProps(entity: UserEntity): Promise<OrmEntityProps<UserOrmEntity>> {
    const props = entity.getPropsCopy();

    return {
      firstName: props.firstName,
      lastName: props.lastName,
      middleName: props.middleName,
      phone: props.phone,
      lastSms: props.lastSms,
      deviceToken: props.deviceToken,
    };
  }

  protected async toDomainProps(ormEntity: UserOrmEntity): Promise<EntityProps<UserProps>> {
    const id = new UUID(ormEntity.id);

    const props: UserProps = {
      phone: ormEntity.phone,
      firstName: ormEntity.firstName,
      lastName: ormEntity.lastName,
      middleName: ormEntity.middleName,
      lastSms: ormEntity.lastSms,
      deviceToken: ormEntity.deviceToken
    };

    return { id, props };
  }
}
