import { DeepPartial } from '../../../types/deep-partial.type';

import { BaseEntityProps } from '../base-classes/entity.base';
import { ID } from '../value-objects/id.value-object';
import { UUID } from '../value-objects/uuid.value-object';

export type QueryParams<EntityProps> = DeepPartial<BaseEntityProps & EntityProps>;

export interface Save<Entity> {
  save(entity: Entity): Promise<UUID>;
}

export interface SaveMultiple<Entity> {
  saveMultiple(entities: Entity[]): Promise<Entity[]>;
}

export interface FindOne<Entity, EntityProps> {
  findOne(params: QueryParams<EntityProps>): Promise<Entity | undefined>;
}

export interface FindOneById<Entity> {
  findOneById(id: ID | string): Promise<Entity | undefined>;
}

export interface FindMany<Entity, EntityProps> {
  findMany(params: QueryParams<EntityProps>): Promise<Entity[]>;
}

export interface DeleteOne<Entity> {
  delete(entity: Entity): Promise<Entity>;
}

export interface RepositoryPort<Entity, EntityProps>
  extends Save<Entity>,
    FindOne<Entity, EntityProps>,
    FindOneById<Entity>,
    FindMany<Entity, EntityProps>,
    DeleteOne<Entity> {}
