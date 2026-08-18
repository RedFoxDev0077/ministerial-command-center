import { IsBoolean, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum TimezoneOption {
  AFRICA_MALABO = 'Africa/Malabo',
  UTC = 'UTC',
}

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ description: 'Language preference' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ enum: TimezoneOption, description: 'Timezone preference' })
  @IsEnum(TimezoneOption)
  @IsOptional()
  timezone?: TimezoneOption;

  @ApiPropertyOptional({ description: 'Enable 48h deadline reminders' })
  @IsBoolean()
  @IsOptional()
  reminder48hBefore?: boolean;

  @ApiPropertyOptional({ description: 'Escalate overdue deadlines' })
  @IsBoolean()
  @IsOptional()
  escalateOverdue?: boolean;

  @ApiPropertyOptional({ description: 'Enable email notifications' })
  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable daily activity summary' })
  @IsBoolean()
  @IsOptional()
  dailySummary?: boolean;
}
