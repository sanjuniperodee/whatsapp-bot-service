import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { WhatsAppController } from "@modules/whatsapp/whatsapp.controller";
import { WhatsAppService } from "@modules/whatsapp/whatsapp.service";
import {
  TaxiContextDomainRepositoriesModule
} from '../../taxi-context/domain-repositories/taxi-context-domain-repositories.module';
import { OrderRequestModule } from '../../taxi-context/domains/order-request/order-request.module';
import { CloudCacheStorageModule } from '../../third-parties/cloud-cache-storage/src/cloud-cache-storage.module';
import { redisConfigFactory } from '@infrastructure/configs/redis.factory';

@Module({
  imports: [
    ConfigModule,
    CqrsModule,
    forwardRef(() => OrderRequestModule),
    TaxiContextDomainRepositoriesModule,
    CloudCacheStorageModule.forRootAsync(redisConfigFactory)
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
