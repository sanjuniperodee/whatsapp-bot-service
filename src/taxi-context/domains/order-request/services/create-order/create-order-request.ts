import {
  IsDefined,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { OrderType } from '@infrastructure/enums';
import { IsNull } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderRequest {
  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsString()
  readonly phone: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsString()
  readonly from: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsString()
  readonly to: string;

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

  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsNumber()
  readonly price: number;

  @ApiProperty()
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @IsEnum(OrderType)
  readonly orderType: OrderType;

  @ApiProperty()
  @IsDefined()
  @IsString()
  readonly comment: string;
}
