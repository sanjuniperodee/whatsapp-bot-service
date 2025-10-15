import { Injectable, NotFoundException } from '@nestjs/common';
import { IQueryHandler } from '@libs/cqrs';
import { QueryHandler } from '@nestjs/cqrs';
import { GetDriverActiveOrderQuery } from './get-driver-active-order.query';
import { ActiveOrderReadRepository } from '../../repositories/active-order-read.repository';
import { ActiveOrderReadModel } from '../../read-models/active-order.read-model';

@QueryHandler(GetDriverActiveOrderQuery)
@Injectable()
export class GetDriverActiveOrderHandler implements IQueryHandler<GetDriverActiveOrderQuery, ActiveOrderReadModel> {
  constructor(
    private readonly activeOrderReadRepository: ActiveOrderReadRepository,
  ) {}

  async execute(query: GetDriverActiveOrderQuery): Promise<ActiveOrderReadModel> {
    const { driverId } = query;

    const activeOrder = await this.activeOrderReadRepository.findActiveByDriverId(driverId.value);
    if (!activeOrder) {
      throw new NotFoundException('Active order not found');
    }

    return activeOrder;
  }
}
