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

export class CreateOrderRequest {
  @IsNotEmpty()
  @IsDefined()
  @IsString()
  readonly phone: string;

  @IsNotEmpty()
  @IsDefined()
  @IsString()
  readonly from: string;

  @IsNotEmpty()
  @IsDefined()
  @IsString()
  readonly to: string;

  @IsNotEmpty()
  @IsDefined()
  @IsLongitude()
  readonly lng: number;

  @IsNotEmpty()
  @IsDefined()
  @IsLatitude()
  readonly lat: number;

  @IsNotEmpty()
  @IsDefined()
  @IsNumber()
  readonly price: number;

  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @IsEnum(OrderType)
  readonly orderType: OrderType;

  @IsNotEmpty()
  @IsDefined()
  @IsString()
  readonly socketId: string;
}
