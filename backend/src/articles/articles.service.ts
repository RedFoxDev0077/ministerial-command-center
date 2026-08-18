import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import OpenAI from 'openai';

const SECTORS = [
  'Transportes',
  'Puertos',
  'Telecomunicaciones',
  'Inteligencia Artificial',
  'Correos',
  'Regulación',
];

@Injectable()
export class ArticlesService {
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  private readonly authorSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
  };

  async findAll(status?: string, userId?: string, userRole?: string) {
    const where: any = status
      ? { status: status as any }
      : {
          OR: [
            { status: { in: ['PENDING', 'PUBLISHED'] } },
            { status: 'DRAFT', authorId: userId },
          ],
        };

    return this.prisma.article.findMany({
      where,
      include: { author: { select: this.authorSelect } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { author: { select: this.authorSelect } },
    });
    if (!article) throw new NotFoundException('Artículo no encontrado');
    return article;
  }

  async create(dto: CreateArticleDto, authorId: string) {
    return this.prisma.article.create({
      data: {
        title: dto.title,
        content: dto.content,
        sector: dto.sector,
        sources: dto.sources ?? [],
        status: dto.status ?? 'DRAFT',
        authorId,
      },
      include: { author: { select: this.authorSelect } },
    });
  }

  async update(id: string, dto: UpdateArticleDto, userId: string, userRole: string) {
    const article = await this.findOne(id);
    if (article.authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('No tiene permiso para editar este artículo');
    }
    return this.prisma.article.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.content && { content: dto.content }),
        ...(dto.sector && { sector: dto.sector }),
        ...(dto.sources !== undefined && { sources: dto.sources }),
        ...(dto.status && { status: dto.status as any }),
      },
      include: { author: { select: this.authorSelect } },
    });
  }

  async publish(id: string, userRole: string) {
    if (userRole !== 'ADMIN' && userRole !== 'GABINETE') {
      throw new ForbiddenException('Solo administradores pueden publicar artículos');
    }
    await this.findOne(id);
    return this.prisma.article.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
      include: { author: { select: this.authorSelect } },
    });
  }

  async remove(id: string, userId: string, userRole: string) {
    const article = await this.findOne(id);
    if (article.authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('No tiene permiso para eliminar este artículo');
    }
    return this.prisma.article.delete({ where: { id } });
  }

  // ── Section XI: AI Content Generation ──────────────────────────

  // Returns proposals as transient objects — NOT saved to DB
  async generateWeeklyProposals() {
    const model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o';

    const proposalPromises = SECTORS.map(async (sector) => {
      const response = await this.openai.chat.completions.create({
        model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Eres un redactor institucional del Ministerio de Transportes, Telecomunicaciones y Correos de Guinea Ecuatorial. ' +
              'Genera una propuesta de artículo semanal para el sector indicado. ' +
              'Responde SOLO con JSON válido con las claves: title (string), introduction (string, 2-3 oraciones), outline (array de strings con 4-6 puntos).',
          },
          {
            role: 'user',
            content: `Genera una propuesta de artículo para el sector: ${sector}. Fecha: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
          },
        ],
        max_tokens: 600,
      });

      const raw = response.choices[0]?.message?.content || '{}';
      let parsed: { title?: string; introduction?: string; outline?: string[] } = {};
      try { parsed = JSON.parse(raw); } catch {}

      // Return plain object — no DB write
      return {
        title: parsed.title || `Propuesta semanal — ${sector}`,
        introduction: parsed.introduction || '',
        outline: parsed.outline || [],
        sector,
      };
    });

    return Promise.all(proposalPromises);
  }

  // Generates full draft from inline proposal data — saves ONE article to DB
  async generateFullDraft(
    proposal: { title: string; sector: string; outline?: string[]; introduction?: string },
    userId: string,
  ) {
    const model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o';

    const outlineText = proposal.outline?.length
      ? `\n\nEsquema a desarrollar:\n${proposal.outline.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
      : '';

    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'Eres un redactor institucional del Ministerio de Transportes, Telecomunicaciones y Correos de Guinea Ecuatorial. ' +
            'Redacta un artículo completo, formal y bien estructurado en español usando formato Markdown. ' +
            'Incluye: introducción, desarrollo con subtítulos (##), conclusión y recomendaciones. Mínimo 600 palabras.',
        },
        {
          role: 'user',
          content: `Sector: ${proposal.sector}\nTítulo: ${proposal.title}${outlineText}`,
        },
      ],
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '';

    return this.prisma.article.create({
      data: {
        title: proposal.title,
        content,
        sector: proposal.sector,
        contentType: 'ARTICLE',
        aiGenerated: true,
        status: 'DRAFT',
        authorId: userId,
      },
      include: { author: { select: this.authorSelect } },
    });
  }

  async generateSocialPost(id: string) {
    const article = await this.findOne(id);
    const model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o';

    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'Eres el community manager del Ministerio de Transportes, Telecomunicaciones y Correos de Guinea Ecuatorial. ' +
            'Crea una publicación para redes sociales (Facebook/Twitter/Instagram) basada en el artículo. ' +
            'Debe ser atractiva, concisa (máx 280 caracteres para Twitter, versión larga para Facebook), incluir emojis y hashtags relevantes. ' +
            'Responde con la versión corta (Twitter) y luego la versión larga (Facebook) separadas por "---".',
        },
        {
          role: 'user',
          content: `Título: ${article.title}\nSector: ${article.sector}\n\nResumen del contenido:\n${article.content.substring(0, 1500)}`,
        },
      ],
      max_tokens: 600,
    });

    const socialPost = response.choices[0]?.message?.content || '';

    return this.prisma.article.update({
      where: { id },
      data: { socialPost, contentType: article.contentType || 'ARTICLE' },
      include: { author: { select: this.authorSelect } },
    });
  }
}
