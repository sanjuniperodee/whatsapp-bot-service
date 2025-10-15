import { Injectable } from '@nestjs/common';
import { IQueryHandler } from '@libs/cqrs';
import { QueryHandler } from '@nestjs/cqrs';
import { GetClientOrderHistoryQuery } from './get-client-order-history.query';
import { OrderHistoryReadRepository } from '../../repositories/order-history-read.repository';
import { OrderHistoryReadModel } from '../../read-models/order-history.read-model';

@QueryHandler(GetClientOrderHistoryQuery)
@Injectable()
export class GetClientOrderHistoryHandler implements IQueryHandler<GetClientOrderHistoryQuery, OrderHistoryReadModel[]> {
  constructor(
    private readonly orderHistoryReadRepository: OrderHistoryReadRepository,
  ) {}

  async execute(query: GetClientOrderHistoryQuery): Promise<OrderHistoryReadModel[]> {
    const { clientId, orderType, limit, offset } = query;

    return await this.orderHistoryReadRepository.findByClientIdAndType(
      clientId.value, 
      orderType, 
      limit, 
      offset
    );
  }
}
