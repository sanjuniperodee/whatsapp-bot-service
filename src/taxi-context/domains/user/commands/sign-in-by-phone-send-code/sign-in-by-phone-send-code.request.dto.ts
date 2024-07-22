import { PhoneValidator } from '@infrastructure/validators';
import { Validate } from 'class-validator';

export class SignInByPhoneSendCodeRequest {
  @Validate(PhoneValidator)
  readonly phone: string;
}
