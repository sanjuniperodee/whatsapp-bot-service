import { Injectable } from '@nestjs/common';
import { OrderHistoryReadModel } from '../read-models/order-history.read-model';
import { OrderRequestOrmEntity } from '@infrastructure/database/entities/order-request.orm-entity';
import { OrderStatus } from '@infrastructure/enums';

@Injectable()
export class OrderHistoryReadRepository {
  async findByClientId(clientId: string, limit: number = 50, offset: number = 0): Promise<OrderHistoryReadModel[]> {
    const orders = await OrderRequestOrmEntity.query()
      .where('clientId', clientId)
      .whereIn('orderStatus', [
        OrderStatus.COMPLETED,
        OrderStatus.REJECTED,
        OrderStatus.REJECTED_BY_CLIENT,
        OrderStatus.REJECTED_BY_DRIVER
      ])
      .withGraphFetched({
        client: true,
        driver: true,
        driverCategories: true
      })
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset);

    return orders.map(order => this.mapToReadModel(order));
  }

  async findByDriverId(driverId: string, limit: number = 50, offset: number = 0): Promise<OrderHistoryReadModel[]> {
    const orders = await OrderRequestOrmEntity.query()
      .where('driverId', driverId)
      .whereIn('orderStatus', [
        OrderStatus.COMPLETED,
        OrderStatus.REJECTED,
        OrderStatus.REJECTED_BY_CLIENT,
        OrderStatus.REJECTED_BY_DRIVER
      ])
      .withGraphFetched({
        client: true,
        driver: true,
        driverCategories: true
      })
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset);

    return orders.map(order => this.mapToReadModel(order));
  }

  async findByClientIdAndType(clientId: string, orderType: string, limit: number = 50, offset: number = 0): Promise<OrderHistoryReadModel[]> {
    const orders = await OrderRequestOrmEntity.query()
      .where('clientId', clientId)
      .where('orderType', orderType)
      .whereIn('orderStatus', [
        OrderStatus.COMPLETED,
        OrderStatus.REJECTED,
        OrderStatus.REJECTED_BY_CLIENT,
        OrderStatus.REJECTED_BY_DRIVER
      ])
      .withGraphFetched({
        client: true,
        driver: true,
        driverCategories: true
      })
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset);

    return orders.map(order => this.mapToReadModel(order));
  }

  async findByDriverIdAndType(driverId: string, orderType: string, limit: number = 50, offset: number = 0): Promise<OrderHistoryReadModel[]> {
    const orders = await OrderRequestOrmEntity.query()
      .where('driverId', driverId)
      .where('orderType', orderType)
      .whereIn('orderStatus', [
        OrderStatus.COMPLETED,
        OrderStatus.REJECTED,
        OrderStatus.REJECTED_BY_CLIENT,
        OrderStatus.REJECTED_BY_DRIVER
      ])
      .withGraphFetched({
        client: true,
        driver: true,
        driverCategories: true
      })
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset);

    return orders.map(order => this.mapToReadModel(order));
  }

  private mapToReadModel(order: any): OrderHistoryReadModel {
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
      completedAt: order.orderStatus === OrderStatus.COMPLETED ? order.updatedAt : undefined,
      rating: order.rating,
      rejectReason: order.rejectReason,
      client: {
        id: order.client.id,
        phone: order.client.phone,
        firstName: order.client.firstName,
        lastName: order.client.lastName,
        middleName: order.client.middleName,
      },
      driver: order.driver ? {
        id: order.driver.id,
        phone: order.driver.phone,
        firstName: order.driver.firstName,
        lastName: order.driver.lastName,
        middleName: order.driver.middleName,
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
