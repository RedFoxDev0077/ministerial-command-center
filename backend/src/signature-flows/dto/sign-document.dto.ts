import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SignDocumentDto {
  @ApiPropertyOptional({ description: 'Digital signature data (base64)' })
  @IsString()
  @IsOptional()
  signatureData?: string;

  @ApiPropertyOptional({ description: 'Optional comment or note when signing' })
  @IsString()
  @IsOptional()
  comment?: string;
}
