import { IsEmail, IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  ADMIN = 'ADMIN',
  GABINETE = 'GABINETE',
  REVISOR = 'REVISOR',
  LECTOR = 'LECTOR',
}

export class CreateUserDto {
  @ApiProperty({ description: 'User email address', example: 'usuario@mttsia.gob.gq' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password (min 6 characters)', example: 'Password123!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'First name', example: 'Juan' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Pérez' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Job position', example: 'Director General', required: false })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ description: 'Phone number', example: '+240222123456', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'WhatsApp number', example: '+240222123456', required: false })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.LECTOR,
    default: UserRole.LECTOR
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ description: 'Department ID', example: 'clx1234567890' })
  @IsString()
  departmentId: string;
}
