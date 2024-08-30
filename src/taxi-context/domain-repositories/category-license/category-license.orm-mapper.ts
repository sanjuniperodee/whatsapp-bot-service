import { EntityProps, OrmEntityProps, OrmMapper } from '@libs/ddd/infrastructure/database/orm-mapper.base';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { CategoryLicenseEntity, CategoryLicenseProps } from '@domain/user/domain/entities/category-license.entity';
import { CategoryLicenseOrmEntity } from '@infrastructure/database/entities/category-license.orm-entity';

export class CategoryLicenseOrmMapper extends OrmMapper<CategoryLicenseEntity, CategoryLicenseOrmEntity> {
  protected async toOrmProps(entity: CategoryLicenseEntity): Promise<OrmEntityProps<CategoryLicenseOrmEntity>> {
    const props = entity.getPropsCopy();

    return {
      SSN: props.SSN,
      brand: props.brand,
      categoryType: props.categoryType,
      color: props.color,
      driverId: props.driverId.value,
      model: props.model,
      number: props.number
    };
  }

  protected async toDomainProps(ormEntity: CategoryLicenseOrmEntity): Promise<EntityProps<CategoryLicenseProps>> {
    const id = new UUID(ormEntity.id);

    const props: CategoryLicenseProps = {
      SSN: ormEntity.SSN,
      brand: ormEntity.brand,
      categoryType: ormEntity.categoryType,
      color: ormEntity.color,
      driverId: new UUID(ormEntity.driverId),
      model: ormEntity.model,
      number: ormEntity.number
    };

    return { id, props };
  }
}
