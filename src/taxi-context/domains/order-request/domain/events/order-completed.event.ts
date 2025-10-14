import { DomainEvent } from '@libs/ddd/domain/domain-events/domain-event.base';

export class OrderCompletedEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly driverId: string,
    public readonly clientId: string,
    public readonly price: number,
  ) {
    super({ aggregateId });
  }
}
