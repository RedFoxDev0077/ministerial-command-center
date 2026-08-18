import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SearchDocumentDto {
  @ApiProperty({
    description: 'Search query for full-text search',
    example: 'informe técnico telecomunicaciones',
    required: true,
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Page number',
    example: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    description: 'Results per page',
    example: 20,
    default: 20,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiProperty({
    description: 'Filter by document direction',
    example: 'IN',
    enum: ['IN', 'OUT'],
    required: false,
  })
  @IsOptional()
  @IsString()
  direction?: 'IN' | 'OUT';

  @ApiProperty({
    description: 'Filter by classification',
    example: 'INTERNAL',
    enum: ['INTERNAL', 'EXTERNAL'],
    required: false,
  })
  @IsOptional()
  @IsString()
  classification?: 'INTERNAL' | 'EXTERNAL';

  @ApiProperty({
    description: 'Filter by status',
    example: 'PENDING',
    enum: ['DRAFT', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED', 'REJECTED'],
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: 'DRAFT' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED' | 'REJECTED';

  @ApiProperty({
    description: 'Filter by entity ID',
    example: 'clx1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  entityId?: string;
}
