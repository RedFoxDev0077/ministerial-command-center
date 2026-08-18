import { IsString, IsOptional, IsEnum, IsEmail, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum EntityType {
  INTERNAL_DEPARTMENT = 'INTERNAL_DEPARTMENT',
  PUBLIC_COMPANY = 'PUBLIC_COMPANY',
  PRIVATE_COMPANY = 'PRIVATE_COMPANY',
  GOVERNMENT_MINISTRY = 'GOVERNMENT_MINISTRY',
  INTERNATIONAL_ORG = 'INTERNATIONAL_ORG',
  CITIZEN = 'CITIZEN',
  OTHER = 'OTHER',
}

export enum Classification {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

export class CreateEntityDto {
  @ApiProperty({ description: 'Entity name', example: 'Ministerio de Salud' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Short name or acronym', example: 'MINSALUD', required: false })
  @IsOptional()
  @IsString()
  shortName?: string;

  @ApiProperty({
    description: 'Entity type',
    enum: EntityType,
    example: EntityType.GOVERNMENT_MINISTRY,
  })
  @IsEnum(EntityType)
  type: EntityType;

  @ApiProperty({
    description: 'Classification',
    enum: Classification,
    example: Classification.EXTERNAL,
    default: Classification.EXTERNAL,
  })
  @IsEnum(Classification)
  classification: Classification;

  @ApiProperty({ description: 'Physical address', example: 'Calle Principal, Malabo', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'Contact phone', example: '+240222123456', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Contact email', example: 'info@minsalud.gq', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Website URL', example: 'https://www.minsalud.gq', required: false })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiProperty({ description: 'Entity description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
