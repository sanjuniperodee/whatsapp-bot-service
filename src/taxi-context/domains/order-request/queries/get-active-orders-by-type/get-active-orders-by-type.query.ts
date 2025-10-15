import { IQuery } from '@libs/cqrs';
import { OrderType } from '@infrastructure/enums';

export class GetActiveOrdersByTypeQuery implements IQuery {
  readonly queryName = 'GetActiveOrdersByTypeQuery';

  constructor(
    public readonly orderType: OrderType,
    public readonly limit: number = 50,
    public readonly offset: number = 0,
  ) {}
}
