import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateAIDto {
  @ApiPropertyOptional({
    description: 'Force regeneration even if AI content already exists',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  force?: boolean;
}
