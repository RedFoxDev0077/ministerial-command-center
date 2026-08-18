import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

/**
 * DTO for advancing a document to the next workflow stage
 */
export class AdvanceStageDto {
  @ApiPropertyOptional({ description: 'Notes about stage completion' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Stage-specific metadata (JSON)',
    example: { reviewedBy: 'John Doe', approvalDate: '2026-02-05' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'IDs of attachments related to this stage',
    type: [String],
  })
  @IsOptional()
  attachmentIds?: string[];
}
