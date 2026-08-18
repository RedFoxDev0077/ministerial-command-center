import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto, TemplateType } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Extract variables from template content
   */
  private extractVariables(content: string): string[] {
    const matches = content.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(v => v.replace(/\{\{|\}\}/g, '')))];
  }

  /**
   * Get all templates (optionally filtered by type)
   */
  async findAll(type?: TemplateType, userId?: string) {
    const where: any = { isActive: true };

    if (type) {
      where.type = type;
    }

    const templates = await this.prisma.documentTemplate.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' }, // Default templates first
        { createdAt: 'desc' },
      ],
    });

    this.logger.log(`Retrieved ${templates.length} templates (type: ${type || 'all'})`);
    return templates;
  }

  /**
   * Get single template by ID
   */
  async findOne(id: string) {
    const template = await this.prisma.documentTemplate.findFirst({
      where: { id, isActive: true },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  /**
   * Create new template
   */
  async create(dto: CreateTemplateDto, userId?: string) {
    // Auto-extract variables if not provided
    const variables = dto.variables || this.extractVariables(dto.content);

    const template = await this.prisma.documentTemplate.create({
      data: {
        name: dto.name,
        type: dto.type as any,
        content: dto.content,
        variables,
        isDefault: dto.isDefault || false,
        createdBy: userId,
      },
    });

    this.logger.log(`Created template: ${template.name} (${template.type})`);
    return template;
  }

  /**
   * Update template
   */
  async update(id: string, dto: UpdateTemplateDto, userId?: string) {
    const existing = await this.findOne(id);

    // Auto-extract variables if content changed
    const variables = dto.content
      ? (dto.variables || this.extractVariables(dto.content))
      : existing.variables;

    const updated = await this.prisma.documentTemplate.update({
      where: { id },
      data: {
        ...dto,
        type: dto.type as any,
        variables,
      },
    });

    this.logger.log(`Updated template: ${updated.name}`);
    return updated;
  }

  /**
   * Delete template (soft delete)
   */
  async remove(id: string) {
    const template = await this.findOne(id);

    // Prevent deletion of default templates
    if (template.isDefault) {
      throw new BadRequestException('Cannot delete default templates');
    }

    await this.prisma.documentTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Deleted template: ${template.name}`);
    return { message: 'Template deleted successfully' };
  }

  /**
   * Duplicate template
   */
  async duplicate(id: string, userId?: string) {
    const original = await this.findOne(id);

    const duplicate = await this.prisma.documentTemplate.create({
      data: {
        name: `${original.name} (copia)`,
        type: original.type,
        content: original.content,
        variables: original.variables,
        isDefault: false,
        createdBy: userId,
      },
    });

    this.logger.log(`Duplicated template: ${original.name} -> ${duplicate.name}`);
    return duplicate;
  }

  /**
   * Seed default templates (run on app startup)
   */
  async seedDefaultTemplates() {
    const existingDefaults = await this.prisma.documentTemplate.count({
      where: { isDefault: true },
    });

    if (existingDefaults > 0) {
      this.logger.log('Default templates already exist, skipping seed');
      return;
    }

    const defaultTemplates = [
      {
        name: 'Oficio formal estándar',
        type: 'OFICIO' as TemplateType,
        content: 'OFICIO N° {{numero}}\n\n{{ciudad}}, {{fecha}}\n\nSeñor(a):\n{{destinatario}}\n{{cargo_destinatario}}\nPresente.-\n\nREF: {{asunto}}\n\nTengo el agrado de dirigirme a usted para {{contenido}}\n\nSin otro particular, hago propicia la ocasión para expresarle los sentimientos de mi consideración y estima.\n\nAtentamente,\n\n\n{{firmante}}\n{{cargo_firmante}}',
        variables: ['numero', 'ciudad', 'fecha', 'destinatario', 'cargo_destinatario', 'asunto', 'contenido', 'firmante', 'cargo_firmante'],
        isDefault: true,
      },
      {
        name: 'Memorando interno',
        type: 'MEMORANDO' as TemplateType,
        content: 'MEMORANDO N° {{numero}}\n\nA: {{destinatario}}\nDE: {{remitente}}\nASUNTO: {{asunto}}\nFECHA: {{fecha}}\n\n{{contenido}}\n\nAtentamente,\n\n{{firmante}}',
        variables: ['numero', 'destinatario', 'remitente', 'asunto', 'fecha', 'contenido', 'firmante'],
        isDefault: true,
      },
      {
        name: 'Circular informativa',
        type: 'CIRCULAR' as TemplateType,
        content: 'CIRCULAR N° {{numero}}\n\nFecha: {{fecha}}\n\nPara: {{destinatarios}}\nDe: {{remitente}}\nAsunto: {{asunto}}\n\nPor medio de la presente se comunica a todos los interesados que:\n\n{{contenido}}\n\nSe agradece su atención y colaboración.\n\n{{firmante}}\n{{cargo_firmante}}',
        variables: ['numero', 'fecha', 'destinatarios', 'remitente', 'asunto', 'contenido', 'firmante', 'cargo_firmante'],
        isDefault: true,
      },
      {
        name: 'Respuesta a solicitud',
        type: 'RESPUESTA' as TemplateType,
        content: 'OFICIO N° {{numero}}\n\nREF: Su comunicación de fecha {{fecha_solicitud}}\n\n{{ciudad}}, {{fecha}}\n\nSeñor(a):\n{{destinatario}}\nPresente.-\n\nEn respuesta a su comunicación de la referencia, me permito informarle que:\n\n{{contenido}}\n\nSin otro particular, me suscribo de usted.\n\nAtentamente,\n\n{{firmante}}\n{{cargo_firmante}}',
        variables: ['numero', 'fecha_solicitud', 'ciudad', 'fecha', 'destinatario', 'contenido', 'firmante', 'cargo_firmante'],
        isDefault: true,
      },
    ];

    for (const template of defaultTemplates) {
      await this.prisma.documentTemplate.create({
        data: {
          ...template,
          type: template.type as any,
        },
      });
    }

    this.logger.log(`Seeded ${defaultTemplates.length} default templates`);
  }
}
