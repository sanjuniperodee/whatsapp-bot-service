import { Module } from '@nestjs/common';
import { UserModule } from '@domain/user/user.module';
import { OrderRequestModule } from '@domain/order-request/order-request.module';
import { WhatsappUserModule } from '@domain/whatsapp-users/whatsapp-user.module';
const domains = [
  OrderRequestModule,
  UserModule,
  WhatsappUserModule,
];

@Module({
  imports: [...domains],
})
export class TaxiContextModule {}
