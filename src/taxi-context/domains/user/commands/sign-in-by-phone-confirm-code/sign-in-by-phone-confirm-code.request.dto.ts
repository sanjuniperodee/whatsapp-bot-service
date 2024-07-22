import { PhoneValidator } from '@infrastructure/validators';
import { SmscodeValidator } from '@infrastructure/validators/smscode.validator';
import { IsString, Validate } from 'class-validator';

export class SignInByPhoneConfirmCodeRequest {
  @Validate(PhoneValidator)
  @IsString()
  readonly phone: string;

  @Validate(SmscodeValidator)
  @Validate(PhoneValidator)
  readonly smscode: string;
}
