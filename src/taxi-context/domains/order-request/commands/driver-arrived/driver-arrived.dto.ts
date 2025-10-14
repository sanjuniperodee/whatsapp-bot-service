import { IsString, IsNotEmpty } from 'class-validator';

export class DriverArrivedDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;
}
