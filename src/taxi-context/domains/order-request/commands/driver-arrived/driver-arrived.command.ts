import { ICommand } from '@libs/cqrs';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';

export class DriverArrivedCommand implements ICommand {
  readonly commandName = 'DriverArrivedCommand';

  constructor(
    public readonly orderId: UUID,
  ) {}
}
