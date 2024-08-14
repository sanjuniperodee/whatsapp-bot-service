import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { QueryParams } from '../../../libs/ddd/domain/ports/repository.ports';
import { UUID } from '../../../libs/ddd/domain/value-objects/uuid.value-object';
import { ObjectionRepositoryBase } from '@libs/ddd/infrastructure/database/objection.repository.base';
import { DeepPartial } from '@libs/types/deep-partial.type';
import { Injectable } from '@nestjs/common';
import { Model } from 'objection';

import { TransactionId, UnitOfWork } from '@infrastructure/database/unit-of-work/unit-of-work';
import { WhatsappUserEntity, WhatsappUserProps } from '@domain/whatsapp-users/domain/entities/whatsapp-user.entity';
import { WhatsappUserOrmEntity } from '@infrastructure/database/entities/whatsapp-user.orm-entity';
import { WhatsappUserRepositoryPort } from './whatsapp-user.repository.port';
import { WhatsappUserOrmMapper } from './whatsapp-user.orm-mapper';

@Injectable()
export class WhatsappUserRepository
  extends ObjectionRepositoryBase<WhatsappUserEntity, WhatsappUserProps, WhatsappUserOrmEntity>
  implements WhatsappUserRepositoryPort
{
  constructor(private readonly unitOfWork: UnitOfWork) {
    super(new WhatsappUserOrmMapper(WhatsappUserEntity));
  }

  async findOne(params: QueryParams<WhatsappUserProps> = {}) {
    const where = this.prepareQuery(params);

    const found = await WhatsappUserOrmEntity.query().findOne(where);

    return found ? this.mapper.toDomainEntity(found) : undefined;
  }

  async findMany(params: QueryParams<WhatsappUserProps> = {}): Promise<WhatsappUserEntity[]> {
    const where = this.prepareQuery(params);

    const found = await WhatsappUserOrmEntity.query().where(where);

    return found.length ? Promise.all(found.map(async (i) => await this.mapper.toDomainEntity(i))) : [];
  }

  async findOneById(id: string, trxId?: TransactionId): Promise<WhatsappUserEntity | undefined> {
    const [trx, isOwnTrx] = trxId
      ? [this.unitOfWork.getTrx(trxId), false]
      : [await UserOrmEntity.startTransaction(), true];

    try {
      const user = await WhatsappUserOrmEntity.query(trx).findById(id);

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
    const found = await WhatsappUserOrmEntity.query().findOne('phone', phone);

    if (found) {
      return true;
    }

    return false;
  }

  async findOneByPhone(email: string) {
    const found = await WhatsappUserOrmEntity.query().findOne('phone', email);

    if (!found) {
      return found;
    }

    return this.mapper.toDomainEntity(found);
  }

  async findOneBySession(session: string) {
    const found = await WhatsappUserOrmEntity.query().findOne('session', session);

    if (!found) {
      return found;
    }

    return this.mapper.toDomainEntity(found);
  }

  async save(entity: WhatsappUserEntity, trxId?: TransactionId): Promise<UUID> {
    const [trx, isOwnTrx] = trxId
      ? [this.unitOfWork.getTrx(trxId), false]
      : [await UserOrmEntity.startTransaction(), true];

    try {
      const result = await WhatsappUserOrmEntity.query(trx).upsertGraph(await this.mapper.toOrmEntity(entity), {
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

  async delete(entity: WhatsappUserEntity, trxId?: TransactionId): Promise<WhatsappUserEntity> {
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

  protected prepareQuery(params: QueryParams<WhatsappUserProps>) {
    const where: DeepPartial<Omit<WhatsappUserOrmEntity, keyof Model>> = {};

    if (params.id) {
      where.id = params.id.value;
    }
    if (params.createdAt) {
      where.createdAt = params.createdAt.value;
    }
    if (params.phone) {
      where.phone = params.phone;
    }

    return where;
  }
}
