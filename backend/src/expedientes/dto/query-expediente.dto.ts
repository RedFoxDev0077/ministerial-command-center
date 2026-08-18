import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum ExpStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export class QueryExpedienteDto {
  @ApiProperty({ required: false, description: 'Número de página' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, description: 'Registros por página' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({ required: false, description: 'Búsqueda por título o código' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: ExpStatus, required: false, description: 'Filtrar por estado' })
  @IsOptional()
  @IsEnum(ExpStatus)
  status?: ExpStatus;

  @ApiProperty({ required: false, description: 'Ordenar por campo' })
  @IsOptional()
  @IsString()
  sort?: string = 'createdAt';

  // React Query parameters (optional to prevent validation errors)
  @IsOptional()
  client?: any;

  @IsOptional()
  queryKey?: any;

  @IsOptional()
  signal?: any;

  @IsOptional()
  meta?: any;
}
