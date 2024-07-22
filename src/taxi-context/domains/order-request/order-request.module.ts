import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OrderRequestController } from '@domain/order-request/order-request.controller';
import { TaxiContextDomainRepositoriesModule } from '../../domain-repositories/taxi-context-domain-repositories.module';

const thirdPartyServices = [
  CqrsModule,
];


const controllers = [OrderRequestController];

@Module({
  imports: [...thirdPartyServices, TaxiContextDomainRepositoriesModule],
  providers: [],
  controllers: [...controllers],
})
export class OrderRequestModule {}
