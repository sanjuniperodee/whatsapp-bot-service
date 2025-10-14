import { IsString, IsNotEmpty } from 'class-validator';

export class GetClientActiveOrderDto {
  @IsString()
  @IsNotEmpty()
  clientId: string;
}
