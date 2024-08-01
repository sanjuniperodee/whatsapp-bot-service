import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TaxiContextDomainRepositoriesModule } from '../../domain-repositories/taxi-context-domain-repositories.module';
import { WhatsappUserController } from '@domain/whatsapp-users/whatsapp-user.controller';

const thirdPartyServices = [
  CqrsModule,
];

const services = []

const controllers = [WhatsappUserController];

@Module({
  imports: [...thirdPartyServices, TaxiContextDomainRepositoriesModule],
  providers: [],
  controllers: [...controllers],
})
export class WhatsappUserModule {}
