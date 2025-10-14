import { ICommand } from '@libs/cqrs';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { OrderType } from '@infrastructure/enums';

export class RegisterCategoryCommand implements ICommand {
  readonly commandName = 'RegisterCategoryCommand';

  constructor(
    public readonly driverId: UUID,
    public readonly governmentNumber: string,
    public readonly model: string,
    public readonly SSN: string,
    public readonly type: OrderType,
    public readonly color: string,
    public readonly brand: string,
  ) {}
}
