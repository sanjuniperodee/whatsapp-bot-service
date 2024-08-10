import { forwardRef, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OrderRequestController } from '@domain/order-request/order-request.controller';
import { TaxiContextDomainRepositoriesModule } from '../../domain-repositories/taxi-context-domain-repositories.module';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
import { CloudCacheStorageModule } from '@third-parties/cloud-cache-storage/src';
import { redisConfigFactory } from '@infrastructure/configs/redis.factory';
import { WhatsAppModule } from '@modules/whatsapp/whatsapp.module';

const thirdPartyServices = [
  CqrsModule,
  forwardRef(() => WhatsAppModule)
];


const controllers = [OrderRequestController];

@Module({
  imports: [...thirdPartyServices, TaxiContextDomainRepositoriesModule, CloudCacheStorageModule.forRootAsync(redisConfigFactory)],
  providers: [OrderRequestGateway],
  controllers: [...controllers],
  exports: [OrderRequestGateway]
})
export class OrderRequestModule {}
