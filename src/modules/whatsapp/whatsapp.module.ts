import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { WhatsAppController } from "@modules/whatsapp/whatsapp.controller";
import { WhatsAppService } from "@modules/whatsapp/whatsapp.service";
import {
  TaxiContextDomainRepositoriesModule
} from '../../taxi-context/domain-repositories/taxi-context-domain-repositories.module';
import { OrderRequestModule } from '@domain/order-request/order-request.module';

@Module({
  imports: [
    ConfigModule,
    CqrsModule,
    TaxiContextDomainRepositoriesModule,
    OrderRequestModule,
  ],
  controllers: [WhatsAppController],
  providers: [
    WhatsAppService,
  ],
  exports: [
    WhatsAppService,
  ],
})
export class WhatsAppModule {}
