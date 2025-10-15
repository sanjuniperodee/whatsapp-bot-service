import { Injectable } from '@nestjs/common';
import { IQueryHandler } from '@libs/cqrs';
import { QueryHandler } from '@nestjs/cqrs';
import { GetActiveOrdersByTypeQuery } from './get-active-orders-by-type.query';
import { ActiveOrderReadRepository } from '../../repositories/active-order-read.repository';
import { ActiveOrderReadModel } from '../../read-models/active-order.read-model';

@QueryHandler(GetActiveOrdersByTypeQuery)
@Injectable()
export class GetActiveOrdersByTypeHandler implements IQueryHandler<GetActiveOrdersByTypeQuery, ActiveOrderReadModel[]> {
  constructor(
    private readonly activeOrderReadRepository: ActiveOrderReadRepository,
  ) {}

  async execute(query: GetActiveOrdersByTypeQuery): Promise<ActiveOrderReadModel[]> {
    const { orderType, limit, offset } = query;

    const orders = await this.activeOrderReadRepository.findAllActiveByType(orderType);
    
    // Apply pagination
    return orders.slice(offset, offset + limit);
  }
}
