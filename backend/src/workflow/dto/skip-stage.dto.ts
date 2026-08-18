import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

/**
 * DTO for skipping a workflow stage (admin only)
 *
 * Client requirement: "se requiere la aprobación del administrador para omitirla"
 * Admin approval required with reason
 */
export class SkipStageDto {
  @ApiProperty({
    description: 'Reason for skipping this stage (required)',
    example:
      'Documento urgente que no requiere decreto según instrucciones del Ministro',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty({ message: 'Debe proporcionar una razón para omitir esta etapa' })
  @MinLength(10, {
    message: 'La razón debe tener al menos 10 caracteres',
  })
  reason: string;
}
