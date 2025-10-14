import { IsString, IsNotEmpty } from 'class-validator';

export class StartOrderDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;
}
