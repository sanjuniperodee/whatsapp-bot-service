import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OrderRequestController } from '@domain/order-request/order-request.controller';

const thirdPartyServices = [
  CqrsModule,
];


const controllers = [OrderRequestController];

@Module({
  imports: [...thirdPartyServices],
  providers: [],
  controllers: [...controllers],
})
export class OrderRequestModule {}
