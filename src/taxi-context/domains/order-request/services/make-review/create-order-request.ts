import { IsDefined, IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';

export class MakeReviewRequest {
  @IsNotEmpty()
  @IsDefined()
  @IsUUID('4')
  readonly orderRequestId: string;

  @IsNotEmpty()
  @IsDefined()
  @IsString()
  readonly comment: string;

  @IsNotEmpty()
  @IsDefined()
  @IsNumber()
  readonly rating: number;
}
