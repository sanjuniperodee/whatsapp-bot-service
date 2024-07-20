import { Module } from '@nestjs/common';
import { UserModule } from '@domain/user/user.module';
import {
  TaxiContextDomainRepositoriesModule,
} from './domain-repositories/taxi-context-domain-repositories.module';
const domains = [
  UserModule,
];

@Module({
  imports: [...domains],
})
export class TaxiContextModule {}
