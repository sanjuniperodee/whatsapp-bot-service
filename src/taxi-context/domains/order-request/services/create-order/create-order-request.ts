import { IsDefined, IsEnum, IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OrderType } from '@infrastructure/enums';

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


  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @IsEnum(OrderType)
  readonly orderType: OrderType;
}
