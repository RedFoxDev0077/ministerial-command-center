import { IsString, IsEnum, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationType {
  DOCUMENT_DECREED = 'DOCUMENT_DECREED',
  DOCUMENT_ASSIGNED = 'DOCUMENT_ASSIGNED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  SIGNATURE_REQUIRED = 'SIGNATURE_REQUIRED',
  SIGNATURE_COMPLETED = 'SIGNATURE_COMPLETED',
  DEADLINE_REMINDER = 'DEADLINE_REMINDER',
  DEADLINE_OVERDUE = 'DEADLINE_OVERDUE',
  SYSTEM = 'SYSTEM',
}

export class CreateNotificationDto {
  @ApiProperty({ description: 'User ID (CUID) to send notification to' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Related resource ID' })
  @IsString()
  @IsOptional()
  relatedId?: string;

  @ApiPropertyOptional({ description: 'Related resource type' })
  @IsString()
  @IsOptional()
  relatedType?: string;
}
