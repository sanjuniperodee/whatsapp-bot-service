import { DomainEvent } from '@libs/ddd/domain/domain-events/domain-event.base';

export class DriverArrivedEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly driverId: string,
    public readonly clientId: string,
  ) {
    super({ aggregateId });
  }
}
