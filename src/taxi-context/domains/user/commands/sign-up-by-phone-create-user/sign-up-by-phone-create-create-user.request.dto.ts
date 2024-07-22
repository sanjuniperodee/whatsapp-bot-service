import { PhoneValidator } from '@infrastructure/validators';
import { IsDefined, IsString, Validate } from 'class-validator';

export class SignUpByPhoneCreateUserRequest {
  @IsDefined()
  @IsString()
  readonly firstName: string;

  @IsDefined()
  @IsString()
  readonly lastName: string;

  @IsDefined()
  @Validate(PhoneValidator)
  readonly phone: string;
}
