import { UserEntity } from '@domain/user/domain/entities/user.entity';

export class SignInByPhoneConfirmCodeResponse {
  user?: UserEntity;

  refreshToken?: string;

  token?: string;
}
