import { PartialType } from '@nestjs/swagger';
import { CreateExpedienteDto } from './create-expediente.dto';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ExpStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export class UpdateExpedienteDto extends PartialType(CreateExpedienteDto) {
  @ApiProperty({ enum: ExpStatus, required: false })
  @IsEnum(ExpStatus)
  @IsOptional()
  status?: ExpStatus;

  @ApiProperty({ description: 'Fecha de cierre', required: false })
  @IsDateString()
  @IsOptional()
  closedDate?: string;
}
