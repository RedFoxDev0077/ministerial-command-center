import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateFileVersionDto {
  @ApiProperty({ description: 'File ID to create a version for' })
  @IsString()
  fileId: string;

  @ApiPropertyOptional({ description: 'Optional comment about what changed' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class RestoreFileVersionDto {
  @ApiPropertyOptional({ description: 'Optional comment about the restoration' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class FileVersionResponseDto {
  id: string;
  fileId: string;
  versionNumber: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  hash?: string;
  storagePath: string;
  storageUrl?: string;
  comment?: string;
  uploadedById: string;
  uploadedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: Date;
}

export class FileVersionHistoryResponseDto {
  fileId: string;
  currentVersion: number;
  totalVersions: number;
  versions: FileVersionResponseDto[];
}
