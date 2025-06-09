import { PhoneValidator } from '@infrastructure/validators';
import { SmscodeValidator } from '@infrastructure/validators/smscode.validator';
import { IsString, Validate, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignInByPhoneConfirmCodeRequest {
  @ApiProperty()
  @Validate(PhoneValidator)
  @IsString()
  readonly phone: string;

  @ApiProperty()
  @Validate(SmscodeValidator)
  @Validate(PhoneValidator)
  readonly smscode: string;

  @ApiPropertyOptional({ description: 'Device token for push notifications' })
  @IsOptional()
  @IsString()
  readonly device_token?: string;
}
