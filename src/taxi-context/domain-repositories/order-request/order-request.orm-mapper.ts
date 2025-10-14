import { EntityProps, OrmEntityProps, OrmMapper } from '@libs/ddd/infrastructure/database/orm-mapper.base';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { OrderRequestEntity, OrderRequestProps } from '@domain/order-request/domain/entities/order-request.entity';
import { OrderRequestOrmEntity } from '@infrastructure/database/entities/order-request.orm-entity';
import { UserEntity } from '@domain/user/domain/entities/user.entity';
import { UserOrmMapper } from '../user/user.orm-mapper';
import { Price } from '@domain/shared/value-objects/price.value-object';
import { Address } from '@domain/shared/value-objects/address.value-object';

export class OrderRequestOrmMapper extends OrmMapper<OrderRequestEntity, OrderRequestOrmEntity> {
  private userMapper = new UserOrmMapper(UserEntity);
  protected async toOrmProps(entity: OrderRequestEntity): Promise<OrmEntityProps<OrderRequestOrmEntity>> {
    const props = entity.getPropsCopy();

    return {
      clientId: props.clientId.value,
      driverId: props.driverId?.value || undefined,
      orderType: props.orderType,
      orderStatus: props.orderStatus,
      from: props.from,
      to: props.to,
      fromMapboxId: props.fromMapboxId,
      toMapboxId: props.toMapboxId,
      startTime: props.startTime,
      arrivalTime: props.arrivalTime,
      lat: props.lat,
      lng: props.lng,
      price: props.price.value,
      rating: props.rating,
      comment: props.comment,
      endedAt: props.endedAt,
    };
  }

  protected async toDomainProps(ormEntity: OrderRequestOrmEntity): Promise<EntityProps<OrderRequestProps>> {
    const id = new UUID(ormEntity.id);

    let client: UserEntity | undefined;
    if (ormEntity.client) {
      client = await this.userMapper.toDomainEntity(ormEntity.client);
    }

    let driver: UserEntity | undefined;
    if (ormEntity.driver) {
      driver = await this.userMapper.toDomainEntity(ormEntity.driver);
    }

    const props: OrderRequestProps = {
      createdAt: ormEntity.createdAt,
      updatedAt: ormEntity.updatedAt,
      driverId: ormEntity.driverId ? new UUID(ormEntity.driverId) : undefined,
      orderType: ormEntity.orderType,
      orderStatus: ormEntity.orderStatus,
      from: ormEntity.from,
      to: ormEntity.to,
      fromMapboxId: ormEntity.fromMapboxId,
      toMapboxId: ormEntity.toMapboxId,
      startTime: ormEntity.startTime,
      arrivalTime: ormEntity.arrivalTime,
      lat: ormEntity.lat,
      lng: ormEntity.lng,
      address: new Address({ from: ormEntity.from, to: ormEntity.to }),
      price: new Price({ value: ormEntity.price }),
      comment: ormEntity.comment,
      endedAt: ormEntity.endedAt,
      rating: ormEntity.rating,
      clientId: new UUID(ormEntity.clientId),
      client: client, // Добавляем клиента
      driver: driver // Добавляем водителя
    };

    return { id, props };
  }
}
