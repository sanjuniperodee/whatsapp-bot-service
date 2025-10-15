import { Injectable, NotFoundException } from '@nestjs/common';
import { IQueryHandler } from '@libs/cqrs';
import { GetClientActiveOrderQuery } from './get-client-active-order.query';
import { ActiveOrderReadRepository } from '../../repositories/active-order-read.repository';
import { ActiveOrderReadModel } from '../../read-models/active-order.read-model';
import { QueryHandler } from '@nestjs/cqrs';

@QueryHandler(GetClientActiveOrderQuery)
@Injectable()
export class GetClientActiveOrderHandler implements IQueryHandler<GetClientActiveOrderQuery, ActiveOrderReadModel> {
  constructor(
    private readonly activeOrderReadRepository: ActiveOrderReadRepository,
  ) {}

  async execute(query: GetClientActiveOrderQuery): Promise<ActiveOrderReadModel> {
    const { clientId } = query;

    const activeOrder = await this.activeOrderReadRepository.findActiveByClientId(clientId.value);
    if (!activeOrder) {
      throw new NotFoundException('Active order not found');
    }

    return activeOrder;
  }
}
