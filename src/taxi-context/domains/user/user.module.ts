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
import { CloudCacheStorageModule } from '../../../third-parties/cloud-cache-storage/src';
import { redisConfigFactory } from '@infrastructure/configs/redis.factory';
import { WhatsAppModule } from '@modules/whatsapp/whatsapp.module';
import { ClientOrderRequestController } from '@domain/user/client-admin.controller';
import { LoginService } from '@domain/user/commands/login/login.service';

const thirdPartyServices = [
  CqrsModule,
];

const services = [SignInByPhoneSendCodeService, SignInByPhoneConfirmCodeService, SignUpByPhoneCreateUserService, LoginService]


const controllers = [UserController, ClientOrderRequestController];

@Module({
  imports: [...thirdPartyServices, TaxiContextDomainRepositoriesModule, CloudCacheStorageModule.forRootAsync(redisConfigFactory), WhatsAppModule],
  providers: [...services],
  controllers: [...controllers],
})
export class UserModule {}
