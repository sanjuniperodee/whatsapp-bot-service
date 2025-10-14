import { Injectable } from '@nestjs/common';
import { ActiveOrderReadModel } from '../read-models/active-order.read-model';
import { OrderRequestOrmEntity } from '@infrastructure/database/entities/order-request.orm-entity';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { CategoryLicenseOrmEntity } from '@infrastructure/database/entities/category-license.orm-entity';
import { OrderStatus } from '@infrastructure/enums';

@Injectable()
export class ActiveOrderReadRepository {
  async findActiveByClientId(clientId: string): Promise<ActiveOrderReadModel | null> {
    const order = await OrderRequestOrmEntity.query()
      .where('clientId', clientId)
      .whereNotIn('orderStatus', [
        OrderStatus.REJECTED,
        OrderStatus.COMPLETED,
        OrderStatus.REJECTED_BY_CLIENT,
        OrderStatus.REJECTED_BY_DRIVER
      ])
      .withGraphFetched({
        client: true,
        driver: true,
        driverCategories: true
      })
      .first();

    if (!order) {
      return null;
    }

    return this.mapToReadModel(order);
  }

  async findActiveByDriverId(driverId: string): Promise<ActiveOrderReadModel | null> {
    const order = await OrderRequestOrmEntity.query()
      .where('driverId', driverId)
      .whereNotIn('orderStatus', [
        OrderStatus.REJECTED,
        OrderStatus.COMPLETED,
        OrderStatus.REJECTED_BY_CLIENT,
        OrderStatus.REJECTED_BY_DRIVER
      ])
      .withGraphFetched({
        client: true,
        driver: true,
        driverCategories: true
      })
      .first();

    if (!order) {
      return null;
    }

    return this.mapToReadModel(order);
  }

  async findAllActiveByType(orderType: string): Promise<ActiveOrderReadModel[]> {
    const orders = await OrderRequestOrmEntity.query()
      .where('orderType', orderType)
      .whereNotIn('orderStatus', [
        OrderStatus.REJECTED,
        OrderStatus.COMPLETED,
        OrderStatus.REJECTED_BY_CLIENT,
        OrderStatus.REJECTED_BY_DRIVER
      ])
      .withGraphFetched({
        client: true,
        driver: true,
        driverCategories: true
      });

    return orders.map(order => this.mapToReadModel(order));
  }

  private mapToReadModel(order: any): ActiveOrderReadModel {
    return {
      id: order.id,
      clientId: order.clientId,
      driverId: order.driverId,
      orderType: order.orderType,
      orderStatus: order.orderStatus,
      from: order.from,
      to: order.to,
      fromMapboxId: order.fromMapboxId,
      toMapboxId: order.toMapboxId,
      lat: order.lat,
      lng: order.lng,
      price: order.price,
      comment: order.comment,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      startTime: order.startTime,
      arrivalTime: order.arrivalTime,
      rating: order.rating,
      client: order.client ? {
        id: order.client.id,
        phone: order.client.phone,
        firstName: order.client.firstName,
        lastName: order.client.lastName,
        middleName: order.client.middleName,
        deviceToken: order.client.deviceToken,
      } : undefined,
      driver: order.driver ? {
        id: order.driver.id,
        phone: order.driver.phone,
        firstName: order.driver.firstName,
        lastName: order.driver.lastName,
        middleName: order.driver.middleName,
        deviceToken: order.driver.deviceToken,
      } : undefined,
      car: order.driverCategories?.[0] ? {
        id: order.driverCategories[0].id,
        SSN: order.driverCategories[0].SSN,
        brand: order.driverCategories[0].brand,
        model: order.driverCategories[0].model,
        color: order.driverCategories[0].color,
        number: order.driverCategories[0].number,
      } : undefined,
    };
  }
}
