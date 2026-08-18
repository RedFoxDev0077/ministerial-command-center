import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentDirection, DocumentClassification, DocumentStatus, DocumentPriority } from './create-document.dto';

export class QueryDocumentDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search in title, correlative number' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: DocumentDirection, description: 'Filter by direction' })
  @IsOptional()
  @IsEnum(DocumentDirection)
  direction?: DocumentDirection;

  @ApiPropertyOptional({ enum: DocumentStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({ enum: DocumentClassification, description: 'Filter by classification' })
  @IsOptional()
  @IsEnum(DocumentClassification)
  classification?: DocumentClassification;

  @ApiPropertyOptional({ description: 'Filter by entity ID (CUID)' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Filter by responsible user ID (CUID)' })
  @IsOptional()
  @IsString()
  responsibleId?: string;

  @ApiPropertyOptional({ enum: DocumentPriority, description: 'Filter by priority' })
  @IsOptional()
  @IsEnum(DocumentPriority)
  priority?: DocumentPriority;

  @ApiPropertyOptional({ description: 'Filter by has AI summary', type: Boolean })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasAiSummary?: boolean;

  @ApiPropertyOptional({ description: 'Filter by expediente ID (CUID)' })
  @IsOptional()
  @IsString()
  expedienteId?: string;

  @ApiPropertyOptional({ description: 'Filter from date (ISO 8601)' })
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to date (ISO 8601)' })
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'createdAt:desc' })
  @IsOptional()
  @IsString()
  sort?: string = 'createdAt:desc';

  @ApiPropertyOptional({ description: 'Filter draft documents', type: Boolean })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isDraft?: boolean;

  @ApiPropertyOptional({ description: 'Filter by created by user ID (CUID)' })
  @IsOptional()
  @IsString()
  createdById?: string;
}
