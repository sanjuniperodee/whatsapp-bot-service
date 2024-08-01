import { WhatsappUserEntity, WhatsappUserProps } from '@domain/whatsapp-users/domain/entities/whatsapp-user.entity';
import { RepositoryPort } from '@libs/ddd/domain/ports/repository.ports';

export interface WhatsappUserRepositoryPort extends RepositoryPort<WhatsappUserEntity, WhatsappUserProps> {
  findOneByPhone(phone: string): Promise<WhatsappUserEntity | undefined>;
  existsByPhone(phone: string): Promise<boolean>;
}
