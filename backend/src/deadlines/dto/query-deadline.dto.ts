import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, DeadlineStatus } from '@prisma/client';

export class QueryDeadlineDto {
  @ApiPropertyOptional({ description: 'Filter by document ID' })
  @IsString()
  @IsOptional()
  documentId?: string;

  @ApiPropertyOptional({ description: 'Filter by expediente ID' })
  @IsString()
  @IsOptional()
  expedienteId?: string;

  @ApiPropertyOptional({
    enum: DeadlineStatus,
    description: 'Filter by deadline status'
  })
  @IsEnum(DeadlineStatus)
  @IsOptional()
  status?: DeadlineStatus;

  @ApiPropertyOptional({
    enum: Priority,
    description: 'Filter by priority level'
  })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiPropertyOptional({ description: 'Filter deadlines due after this date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  dueDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter deadlines due before this date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  dueDateTo?: string;
}
