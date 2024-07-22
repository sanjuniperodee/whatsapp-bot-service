import { PhoneValidator } from '@infrastructure/validators';
import { IsDefined, IsString, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // Import ApiModelProperty

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
}
