import { IQuery } from '@libs/cqrs';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';

export class GetDriverActiveOrderQuery implements IQuery {
  readonly queryName = 'GetDriverActiveOrderQuery';

  constructor(
    public readonly driverId: UUID,
  ) {}
}
