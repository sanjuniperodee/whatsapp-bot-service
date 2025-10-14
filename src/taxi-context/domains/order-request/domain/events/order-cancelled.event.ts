import { DomainEvent } from '@libs/ddd/domain/domain-events/domain-event.base';

export class OrderCancelledEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly clientId: string,
    public readonly driverId?: string,
    public readonly reason?: string,
  ) {
    super({ aggregateId });
  }
}
