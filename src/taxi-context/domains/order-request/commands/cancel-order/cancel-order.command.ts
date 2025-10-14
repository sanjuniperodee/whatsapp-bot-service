import { ICommand } from '@libs/cqrs';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';

export class CancelOrderCommand implements ICommand {
  readonly commandName = 'CancelOrderCommand';

  constructor(
    public readonly orderId: UUID,
    public readonly reason?: string,
  ) {}
}
