import { IsEnum, IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';
import { OrderType } from '@infrastructure/enums';

export class CreateOrderDto {
  @IsEnum(OrderType)
  orderType: OrderType;

  @IsString()
  @IsNotEmpty()
  from: string;

  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  fromMapboxId: string;

  @IsString()
  @IsNotEmpty()
  toMapboxId: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsNumber()
  price: number;

  @IsString()
  @IsOptional()
  comment?: string;
}
