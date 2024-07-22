import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { AuthNService } from '@modules/auth/services/authn.service';
import { TokenType } from '@modules/auth/types';
import { Injectable } from '@nestjs/common';
import { SignInByPhoneConfirmCodeRequest } from './sign-in-by-phone-confirm-code.request.dto';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';

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
  ) {}

  async handle(
    dto: SignInByPhoneConfirmCodeRequest,
  ): Promise<ConfirmCodeResult> {
    const { phone, smscode } = dto;

    const user = await this.userRepository.findOneByPhone(phone);

    if (!user) {
      const signUpToken = await this.authService.createToken(TokenType.SIGN_UP, { phone });

      return {
        token: signUpToken,
        userId: undefined,
        refreshToken: undefined,
      }
    }

    const codeRecord = user.getPropsCopy().lastSms;
    if (!codeRecord || codeRecord !== smscode) {
      throw new Error("Invalid code")
    }

    const userId = user.id.value;

    if (!userId) {
      throw new Error('User not found');
    }
    const token = await this.authService.createToken(TokenType.USER, { id: user.id.value, phone });
    const refreshToken = await this.authService.createToken(TokenType.REFRESH, { id: user.id.value, phone });

    return {
      userId: user.id,
      token,
      refreshToken,
    }
  }
}
