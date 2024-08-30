import {
  IsDefined,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeOrderStatus {
  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsUUID('4')
  readonly driverId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsUUID('4')
  readonly orderId: string;
}
