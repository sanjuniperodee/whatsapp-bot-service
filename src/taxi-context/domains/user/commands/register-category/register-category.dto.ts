import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { OrderType } from '@infrastructure/enums';

export class RegisterCategoryDto {
  @IsString()
  @IsNotEmpty()
  governmentNumber: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsString()
  @IsNotEmpty()
  SSN: string;

  @IsEnum(OrderType)
  type: OrderType;

  @IsString()
  @IsNotEmpty()
  color: string;

  @IsString()
  @IsNotEmpty()
  brand: string;
}
