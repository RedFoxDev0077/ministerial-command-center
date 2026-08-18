import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Min, Max } from 'class-validator';

export enum DeadlineType {
  BUSINESS_HOURS = 'BUSINESS_HOURS',
  CALENDAR_DAYS = 'CALENDAR_DAYS',
}

export class CalculateDeadlineDto {
  @ApiProperty({
    description: 'Type of deadline calculation',
    enum: DeadlineType,
    example: 'BUSINESS_HOURS',
  })
  @IsEnum(DeadlineType)
  deadlineType: DeadlineType;

  @ApiProperty({
    description: 'Quantity of hours (for BUSINESS_HOURS) or days (for CALENDAR_DAYS)',
    example: 48,
    minimum: 1,
    maximum: 1000,
  })
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity: number;
}
