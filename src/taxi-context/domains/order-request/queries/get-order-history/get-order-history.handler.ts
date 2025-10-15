import { Injectable, NotFoundException } from '@nestjs/common';
import { IQueryHandler } from '@libs/cqrs';
import { QueryHandler } from '@nestjs/cqrs';
import { GetOrderHistoryQuery } from './get-order-history.query';
import { OrderHistoryReadRepository } from '../../repositories/order-history-read.repository';
import { OrderHistoryReadModel } from '../../read-models/order-history.read-model';

@QueryHandler(GetOrderHistoryQuery)
@Injectable()
export class GetOrderHistoryHandler implements IQueryHandler<GetOrderHistoryQuery, OrderHistoryReadModel[]> {
  constructor(
    private readonly orderHistoryReadRepository: OrderHistoryReadRepository,
  ) {}

  async execute(query: GetOrderHistoryQuery): Promise<OrderHistoryReadModel[]> {
    const { userId, orderType, limit, offset } = query;

    // Try to get as driver first, then as client
    try {
      const driverHistory = await this.orderHistoryReadRepository.findByDriverIdAndType(
        userId.value, 
        orderType, 
        limit, 
        offset
      );
      return driverHistory;
    } catch (error) {
      // If no driver history, try client history
      const clientHistory = await this.orderHistoryReadRepository.findByClientIdAndType(
        userId.value, 
        orderType, 
        limit, 
        offset
      );
      return clientHistory;
    }
  }
}
