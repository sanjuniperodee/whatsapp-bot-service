import { IQuery } from '@libs/cqrs';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { OrderType } from '@infrastructure/enums';

export class GetClientOrderHistoryQuery implements IQuery {
  readonly queryName = 'GetClientOrderHistoryQuery';

  constructor(
    public readonly clientId: UUID,
    public readonly orderType: OrderType,
    public readonly limit: number = 50,
    public readonly offset: number = 0,
  ) {}
}
