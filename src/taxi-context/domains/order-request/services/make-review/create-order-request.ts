import { IsDefined, IsNotEmpty, IsNumber, IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MakeReviewRequest {

  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsUUID('4')
  readonly orderRequestId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  readonly comment?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsNumber()
  readonly rating: number;
}
