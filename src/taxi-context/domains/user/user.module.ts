import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UserController } from '@domain/user/user.controller';
import { TaxiContextDomainRepositoriesModule } from '../../domain-repositories/taxi-context-domain-repositories.module';
import {
  SignInByPhoneSendCodeService
} from '@domain/user/commands/sign-in-by-phone-send-code/sign-in-by-phone-send-code.service';
import {
  SignInByPhoneConfirmCodeService
} from '@domain/user/commands/sign-in-by-phone-confirm-code/sign-in-by-phone-confirm-code.service';
import {
  SignUpByPhoneCreateUserService
} from '@domain/user/commands/sign-up-by-phone-create-user/sign-up-by-phone-create-create-user.service';

const thirdPartyServices = [
  CqrsModule,
];

const services = [SignInByPhoneSendCodeService, SignInByPhoneConfirmCodeService, SignUpByPhoneCreateUserService]


const controllers = [UserController];

@Module({
  imports: [...thirdPartyServices, TaxiContextDomainRepositoriesModule],
  providers: [...services],
  controllers: [...controllers],
})
export class UserModule {}
