import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';

/**
 * DTO for updating workflow stage properties
 */
export class UpdateStageDto {
  @ApiPropertyOptional({ description: 'Custom deadline for this stage' })
  @IsDateString()
  @IsOptional()
  customDeadline?: string;

  @ApiPropertyOptional({
    description: 'Deadline in hours from now',
    example: 48,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  deadlineHours?: number;

  @ApiPropertyOptional({ description: 'Notes about this stage' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Stage-specific metadata (JSON)',
    example: { priority: 'high', reviewedBy: 'John Doe' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
