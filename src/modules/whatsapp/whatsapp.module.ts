import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { WhatsAppController } from "@modules/whatsapp/whatsapp.controller";
import { WhatsAppService } from "@modules/whatsapp/whatsapp.service";

@Module({
  imports: [
    ConfigModule,
    CqrsModule,
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
