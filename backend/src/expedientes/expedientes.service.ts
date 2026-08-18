import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpedienteDto } from './dto/create-expediente.dto';
import { UpdateExpedienteDto } from './dto/update-expediente.dto';
import { QueryExpedienteDto } from './dto/query-expediente.dto';

@Injectable()
export class ExpedientesService {
  private readonly logger = new Logger(ExpedientesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate unique expediente code (EXP-YYYY-NNNN)
   */
  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `EXP-${year}-`;

    // Find last expediente for this year
    const lastExp = await this.prisma.expediente.findFirst({
      where: {
        code: {
          startsWith: prefix,
        },
      },
      orderBy: {
        code: 'desc',
      },
    });

    let number = 1;
    if (lastExp) {
      const lastNumber = parseInt(lastExp.code.split('-')[2]);
      number = lastNumber + 1;
    }

    return `${prefix}${number.toString().padStart(4, '0')}`;
  }

  /**
   * Create a new expediente
   */
  async create(createExpedienteDto: CreateExpedienteDto) {
    const code = await this.generateCode();

    const expediente = await this.prisma.expediente.create({
      data: {
        code,
        title: createExpedienteDto.title,
        description: createExpedienteDto.description,
        startDate: createExpedienteDto.startDate
          ? new Date(createExpedienteDto.startDate)
          : new Date(),
      },
      include: {
        documents: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        deadlines: {
          take: 5,
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    this.logger.log(`Created expediente: ${expediente.code}`);
    return expediente;
  }

  /**
   * Find all expedientes with pagination and filters
   */
  async findAll(query: QueryExpedienteDto) {
    const { page = 1, limit = 20, search, status, sort = 'createdAt' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Execute query with pagination
    const [expedientes, total] = await Promise.all([
      this.prisma.expediente.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort]: 'desc' },
        include: {
          documents: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
          deadlines: {
            take: 5,
            where: {
              status: { not: 'COMPLETED' },
            },
            orderBy: { dueDate: 'asc' },
          },
          _count: {
            select: {
              documents: true,
              deadlines: true,
            },
          },
        },
      }),
      this.prisma.expediente.count({ where }),
    ]);

    return {
      data: expedientes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find one expediente by ID
   */
  async findOne(id: string) {
    const expediente = await this.prisma.expediente.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
          include: {
            entity: true,
            responsible: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            files: true,
          },
        },
        deadlines: {
          orderBy: { dueDate: 'asc' },
        },
        _count: {
          select: {
            documents: true,
            deadlines: true,
          },
        },
      },
    });

    if (!expediente) {
      throw new NotFoundException(`Expediente with ID ${id} not found`);
    }

    return expediente;
  }

  /**
   * Update expediente
   */
  async update(id: string, updateExpedienteDto: UpdateExpedienteDto) {
    // Check if exists
    await this.findOne(id);

    const data: any = {};

    if (updateExpedienteDto.title !== undefined) {
      data.title = updateExpedienteDto.title;
    }

    if (updateExpedienteDto.description !== undefined) {
      data.description = updateExpedienteDto.description;
    }

    if (updateExpedienteDto.status !== undefined) {
      data.status = updateExpedienteDto.status;

      // Auto-set closedDate when closing
      if (updateExpedienteDto.status === 'CLOSED' && !updateExpedienteDto.closedDate) {
        data.closedDate = new Date();
      }
    }

    if (updateExpedienteDto.closedDate !== undefined) {
      data.closedDate = updateExpedienteDto.closedDate
        ? new Date(updateExpedienteDto.closedDate)
        : null;
    }

    if (updateExpedienteDto.startDate !== undefined) {
      data.startDate = new Date(updateExpedienteDto.startDate);
    }

    const expediente = await this.prisma.expediente.update({
      where: { id },
      data,
      include: {
        documents: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        deadlines: {
          take: 5,
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    this.logger.log(`Updated expediente: ${expediente.code}`);
    return expediente;
  }

  /**
   * Delete expediente (soft delete by archiving)
   */
  async remove(id: string) {
    // Check if exists
    await this.findOne(id);

    const expediente = await this.prisma.expediente.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
      },
    });

    this.logger.log(`Archived expediente: ${expediente.code}`);
    return expediente;
  }

  /**
   * Get expediente statistics
   */
  async getStats() {
    const [total, open, inProgress, closed, archived] = await Promise.all([
      this.prisma.expediente.count(),
      this.prisma.expediente.count({ where: { status: 'OPEN' } }),
      this.prisma.expediente.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.expediente.count({ where: { status: 'CLOSED' } }),
      this.prisma.expediente.count({ where: { status: 'ARCHIVED' } }),
    ]);

    return {
      total,
      open,
      inProgress,
      closed,
      archived,
    };
  }
}
