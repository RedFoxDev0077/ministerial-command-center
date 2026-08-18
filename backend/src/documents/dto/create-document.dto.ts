import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DocumentDirection {
  IN = 'IN',
  OUT = 'OUT',
}

export enum DocumentClassification {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

export enum DocumentPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
  REJECTED = 'REJECTED',
}

export class CreateDocumentDto {
  @ApiProperty({ description: 'Document title', minLength: 3, maxLength: 500 })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  title: string;

  @ApiProperty({ description: 'Document type (Oficio, Memorando, Circular, etc.)' })
  @IsString()
  type: string;

  @ApiProperty({ enum: DocumentDirection, description: 'Document direction (IN/OUT)' })
  @IsEnum(DocumentDirection)
  direction: DocumentDirection;

  @ApiProperty({ enum: DocumentClassification, description: 'Document classification' })
  @IsEnum(DocumentClassification)
  classification: DocumentClassification;

  @ApiPropertyOptional({ description: 'Channel (physical, email, etc.)' })
  @IsString()
  @IsOptional()
  channel?: string;

  @ApiPropertyOptional({ description: 'Origin/source of the document' })
  @IsString()
  @IsOptional()
  origin?: string;

  @ApiPropertyOptional({ description: 'Entity ID (CUID) - required for non-draft documents' })
  @IsString()
  @MinLength(20)
  @IsOptional()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Responsible user ID (CUID) - required for non-draft documents' })
  @IsString()
  @MinLength(20)
  @IsOptional()
  responsibleId?: string;

  @ApiPropertyOptional({ enum: DocumentPriority, description: 'Document priority' })
  @IsEnum(DocumentPriority)
  @IsOptional()
  priority?: DocumentPriority;

  @ApiPropertyOptional({ description: 'Document content' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'Expediente ID (CUID)' })
  @IsString()
  @IsOptional()
  expedienteId?: string;

  @ApiPropertyOptional({ description: 'Whether document is a draft', default: false })
  @IsBoolean()
  @IsOptional()
  isDraft?: boolean;

  @ApiPropertyOptional({ description: 'Array of tag names', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Received at timestamp' })
  @IsOptional()
  receivedAt?: Date;

  @ApiPropertyOptional({ description: 'Sent at timestamp' })
  @IsOptional()
  sentAt?: Date;

  // Decreto Ministerial specific fields
  @ApiPropertyOptional({ description: 'Whether this is a decreto ministerial', default: false })
  @IsBoolean()
  @IsOptional()
  isDecreto?: boolean;

  @ApiPropertyOptional({ description: 'Considerandos (considerations) for decreto', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  considerandos?: string[];

  @ApiPropertyOptional({ description: 'Articulado (articles) for decreto', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  articulado?: string[];

  @ApiPropertyOptional({ description: 'Disposiciones transitorias (transitional provisions)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  disposiciones?: string[];

  @ApiPropertyOptional({ description: 'Vigencia (validity/effective date) for decreto' })
  @IsOptional()
  vigencia?: Date;

  // Official PDF header fields
  @ApiPropertyOptional({ description: 'Sub-department e.g. Dirección General de Puertos' })
  @IsString()
  @IsOptional()
  subDepartment?: string;

  @ApiPropertyOptional({ description: 'Reference/section code e.g. Puerto Privados' })
  @IsString()
  @IsOptional()
  referenceCode?: string;

  @ApiPropertyOptional({ description: 'Signer title e.g. El Director General' })
  @IsString()
  @IsOptional()
  signerTitle?: string;

  @ApiPropertyOptional({ description: 'Recipient full title for footer' })
  @IsString()
  @IsOptional()
  recipientTitle?: string;
}
