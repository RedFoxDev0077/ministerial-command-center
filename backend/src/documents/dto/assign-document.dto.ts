import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignDocumentDto {
  @ApiProperty({ description: 'User ID (CUID) to assign document to' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Optional note for assignment' })
  @IsString()
  @IsOptional()
  note?: string;
}
