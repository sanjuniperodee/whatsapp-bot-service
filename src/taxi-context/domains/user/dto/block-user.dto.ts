import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';

export class BlockUserDto {
  @ApiProperty({ 
    description: 'ID пользователя для блокировки',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  userId: string;

  @ApiProperty({ 
    description: 'Дата и время окончания блокировки (если не указано - постоянная блокировка)',
    example: '2024-12-31T23:59:59.000Z',
    required: false
  })
  @IsOptional()
  @IsDateString()
  blockedUntil?: string;

  @ApiProperty({ 
    description: 'Причина блокировки',
    example: 'Нарушение правил использования сервиса'
  })
  @IsString()
  reason: string;
} 