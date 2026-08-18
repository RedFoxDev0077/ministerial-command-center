import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('articles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  findAll(@Query('status') status?: string, @Request() req?: any) {
    return this.articlesService.findAll(status, req?.user?.id, req?.user?.role);
  }

  @Get(':id')
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  findOne(@Param('id') id: string) {
    return this.articlesService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  create(@Body() dto: CreateArticleDto, @Request() req) {
    return this.articlesService.create(dto, req.user.id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto, @Request() req) {
    return this.articlesService.update(id, dto, req.user.id, req.user.role);
  }

  @Post(':id/publish')
  @Roles('ADMIN', 'GABINETE')
  @HttpCode(HttpStatus.OK)
  publish(@Param('id') id: string, @Request() req) {
    return this.articlesService.publish(id, req.user.role);
  }

  @Delete(':id')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req) {
    return this.articlesService.remove(id, req.user.id, req.user.role);
  }

  // ── Section XI: AI Content Generation ──────────────────────────

  @Post('generate-proposals')
  @Roles('ADMIN', 'GABINETE')
  @HttpCode(HttpStatus.OK)
  generateProposals() {
    return this.articlesService.generateWeeklyProposals();
  }

  // Accepts proposal data in body — no DB record needed
  @Post('generate-draft')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @HttpCode(HttpStatus.OK)
  generateDraft(@Body() body: { title: string; sector: string; outline?: string[]; introduction?: string }, @Request() req) {
    return this.articlesService.generateFullDraft(body, req.user.id);
  }

  @Post(':id/generate-social')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @HttpCode(HttpStatus.OK)
  generateSocial(@Param('id') id: string) {
    return this.articlesService.generateSocialPost(id);
  }
}
