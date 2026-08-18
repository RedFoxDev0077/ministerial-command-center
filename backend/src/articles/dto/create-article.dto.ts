import { IsString, IsOptional, IsArray, MinLength, IsEnum } from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(10)
  content: string;

  @IsString()
  sector: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[];

  @IsOptional()
  @IsEnum(['DRAFT', 'PENDING'])
  status?: 'DRAFT' | 'PENDING';
}
