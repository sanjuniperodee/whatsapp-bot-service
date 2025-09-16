import { RepositoryPort } from '@libs/ddd/domain/ports/repository.ports';
import { OrderRequestEntity, OrderRequestProps } from '@domain/order-request/domain/entities/order-request.entity';
import { OrderType } from '@infrastructure/enums';

export interface OrderRequestRepositoryPort extends RepositoryPort<OrderRequestEntity, OrderRequestProps> {
  findActiveByDriverId(driverId: string): Promise<OrderRequestEntity | undefined>;
  findActiveByClientId(clientId: string): Promise<OrderRequestEntity | undefined>;
  findHistoryByDriverId(driverId: string, orderType: OrderType): Promise<OrderRequestEntity[]>;
  findHistoryByClientId(clientId: string, orderType: OrderType): Promise<OrderRequestEntity[]>;
  // findOneByPhone(phone: string): Promise<OrderRequestEntity | undefined>;
  // existsByPhone(phone: string): Promise<boolean>;
}
