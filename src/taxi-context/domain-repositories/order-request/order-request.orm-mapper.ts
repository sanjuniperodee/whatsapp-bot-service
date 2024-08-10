import { EntityProps, OrmEntityProps, OrmMapper } from '@libs/ddd/infrastructure/database/orm-mapper.base';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { OrderRequestEntity, OrderRequestProps } from '@domain/order-request/domain/entities/order-request.entity';
import { OrderRequestOrmEntity } from '@infrastructure/database/entities/order-request.orm-entity';

export class OrderRequestOrmMapper extends OrmMapper<OrderRequestEntity, OrderRequestOrmEntity> {
  protected async toOrmProps(entity: OrderRequestEntity): Promise<OrmEntityProps<OrderRequestOrmEntity>> {
    const props = entity.getPropsCopy();

    return {
      driverId: props.driverId?.value || undefined,
      orderType: props.orderType,
      orderstatus: props.orderstatus,
      user_phone: props.user_phone,
      from: props.from,
      to: props.to,
      startTime: props.startTime,
      arrivalTime: props.arrivalTime,
      lat: props.lat,
      lng: props.lng,
      price: props.price,
      comment: props.comment
    };
  }

  protected async toDomainProps(ormEntity: OrderRequestOrmEntity): Promise<EntityProps<OrderRequestProps>> {
    const id = new UUID(ormEntity.id);

    const props: OrderRequestProps = {
      createdAt: ormEntity.createdAt,
      updatedAt: ormEntity.updatedAt,
      driverId: ormEntity.driverId ? new UUID(ormEntity.driverId) : undefined,
      user_phone: ormEntity.user_phone,
      orderType: ormEntity.orderType,
      orderstatus: ormEntity.orderstatus,
      from: ormEntity.from,
      to: ormEntity.to,
      startTime: ormEntity.startTime,
      arrivalTime: ormEntity.arrivalTime,
      lat: ormEntity.lat,
      lng: ormEntity.lng,
      price: ormEntity.price,
      comment: ormEntity.comment
    };

    return { id, props };
  }
}
