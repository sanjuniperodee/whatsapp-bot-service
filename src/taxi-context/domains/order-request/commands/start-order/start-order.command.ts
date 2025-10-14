import { ICommand } from '@libs/cqrs';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';

export class StartOrderCommand implements ICommand {
  readonly commandName = 'StartOrderCommand';

  constructor(
    public readonly orderId: UUID,
  ) {}
}
