import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ProfileEditNameRequest {
  @IsNotEmpty()
  @IsString()
  readonly firstName: string;

  @IsNotEmpty()
  @IsString()
  readonly lastName: string;

  @IsOptional()
  @IsString()
  readonly middleName?: string;
}
