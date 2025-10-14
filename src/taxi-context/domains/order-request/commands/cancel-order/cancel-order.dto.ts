import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CancelOrderDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
