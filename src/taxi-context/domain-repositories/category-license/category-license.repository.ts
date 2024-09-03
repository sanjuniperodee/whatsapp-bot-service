import { QueryParams } from '@libs/ddd/domain/ports/repository.ports';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { ObjectionRepositoryBase } from '@libs/ddd/infrastructure/database/objection.repository.base';
import { DeepPartial } from '@libs/types/deep-partial.type';
import { Injectable } from '@nestjs/common';
import { Model } from 'objection';

import { TransactionId, UnitOfWork } from '@infrastructure/database/unit-of-work/unit-of-work';
import { CategoryLicenseOrmMapper } from './category-license.orm-mapper';
import { CategoryLicenseRepositoryPort } from './category-license.repository.port';
import { CategoryLicenseEntity, CategoryLicenseProps } from '@domain/user/domain/entities/category-license.entity';
import { CategoryLicenseOrmEntity } from '@infrastructure/database/entities/category-license.orm-entity';

@Injectable()
export class CategoryLicenseRepository
  extends ObjectionRepositoryBase<CategoryLicenseEntity, CategoryLicenseProps, CategoryLicenseOrmEntity>
  implements CategoryLicenseRepositoryPort
{
  constructor(private readonly unitOfWork: UnitOfWork) {
    super(new CategoryLicenseOrmMapper(CategoryLicenseEntity));
  }

  async findOne(params: QueryParams<CategoryLicenseProps> = {}) {
    const where = this.prepareQuery(params);

    const found = await CategoryLicenseOrmEntity.query().findOne(where);

    return found ? this.mapper.toDomainEntity(found) : undefined;
  }

  async findMany(params: QueryParams<CategoryLicenseProps> = {}): Promise<CategoryLicenseEntity[]> {
    const where = this.prepareQuery(params);

    const found = await CategoryLicenseOrmEntity.query().where(where);

    return found.length ? Promise.all(found.map(async (i) => await this.mapper.toDomainEntity(i))) : [];
  }

  async findOneById(id: string, trxId?: TransactionId): Promise<CategoryLicenseEntity | undefined> {
    const [trx, isOwnTrx] = trxId
      ? [this.unitOfWork.getTrx(trxId), false]
      : [await CategoryLicenseOrmEntity.startTransaction(), true];

    try {
      const categoryLicense = await CategoryLicenseOrmEntity.query(trx).findById(id);

      if (isOwnTrx) {
        await trx.commit();
        await trx.executionPromise;
      }

      return categoryLicense ? this.mapper.toDomainEntity(categoryLicense, trxId) : undefined;
    } catch (err) {
      if (isOwnTrx) {
        await trx.rollback();
      }
      throw err;
    }
  }
  async save(entity: CategoryLicenseEntity, trxId?: TransactionId): Promise<UUID> {
    const [trx, isOwnTrx] = trxId
      ? [this.unitOfWork.getTrx(trxId), false]
      : [await CategoryLicenseOrmEntity.startTransaction(), true];

    try {
      const result = await CategoryLicenseOrmEntity.query(trx).upsertGraph(await this.mapper.toOrmEntity(entity), {
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


  async delete(entity: CategoryLicenseEntity, trxId?: TransactionId): Promise<CategoryLicenseEntity> {
    entity.validate();

    const trx = trxId ? this.unitOfWork.getTrx(trxId) : await CategoryLicenseOrmEntity.startTransaction();

    try {
      await CategoryLicenseOrmEntity.query(trx).delete().where('id', entity.id.value);

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

  protected prepareQuery(params: QueryParams<CategoryLicenseProps>) {
    const where: DeepPartial<Omit<CategoryLicenseOrmEntity, keyof Model>> = {};
    if (params.id) {
      where.id = params.id.value;
    }
    if (params.createdAt) {
      where.createdAt = params.createdAt.value;
    }
    if (params.driverId) {
      where.driverId = params.driverId.value;
    }
    if (params.categoryType) {
      where.categoryType = params.categoryType;
    }
    if (params.brand) {
      where.brand = params.brand;
    }
    if (params.color) {
      where.color = params.color;
    }
    if (params.model) {
      where.model = params.model;
    }
    if (params.SSN) {
      where.SSN = params.SSN;
    }
    console.log(where)
    return where;
  }
}
