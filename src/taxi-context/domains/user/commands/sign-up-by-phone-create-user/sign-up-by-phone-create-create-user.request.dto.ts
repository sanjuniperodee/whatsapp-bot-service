import { PhoneValidator } from '@infrastructure/validators';
import { IsDefined, IsString, Validate, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // Import ApiModelProperty

export class SignUpByPhoneCreateUserRequest {
  @ApiProperty()
  @IsDefined()
  @IsString()
  readonly firstName: string;

  @ApiProperty()
  @IsDefined()
  @IsString()
  readonly lastName: string;

  @ApiProperty()
    @IsDefined()
  @Validate(PhoneValidator)
  readonly phone: string;

  @ApiPropertyOptional({ description: 'Device token for push notifications' })
  @IsOptional()
  @IsString()
  readonly device_token?: string;
}
