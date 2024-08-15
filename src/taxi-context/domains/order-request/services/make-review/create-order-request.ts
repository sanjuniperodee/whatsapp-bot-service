import { IsDefined, IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MakeReviewRequest {

  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsUUID('4')
  readonly orderRequestId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsString()
  readonly comment: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsNumber()
  readonly rating: number;
}
