import { TransactionId, UnitOfWork } from '@infrastructure/database/unit-of-work/unit-of-work';
import { AggregateRoot } from '../../domain/base-classes/aggregate-root.base';
import { CreateEntityProps } from '../../domain/base-classes/entity.base';
import { DateVO } from '../../domain/value-objects/date.value-object';
import { ID } from '../../domain/value-objects/id.value-object';
import { Model } from 'objection';

import { ObjectionEntityBase } from './objection.entity.base';

export type OrmEntityProps<OrmEntity> = Omit<
  OrmEntity,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'properties' | keyof Model
>;

export interface EntityProps<EntityProps> {
  id: ID;
  props: EntityProps;
}

export abstract class OrmMapper<Entity extends AggregateRoot<unknown>, OrmEntity> {
  constructor(
    private entityConstructor: new (props: CreateEntityProps<any>) => Entity, // private ormEntityClass: OrmEntity,
    protected readonly unitOfWork?: UnitOfWork,
  ) {}

  protected abstract toDomainProps(ormEntity: OrmEntity, trxId?: TransactionId): Promise<EntityProps<unknown>>;

  protected abstract toOrmProps(entity: Entity, trxId?: TransactionId): Promise<OrmEntityProps<OrmEntity>>;

  async toDomainEntity(ormEntity: OrmEntity, trxId?: TransactionId): Promise<Entity> {
    const { id, props } = await this.toDomainProps(ormEntity, trxId);
    const ormEntityBase: ObjectionEntityBase = ormEntity as unknown as ObjectionEntityBase;
    return new this.entityConstructor({
      id,
      props,
      createdAt: new DateVO(ormEntityBase.createdAt),
      updatedAt: new DateVO(ormEntityBase.updatedAt),
      deletedAt: ormEntityBase.deletedAt ? new DateVO(ormEntityBase.deletedAt) : null,
    });
  }

  async toOrmEntity(entity: Entity, trxId?: TransactionId): Promise<OrmEntity> {
    const props = await this.toOrmProps(entity, trxId);

    return Model.fromJson({
      ...props,
      id: entity.id.value,
      createdAt: entity.createdAt.value,
      updatedAt: entity.updatedAt.value,
      deletedAt: entity.deletedAt?.value || null,
    }) as unknown as OrmEntity;
  }
}