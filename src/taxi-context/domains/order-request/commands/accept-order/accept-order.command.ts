import { ICommand } from '@libs/cqrs';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';

export class AcceptOrderCommand implements ICommand {
  readonly commandName = 'AcceptOrderCommand';

  constructor(
    public readonly orderId: UUID,
    public readonly driverId: UUID,
  ) {}
}
