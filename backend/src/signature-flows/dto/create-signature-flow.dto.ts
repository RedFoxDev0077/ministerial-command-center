import { IsString, IsNotEmpty, IsOptional, IsArray, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum NotificationMethod {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  BOTH = 'BOTH',
}

export class CreateSignatureFlowDto {
  @ApiProperty({ description: 'Document ID to send for signature' })
  @IsString()
  @IsNotEmpty()
  documentId: string;

  @ApiPropertyOptional({ description: 'Title for the signature flow' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Description or instructions for signers' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Array of user IDs who will sign the document', type: [String] })
  @IsArray()
  @IsNotEmpty()
  userIds: string[];

  @ApiPropertyOptional({ description: 'Whether to send notification to signers', default: true })
  @IsBoolean()
  @IsOptional()
  sendNotification?: boolean;

  @ApiPropertyOptional({ description: 'Notification method', enum: NotificationMethod })
  @IsEnum(NotificationMethod)
  @IsOptional()
  notificationMethod?: NotificationMethod;

  @ApiPropertyOptional({ description: 'Custom message for signers' })
  @IsString()
  @IsOptional()
  message?: string;
}
