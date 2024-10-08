import { Module } from '@nestjs/common';
import { UserModule } from '@domain/user/user.module';
import { OrderRequestModule } from '@domain/order-request/order-request.module';
const domains = [
  OrderRequestModule,
  UserModule,
];

@Module({
  imports: [...domains],
})
export class TaxiContextModule {}
