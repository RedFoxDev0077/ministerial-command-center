import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationMethod {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  BOTH = 'BOTH',
}

export class DecreeDocumentDto {
  @ApiPropertyOptional({ description: 'Array of department IDs (internal routing)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  departmentIds?: string[];

  @ApiPropertyOptional({ description: 'External email address to send the decree PDF to' })
  @IsEmail()
  @IsOptional()
  externalEmail?: string;

  @ApiPropertyOptional({ description: 'Whether to send internal notification', default: false })
  @IsBoolean()
  @IsOptional()
  sendNotification?: boolean;

  @ApiPropertyOptional({ enum: NotificationMethod, description: 'Notification method' })
  @IsEnum(NotificationMethod)
  @IsOptional()
  notificationMethod?: NotificationMethod;

  @ApiPropertyOptional({ description: 'Optional message for notification' })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({ description: "Minister's written decree order/annotation saved on the document" })
  @IsString()
  @IsOptional()
  decreeNote?: string;
}
