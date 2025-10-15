import { Injectable } from '@nestjs/common';
import { IQueryHandler } from '@libs/cqrs';
import { QueryHandler } from '@nestjs/cqrs';
import { GetOrderStatusQuery } from './get-order-status.query';
import { GetClientActiveOrderQuery } from '../get-client-active-order/get-client-active-order.query';
import { GetDriverActiveOrderQuery } from '../get-driver-active-order/get-driver-active-order.query';
import { QueryBus } from '@nestjs/cqrs';

@QueryHandler(GetOrderStatusQuery)
@Injectable()
export class GetOrderStatusHandler implements IQueryHandler<GetOrderStatusQuery, any> {
  constructor(private readonly queryBus: QueryBus) {}

  async execute(query: GetOrderStatusQuery): Promise<any> {
    const { userId } = query;

    // Try to get client active order first
    try {
      const clientQuery = new GetClientActiveOrderQuery(userId);
      const clientOrder = await this.queryBus.execute(clientQuery);
      return { status: 'client', order: clientOrder };
    } catch (error) {
      // If no client order, try driver active order
      try {
        const driverQuery = new GetDriverActiveOrderQuery(userId);
        const driverOrder = await this.queryBus.execute(driverQuery);
        return { status: 'driver', order: driverOrder };
      } catch (driverError) {
        return { status: 'no_active_order', order: null };
      }
    }
  }
}
