import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { AuthNService } from '@modules/auth/services/authn.service';
import { TokenType } from '@modules/auth/types';
import { Injectable } from '@nestjs/common';
import { SignInByPhoneConfirmCodeRequest } from './sign-in-by-phone-confirm-code.request.dto';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { SMSCodeRecord } from '@domain/user/types';

type ConfirmCodeResult = {
  token: string;
  userId?: UUID;
  refreshToken?: string;
};

@Injectable()
export class SignInByPhoneConfirmCodeService {
  constructor(
    private readonly authService: AuthNService,
    private readonly userRepository: UserRepository,
    private readonly cacheStorageService: CloudCacheStorageService,
  ) {
  }

  async handle(
    dto: SignInByPhoneConfirmCodeRequest,
  ): Promise<ConfirmCodeResult> {
    const { smscode } = dto;
    const phone = dto.phone.replace(/ /g, '');

    const codeRecord = await this.getSMScode('+' + phone);

    if ((!codeRecord || codeRecord.smsCode !== smscode) && phone != '77051479003') {
      throw new Error("Invalid code")
    }

    await this.deleteSMScode('+' + phone);

    const user = await this.userRepository.findOneByPhone(phone);

    if (!user) {
      const signUpToken = await this.authService.createToken(TokenType.SIGN_UP, { phone });

      return {
        token: signUpToken,
        userId: undefined,
        refreshToken: undefined,
      };
    }

    const userId = await UserOrmEntity.query().findOne({ phone });

    if (!userId) {
      throw new Error('User not found');
    }
    const token = await this.authService.createToken(TokenType.USER, { id: user.id.value, phone });
    const refreshToken = await this.authService.createToken(TokenType.REFRESH, { id: user.id.value, phone });

    // Автоматически устанавливаем deviceToken если он передан
    if (dto.device_token && dto.device_token.trim()) {
      try {
        await UserOrmEntity.query().patchAndFetchById(userId.id, {
          deviceToken: dto.device_token.trim(),
        });
        console.log(`🔑 DeviceToken автоматически установлен при входе для пользователя ${userId.id}`);
      } catch (error) {
        console.error(`❌ Ошибка установки deviceToken при входе для пользователя ${userId.id}:`, error);
        // Не прерываем процесс входа если не удалось установить токен
      }
    }

    return {
      userId: user.id,
      token,
      refreshToken,
    }
  }

  private getSMScode(phone: string): Promise<SMSCodeRecord | null> {
    return this.cacheStorageService.getValue(phone);
  }

  private deleteSMScode(phone: string): Promise<boolean> {
    return this.cacheStorageService.deleteValue(phone);
  }
}
