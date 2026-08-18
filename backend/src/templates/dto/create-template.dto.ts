import { IsString, IsEnum, IsBoolean, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TemplateType {
  OFICIO = 'OFICIO',
  MEMORANDO = 'MEMORANDO',
  CIRCULAR = 'CIRCULAR',
  RESPUESTA = 'RESPUESTA',
  DECRETO = 'DECRETO',
  RESOLUCION = 'RESOLUCION',
}

export class CreateTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: TemplateType, description: 'Template type' })
  @IsEnum(TemplateType)
  type: TemplateType;

  @ApiProperty({ description: 'Template content with {{variables}}' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Variables (auto-extracted if not provided)' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variables?: string[];

  @ApiPropertyOptional({ description: 'Is default template' })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
