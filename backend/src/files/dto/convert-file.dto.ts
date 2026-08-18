import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ConversionFormat {
  PDF = 'pdf',
  DOCX = 'docx',
  XLSX = 'xlsx',
}

export class ConvertFileDto {
  @ApiProperty({
    description: 'Target format',
    enum: ConversionFormat,
    example: 'pdf'
  })
  @IsEnum(ConversionFormat)
  targetFormat: ConversionFormat;
}

export interface ConversionJob {
  fileId: string;
  sourceFormat: string;
  targetFormat: ConversionFormat;
  userId: string;
}

export interface ConversionResult {
  success: boolean;
  fileId: string;
  convertedFileId?: string;
  error?: string;
  duration?: number;
}
