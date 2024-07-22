import { RepositoryPort } from '@libs/ddd/domain/ports/repository.ports';
import { OrderRequestEntity, OrderRequestProps } from '@domain/order-request/domain/entities/order-request.entity';

export interface OrderRequestRepositoryPort extends RepositoryPort<OrderRequestEntity, OrderRequestProps> {
  // findOneByPhone(phone: string): Promise<UserEntity | undefined>;
  // existsByPhone(phone: string): Promise<boolean>;
}
