import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

/**
 * Self-registration payload.
 *
 * NOTE: `role` is deliberately NOT accepted here. Public registration always
 * creates a LECTOR (read-only) account; only an ADMIN can grant a higher role,
 * via POST /api/users or PATCH /api/users/:id. Accepting a client-supplied role
 * on a public endpoint would let anyone self-provision as ADMIN — which in this
 * system also means Minister signature authority (see MinisterValidationService).
 */
export class RegisterDto {
  @ApiProperty({ example: 'user@mttsia.gob.gq' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'dept_123' })
  @IsString()
  departmentId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}
