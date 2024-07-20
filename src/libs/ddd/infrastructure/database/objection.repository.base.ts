import { AggregateRoot } from '../../domain/base-classes/aggregate-root.base';
import { QueryParams } from '../../domain/ports/repository.ports';
import { DeepPartial } from '../../../types/deep-partial.type';
import { Model } from 'objection';

import { OrmMapper } from './orm-mapper.base';

export abstract class ObjectionRepositoryBase<Entity extends AggregateRoot<unknown>, EntityProps, OrmEntity> {
  protected constructor(protected readonly mapper: OrmMapper<Entity, OrmEntity>) {}

  protected abstract prepareQuery(params: QueryParams<EntityProps>): DeepPartial<Omit<OrmEntity, keyof Model>>;
}