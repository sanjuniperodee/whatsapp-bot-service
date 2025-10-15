import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { QueryParams } from '../../../libs/ddd/domain/ports/repository.ports';
import { UUID } from '../../../libs/ddd/domain/value-objects/uuid.value-object';
import { ObjectionRepositoryBase } from '../../../libs/ddd/infrastructure/database/objection.repository.base';
import { DeepPartial } from '../../../libs/types/deep-partial.type';
import { Injectable } from '@nestjs/common';
import { Model } from 'objection';

import { TransactionId, UnitOfWork } from '@infrastructure/database/unit-of-work/unit-of-work';
import { UserEntity, UserProps } from '../../domains/user/domain/entities/user.entity';
import { UserOrmMapper } from './user.orm-mapper';
import { UserRepositoryPort } from './user.repository.port';

@Injectable()
export class UserRepository
  extends ObjectionRepositoryBase<UserEntity, UserProps, UserOrmEntity>
  implements UserRepositoryPort
{
  constructor(private readonly unitOfWork: UnitOfWork) {
    super(new UserOrmMapper(UserEntity));
  }

  async findOne(params: QueryParams<UserProps> = {}) {
    const where = this.prepareQuery(params);

    const found = await UserOrmEntity.query().findOne(where);

    return found ? this.mapper.toDomainEntity(found) : undefined;
  }

  async findMany(params: QueryParams<UserProps> = {}): Promise<UserEntity[]> {
    const where = this.prepareQuery(params);

    const found = await UserOrmEntity.query().where(where);

    return found.length ? Promise.all(found.map(async (i) => await this.mapper.toDomainEntity(i))) : [];
  }

  async findOneById(id: string | UUID, trxId?: TransactionId): Promise<UserEntity | undefined> {
    const currentTrx = this.unitOfWork.getCurrentTransaction();
    const [trx, isOwnTrx] = trxId
      ? [this.unitOfWork.getTrx(trxId), false]
      : currentTrx 
        ? [currentTrx, false]
        : [await UserOrmEntity.startTransaction(), true];

    try {
      const userId = typeof id === 'string' ? id : id.value;
      const user = await UserOrmEntity.query(trx).findById(userId);

      if (isOwnTrx) {
        await trx.commit();
        await trx.executionPromise;
      }

      return user ? this.mapper.toDomainEntity(user, trxId) : undefined;
    } catch (err) {
      if (isOwnTrx) {
        await trx.rollback();
      }
      throw err;
    }
  }
  async existsByPhone(phone: string): Promise<boolean> {
    const found = await UserOrmEntity.query().findOne('phone', phone);

    if (found) {
      return true;
    }

    return false;
  }

  async findOneByPhone(phone: string): Promise<UserEntity | undefined> {
    const found = await UserOrmEntity.query().findOne('phone', phone);

    if (!found) {
      return undefined;
    }

    return this.mapper.toDomainEntity(found);
  }

  async save(entity: UserEntity, trxId?: TransactionId): Promise<UUID> {
    const currentTrx = this.unitOfWork.getCurrentTransaction();
    const [trx, isOwnTrx] = trxId
      ? [this.unitOfWork.getTrx(trxId), false]
      : currentTrx 
        ? [currentTrx, false]
        : [await UserOrmEntity.startTransaction(), true];

    try {
      const result = await UserOrmEntity.query(trx).upsertGraph(await this.mapper.toOrmEntity(entity), {
        insertMissing: true,
      });

      if (isOwnTrx) {
        await trx.commit();
        await trx.executionPromise;
      }

      return new UUID(result.id);
    } catch (err) {
      if (isOwnTrx) {
        await trx.rollback();
      }
      throw err;
    }
  }

  async delete(entity: UserEntity, trxId?: TransactionId): Promise<UserEntity> {
    entity.validate();

    const trx = trxId ? this.unitOfWork.getTrx(trxId) : await UserOrmEntity.startTransaction();

    try {
      await UserOrmEntity.query(trx).delete().where('id', entity.id.value);

      if (!trxId) {
        await trx.commit();
        await trx.executionPromise;
      }

      return entity;
    } catch (err) {
      if (!trxId) {
        await trx.rollback();
      }
      throw err;
    }
  }

  protected prepareQuery(params: QueryParams<UserProps>) {
    const where: DeepPartial<Omit<UserOrmEntity, keyof Model>> = {};

    if (params.id) {
      where.id = params.id.value;
    }
    if (params.createdAt) {
      where.createdAt = params.createdAt.value;
    }
    if (params.phone) {
      where.phone = typeof params.phone === 'string' ? params.phone : params.phone.value;
    }

    return where;
  }
}
