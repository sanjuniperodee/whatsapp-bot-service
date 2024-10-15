import {
  IsDefined,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetDeviceTokenRequest {
  @ApiProperty()
  @IsDefined()
  @IsString()
  readonly device: string;
}
