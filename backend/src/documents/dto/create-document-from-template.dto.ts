import { IsString, IsObject, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentFromTemplateDto {
  @ApiProperty({ description: 'Template ID to use' })
  @IsString()
  templateId: string;

  @ApiProperty({
    description: 'Variables to replace in template',
    example: {
      numero: '025-MT-038-051',
      fecha: '11 de febrero de 2026',
      ciudad: 'Malabo',
      destinatario: 'Sr. Juan Pérez',
      asunto: 'Solicitud de información',
      contenido: 'Me dirijo a usted para...',
    },
  })
  @IsObject()
  variables: Record<string, string>;

  @ApiPropertyOptional({ description: 'Document title (optional, uses asunto if not provided)' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Entity ID (optional)' })
  @IsString()
  @IsOptional()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Responsible user ID (optional)' })
  @IsString()
  @IsOptional()
  responsibleId?: string;

  @ApiPropertyOptional({ description: 'Direction type (optional, defaults to INCOMING)' })
  @IsEnum(['INCOMING', 'OUTGOING'])
  @IsOptional()
  direction?: 'INCOMING' | 'OUTGOING';
}
