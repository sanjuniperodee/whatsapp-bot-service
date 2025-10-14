import { ICommand } from '@libs/cqrs';
import { OrderType } from '@infrastructure/enums';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';

export class CreateOrderCommand implements ICommand {
  readonly commandName = 'CreateOrderCommand';

  constructor(
    public readonly clientId: UUID,
    public readonly orderType: OrderType,
    public readonly from: string,
    public readonly to: string,
    public readonly fromMapboxId: string,
    public readonly toMapboxId: string,
    public readonly lat: number,
    public readonly lng: number,
    public readonly price: number,
    public readonly comment?: string,
  ) {}
}
