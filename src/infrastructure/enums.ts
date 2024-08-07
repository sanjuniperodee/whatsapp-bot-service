export enum OrderType {
  TAXI = 'TAXI',
  DELIVERY = 'DELIVERY',
  INTERCITY_TAXI = 'INTERCITY_TAXI',
  CARGO = 'CARGO'
}

export enum OrderStatus {
  CREATED = 'CREATED',
  STARTED = 'STARTED',
  WAITING = 'WAITING',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED'
}
