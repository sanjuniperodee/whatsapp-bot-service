import { PhoneValidator } from '@infrastructure/validators';
import { SmscodeValidator } from '@infrastructure/validators/smscode.validator';
import { IsString, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInByPhoneConfirmCodeRequest {
  @ApiProperty()
  @Validate(PhoneValidator)
  @IsString()
  readonly phone: string;

  @ApiProperty()
  @Validate(SmscodeValidator)
  @Validate(PhoneValidator)
  readonly smscode: string;
}
