import { IsNotEmpty, IsString } from 'class-validator';

export class ProfileEditPhoneRequest {
  @IsNotEmpty()
  @IsString()
  readonly phone: string;
}
