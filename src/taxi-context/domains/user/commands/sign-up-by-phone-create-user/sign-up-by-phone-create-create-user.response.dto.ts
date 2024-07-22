import { UserEntity } from '@domain/user/domain/entities/user.entity';

export class SignUpByPhoneCreateUserResponse{
  user?: UserEntity;

  token?: string;

  refreshToken?: string;
}
