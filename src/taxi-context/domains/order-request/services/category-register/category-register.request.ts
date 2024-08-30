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
  readonly model: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsString()
  readonly brand: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsString()
  readonly color: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsString()
  readonly SSN: string;
}
