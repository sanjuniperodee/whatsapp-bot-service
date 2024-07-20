import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UserController } from '@domain/user/user.controller';

const thirdPartyServices = [
  CqrsModule,
];


const controllers = [UserController];

@Module({
  imports: [...thirdPartyServices],
  providers: [],
  controllers: [...controllers],
})
export class UserModule {}
