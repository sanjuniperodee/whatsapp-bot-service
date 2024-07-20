import { UserEntity, UserProps } from '../../domains/user/domain/entities/user.entity';
import { RepositoryPort } from '../../../libs/ddd/domain/ports/repository.ports';

export interface UserRepositoryPort extends RepositoryPort<UserEntity, UserProps> {
  findOneByPhone(phone: string): Promise<UserEntity | undefined>;
  existsByPhone(phone: string): Promise<boolean>;
}
