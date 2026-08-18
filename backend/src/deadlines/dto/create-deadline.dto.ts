import { IsString, IsOptional, IsEnum, IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority } from '@prisma/client';

export class CreateDeadlineDto {
  @ApiProperty({ description: 'Title of the deadline' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Description of the deadline' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Due date for the deadline (ISO 8601 format)' })
  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @ApiProperty({
    enum: Priority,
    default: Priority.MEDIUM,
    description: 'Priority level of the deadline'
  })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiPropertyOptional({ description: 'Related document ID' })
  @IsString()
  @IsOptional()
  documentId?: string;

  @ApiPropertyOptional({ description: 'Related expediente ID' })
  @IsString()
  @IsOptional()
  expedienteId?: string;
}
