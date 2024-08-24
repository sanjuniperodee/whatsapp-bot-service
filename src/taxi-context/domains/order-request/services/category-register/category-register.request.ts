import {
  IsDefined,
  IsNotEmpty,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderType } from '@infrastructure/enums';

export class CategoryRegisterRequest {
  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsString()
  readonly governmentNumber: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsString()
  readonly type: OrderType;

  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsString()
  readonly carModel: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsString()
  readonly iin: string;
}
