import {
  IsDefined,
  IsLatitude,
  IsLongitude,
  IsNotEmpty, IsUUID, IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLocationRequest {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('4')
  readonly orderId?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsLongitude()
  readonly lng: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsLatitude()
  readonly lat: string;
}
