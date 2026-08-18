import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[];

  @IsOptional()
  @IsEnum(['DRAFT', 'PENDING', 'PUBLISHED'])
  status?: 'DRAFT' | 'PENDING' | 'PUBLISHED';
}
