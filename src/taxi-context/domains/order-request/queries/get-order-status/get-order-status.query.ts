import { IQuery } from '@libs/cqrs';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';

export class GetOrderStatusQuery implements IQuery {
  readonly queryName = 'GetOrderStatusQuery';

  constructor(
    public readonly userId: UUID,
  ) {}
}
