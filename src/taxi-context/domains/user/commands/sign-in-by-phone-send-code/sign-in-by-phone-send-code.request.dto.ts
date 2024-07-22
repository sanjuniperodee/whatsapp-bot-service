import { PhoneValidator } from '@infrastructure/validators';
import { Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInByPhoneSendCodeRequest {
  @ApiProperty()
  @Validate(PhoneValidator)
  readonly phone: string;
}
