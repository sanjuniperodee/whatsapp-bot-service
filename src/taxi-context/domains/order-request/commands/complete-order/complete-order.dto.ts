import { IsString, IsNotEmpty } from 'class-validator';

export class CompleteOrderDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;
}
