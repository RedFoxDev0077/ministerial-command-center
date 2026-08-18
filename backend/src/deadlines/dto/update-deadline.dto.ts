import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, DeadlineStatus } from '@prisma/client';

export class UpdateDeadlineDto {
  @ApiPropertyOptional({ description: 'Title of the deadline' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Description of the deadline' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Due date for the deadline (ISO 8601 format)' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({
    enum: Priority,
    description: 'Priority level of the deadline'
  })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiPropertyOptional({
    enum: DeadlineStatus,
    description: 'Status of the deadline'
  })
  @IsEnum(DeadlineStatus)
  @IsOptional()
  status?: DeadlineStatus;

  @ApiPropertyOptional({ description: 'Related document ID' })
  @IsString()
  @IsOptional()
  documentId?: string;

  @ApiPropertyOptional({ description: 'Related expediente ID' })
  @IsString()
  @IsOptional()
  expedienteId?: string;
}
