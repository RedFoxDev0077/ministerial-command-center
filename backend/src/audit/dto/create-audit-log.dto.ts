import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AuditAction {
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  REGISTER = 'REGISTER',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',

  // Documents
  CREATE_DOCUMENT = 'CREATE_DOCUMENT',
  UPDATE_DOCUMENT = 'UPDATE_DOCUMENT',
  DELETE_DOCUMENT = 'DELETE_DOCUMENT',
  VIEW_DOCUMENT = 'VIEW_DOCUMENT',
  DECREE_DOCUMENT = 'DECREE_DOCUMENT',
  ASSIGN_DOCUMENT = 'ASSIGN_DOCUMENT',

  // Users
  CREATE_USER = 'CREATE_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',

  // Departments
  CREATE_DEPARTMENT = 'CREATE_DEPARTMENT',
  UPDATE_DEPARTMENT = 'UPDATE_DEPARTMENT',
  DELETE_DEPARTMENT = 'DELETE_DEPARTMENT',

  // Entities
  CREATE_ENTITY = 'CREATE_ENTITY',
  UPDATE_ENTITY = 'UPDATE_ENTITY',
  DELETE_ENTITY = 'DELETE_ENTITY',

  // Files
  UPLOAD_FILE = 'UPLOAD_FILE',
  DELETE_FILE = 'DELETE_FILE',
  DOWNLOAD_FILE = 'DOWNLOAD_FILE',

  // Signature
  SIGN_DOCUMENT = 'SIGN_DOCUMENT',
  REJECT_SIGNATURE = 'REJECT_SIGNATURE',
}

export class CreateAuditLogDto {
  @ApiProperty({ enum: AuditAction, description: 'Action performed' })
  @IsString()
  action: string;

  @ApiPropertyOptional({ description: 'Resource type (document, user, file, etc.)' })
  @IsString()
  @IsOptional()
  resourceType?: string;

  @ApiPropertyOptional({ description: 'Resource ID' })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiPropertyOptional({ description: 'Changes made (before/after)' })
  @IsObject()
  @IsOptional()
  changes?: any;

  @ApiPropertyOptional({ description: 'IP address' })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent' })
  @IsString()
  @IsOptional()
  userAgent?: string;
}
