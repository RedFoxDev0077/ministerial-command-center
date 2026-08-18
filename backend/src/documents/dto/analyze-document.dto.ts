import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeDocumentDto {
  @ApiProperty({
    description: 'Type of analysis to perform',
    enum: [
      'executive_summary',
      'key_topics',
      'required_actions',
      'urgency_level',
      'stakeholders',
    ],
    example: 'executive_summary',
    required: false,
  })
  @IsOptional()
  @IsEnum([
    'executive_summary',
    'key_topics',
    'required_actions',
    'urgency_level',
    'stakeholders',
  ])
  analysisType?: string = 'executive_summary';
}
