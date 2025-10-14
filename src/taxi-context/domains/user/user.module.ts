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
import { CloudCacheStorageModule } from '@third-parties/cloud-cache-storage/src';
import { redisConfigFactory } from '@infrastructure/configs/redis.factory';
import { ClientOrderRequestController } from '@domain/user/client-admin.controller';
import { CategoryController } from './controllers/category.controller';
import { LoginService } from '@domain/user/commands/login/login.service';
import { UserBlockingService } from './services/user-blocking.service';
import { NotificationService } from '@modules/firebase/notification.service';
import { UserUnblockSchedulerService } from './services/user-unblock-scheduler.service';
import { RegisterCategoryHandler } from './commands/register-category/register-category.handler';
import { WhatsAppModule } from '@modules/whatsapp/whatsapp.module';

const thirdPartyServices = [
  CqrsModule,
];

const services = [SignInByPhoneSendCodeService, SignInByPhoneConfirmCodeService, SignUpByPhoneCreateUserService, LoginService, UserBlockingService, NotificationService, UserUnblockSchedulerService, RegisterCategoryHandler]


const controllers = [UserController, ClientOrderRequestController, CategoryController];

@Module({
  imports: [...thirdPartyServices, TaxiContextDomainRepositoriesModule, CloudCacheStorageModule.forRootAsync(redisConfigFactory), WhatsAppModule],
  providers: [...services],
  controllers: [...controllers],
  exports: [UserBlockingService, UserUnblockSchedulerService],
})
export class UserModule {}
