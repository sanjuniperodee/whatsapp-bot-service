import { DomainEvent } from '@libs/ddd/domain/domain-events/domain-event.base';
import { OrderType } from '@infrastructure/enums';

export class OrderCreatedEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly orderType: OrderType,
    public readonly clientId: string,
    public readonly from: string,
    public readonly to: string,
    public readonly lat: number,
    public readonly lng: number,
    public readonly price: number,
    public readonly comment?: string,
  ) {
    super({ aggregateId });
  }
}
