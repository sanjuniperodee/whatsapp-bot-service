import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { ApiProperty } from '@nestjs/swagger';

export class OrderRequestDto {
  @ApiProperty()
  id: UUID;

  @ApiProperty()
  driverId: UUID;

  @ApiProperty()
  orderType: string;

  @ApiProperty()
  startTime?: Date;

  @ApiProperty()
  arrivalTime?: Date;

  @ApiProperty()
  lat?: number;

  @ApiProperty()
  lng?: number;

  @ApiProperty()
  comment?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  rejectReason?: string;
}
