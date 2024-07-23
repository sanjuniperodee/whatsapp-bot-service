import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OrderRequestController } from '@domain/order-request/order-request.controller';
import { TaxiContextDomainRepositoriesModule } from '../../domain-repositories/taxi-context-domain-repositories.module';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';

const thirdPartyServices = [
  CqrsModule,
];


const controllers = [OrderRequestController];

@Module({
  imports: [...thirdPartyServices, TaxiContextDomainRepositoriesModule],
  providers: [OrderRequestGateway],
  controllers: [...controllers],
  exports: [OrderRequestGateway]
})
export class OrderRequestModule {}
