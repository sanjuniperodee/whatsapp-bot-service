import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString } from 'class-validator';

export class FirebaseNotificationDto {
  @ApiProperty({ example: 'deviceToken' })
  @IsString()
  @IsDefined()
  deviceToken: string;

  @ApiProperty({ example: 'title' })
  @IsString()
  @IsDefined()
  title: string;

  @ApiProperty({ example: 'body' })
  @IsString()
  @IsDefined()
  body: string;
}
