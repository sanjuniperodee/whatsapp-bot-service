import {
  IsDefined,
  IsLatitude,
  IsLongitude,
  IsNotEmpty, IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLocationRequest {
  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsUUID('4')
  readonly clientId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsLongitude()
  readonly lng: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsLatitude()
  readonly lat: number;
}
