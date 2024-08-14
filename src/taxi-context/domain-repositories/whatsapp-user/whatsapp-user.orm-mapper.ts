import { EntityProps, OrmEntityProps, OrmMapper } from '@libs/ddd/infrastructure/database/orm-mapper.base';
import { UserEntity } from '@domain/user/domain/entities/user.entity';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { WhatsappUserEntity, WhatsappUserProps } from '@domain/whatsapp-users/domain/entities/whatsapp-user.entity';
import { WhatsappUserOrmEntity } from '@infrastructure/database/entities/whatsapp-user.orm-entity';

export class WhatsappUserOrmMapper extends OrmMapper<WhatsappUserEntity, WhatsappUserOrmEntity> {
  protected async toOrmProps(entity: WhatsappUserEntity): Promise<OrmEntityProps<WhatsappUserOrmEntity>> {
    const props = entity.getPropsCopy();

    return {
      name: props.name,
      phone: props.phone,
      session: props.session,
    };
  }

  protected async toDomainProps(ormEntity: WhatsappUserOrmEntity): Promise<EntityProps<WhatsappUserProps>> {
    const id = new UUID(ormEntity.id);

    const props: WhatsappUserProps = {
      phone: ormEntity.phone,
      name: ormEntity.name,
      session: ormEntity.session,
    };

    return { id, props };
  }
}
