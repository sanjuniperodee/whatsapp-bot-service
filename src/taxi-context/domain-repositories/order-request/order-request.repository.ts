import { QueryParams } from '@libs/ddd/domain/ports/repository.ports';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { ObjectionRepositoryBase } from '@libs/ddd/infrastructure/database/objection.repository.base';
import { DeepPartial } from '@libs/types/deep-partial.type';
import { Injectable } from '@nestjs/common';
import { Model } from 'objection';

import { TransactionId, UnitOfWork } from '@infrastructure/database/unit-of-work/unit-of-work';
import { OrderRequestOrmMapper } from './order-request.orm-mapper';
import { OrderRequestRepositoryPort } from './order-request.repository.port';
import { OrderRequestEntity, OrderRequestProps } from '@domain/order-request/domain/entities/order-request.entity';
import { OrderRequestOrmEntity } from '@infrastructure/database/entities/order-request.orm-entity';

@Injectable()
export class OrderRequestRepository
  extends ObjectionRepositoryBase<OrderRequestEntity, OrderRequestProps, OrderRequestOrmEntity>
  implements OrderRequestRepositoryPort
{
  constructor(private readonly unitOfWork: UnitOfWork) {
    super(new OrderRequestOrmMapper(OrderRequestEntity));
  }

  async findOne(params: QueryParams<OrderRequestProps> = {}) {
    const where = this.prepareQuery(params);

    const found = await OrderRequestOrmEntity.query().findOne(where).whereNull('rejectReason');

    return found ? this.mapper.toDomainEntity(found) : undefined;
  }

  async findMany(params: QueryParams<OrderRequestProps> = {}): Promise<OrderRequestEntity[]> {
    const where = this.prepareQuery(params);

    const found = await OrderRequestOrmEntity.query().where(where);

    return found.length ? Promise.all(found.map(async (i) => await this.mapper.toDomainEntity(i))) : [];
  }

  async findOneById(id: string, trxId?: TransactionId): Promise<OrderRequestEntity | undefined> {
    const [trx, isOwnTrx] = trxId
      ? [this.unitOfWork.getTrx(trxId), false]
      : [await OrderRequestOrmEntity.startTransaction(), true];

    try {
      const orderRequest = await OrderRequestOrmEntity.query(trx).findById(id);

      if (isOwnTrx) {
        await trx.commit();
        await trx.executionPromise;
      }

      return orderRequest ? this.mapper.toDomainEntity(orderRequest, trxId) : undefined;
    } catch (err) {
      if (isOwnTrx) {
        await trx.rollback();
      }
      throw err;
    }
  }
  async save(entity: OrderRequestEntity, trxId?: TransactionId): Promise<UUID> {
    const [trx, isOwnTrx] = trxId
      ? [this.unitOfWork.getTrx(trxId), false]
      : [await OrderRequestOrmEntity.startTransaction(), true];

    try {
      const result = await OrderRequestOrmEntity.query(trx).upsertGraph(await this.mapper.toOrmEntity(entity), {
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

  // async existsByPhone(phone: string): Promise<boolean> {
  //   const found = await OrderRequestOrmEntity.query().findOne('phone', phone);
  //
  //   if (found) {
  //     return true;
  //   }
  //
  //   return false;
  // }
  //
  // async findOneByPhone(phone: string) {
  //   const found = await OrderRequestOrmEntity.query().findOne('phone', phone);
  //
  //   if (!found) {
  //     return found;
  //   }
  //
  //   return this.mapper.toDomainEntity(found);
  // }


  async delete(entity: OrderRequestEntity, trxId?: TransactionId): Promise<OrderRequestEntity> {
    entity.validate();

    const trx = trxId ? this.unitOfWork.getTrx(trxId) : await OrderRequestOrmEntity.startTransaction();

    try {
      await OrderRequestOrmEntity.query(trx).delete().where('id', entity.id.value);

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

  protected prepareQuery(params: QueryParams<OrderRequestProps>) {
    const where: DeepPartial<Omit<OrderRequestOrmEntity, keyof Model>> = {};
    if (params.id) {
      where.id = params.id.value;
    }
    if (params.createdAt) {
      where.createdAt = params.createdAt.value;
    }
    if (params.driverId) {
      where.driverId = params.driverId.value;
    }
    if (params.sessionid) {
      where.sessionid = params.sessionid;
    }
    if (params.user_phone) {
      where.user_phone = params.user_phone;
    }
    if (params.orderstatus) {
      where.orderstatus = params.orderstatus;
    }

    if (params.orderType) {
      where.orderType = params.orderType;
    }

    return where;
  }
}
