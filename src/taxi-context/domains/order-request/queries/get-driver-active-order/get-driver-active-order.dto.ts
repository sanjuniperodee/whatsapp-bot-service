import { IsString, IsNotEmpty } from 'class-validator';

export class GetDriverActiveOrderDto {
  @IsString()
  @IsNotEmpty()
  driverId: string;
}
