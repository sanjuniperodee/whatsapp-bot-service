import { IsString, IsNotEmpty } from 'class-validator';

export class AcceptOrderDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;
}
