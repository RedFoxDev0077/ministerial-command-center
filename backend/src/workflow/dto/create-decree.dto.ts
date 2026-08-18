import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  ArrayMinSize,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';

/**
 * DTO for creating a decree with configurable deadline
 *
 * Client requirement: "Es a mi criterio" (At Minister's discretion)
 * Minister can set custom deadline for each decree
 */
export class CreateDecreeDto {
  @ApiProperty({
    description: 'Department IDs to decree document to',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one department must be selected' })
  departmentIds: string[];

  @ApiPropertyOptional({
    description: 'Custom deadline date (ISO format)',
    example: '2026-02-07T18:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  customDeadline?: string;

  @ApiPropertyOptional({
    description: 'Deadline in hours from now (if no custom deadline)',
    example: 48,
    default: 48,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  deadlineHours?: number;

  @ApiPropertyOptional({
    description: 'Additional instructions or notes for the decree',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
