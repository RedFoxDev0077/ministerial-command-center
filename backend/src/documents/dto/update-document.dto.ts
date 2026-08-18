import { PartialType } from '@nestjs/swagger';
import { CreateDocumentDto } from './create-document.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus } from './create-document.dto';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {
  @ApiPropertyOptional({ enum: DocumentStatus, description: 'Document status' })
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @ApiPropertyOptional({ description: 'AI-generated summary' })
  @IsOptional()
  aiSummary?: string;

  @ApiPropertyOptional({ description: 'AI-proposed response' })
  @IsOptional()
  aiProposedResponse?: string;

  @ApiPropertyOptional({ description: 'AI key points', type: [String] })
  @IsOptional()
  aiKeyPoints?: string[];

  @ApiPropertyOptional({ description: 'QR code for document' })
  @IsOptional()
  qrCode?: string;
}
