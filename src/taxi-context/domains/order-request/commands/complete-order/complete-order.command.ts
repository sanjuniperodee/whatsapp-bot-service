import { ICommand } from '@libs/cqrs';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';

export class CompleteOrderCommand implements ICommand {
  readonly commandName = 'CompleteOrderCommand';

  constructor(
    public readonly orderId: UUID,
  ) {}
}
