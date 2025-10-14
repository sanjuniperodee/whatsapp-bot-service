import { IQuery } from '@libs/cqrs';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';

export class GetClientActiveOrderQuery implements IQuery {
  readonly queryName = 'GetClientActiveOrderQuery';

  constructor(
    public readonly clientId: UUID,
  ) {}
}
