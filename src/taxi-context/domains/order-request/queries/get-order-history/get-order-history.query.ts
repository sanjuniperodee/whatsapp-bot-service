import { IQuery } from '@libs/cqrs';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { OrderType } from '@infrastructure/enums';

export class GetOrderHistoryQuery implements IQuery {
  readonly queryName = 'GetOrderHistoryQuery';

  constructor(
    public readonly userId: UUID,
    public readonly orderType: OrderType,
    public readonly limit: number = 50,
    public readonly offset: number = 0,
  ) {}
}
