import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeadlineDto } from './dto/create-deadline.dto';
import { UpdateDeadlineDto } from './dto/update-deadline.dto';
import { QueryDeadlineDto } from './dto/query-deadline.dto';
import { DeadlineStatus, Prisma } from '@prisma/client';

@Injectable()
export class DeadlinesService {
  private readonly logger = new Logger(DeadlinesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new deadline
   */
  async create(createDeadlineDto: CreateDeadlineDto) {
    this.logger.log(`Creating deadline: ${createDeadlineDto.title}`);

    // Verify document exists if documentId is provided
    if (createDeadlineDto.documentId) {
      const document = await this.prisma.document.findUnique({
        where: { id: createDeadlineDto.documentId },
      });
      if (!document) {
        throw new NotFoundException(
          `Document with ID ${createDeadlineDto.documentId} not found`
        );
      }
    }

    // Verify expediente exists if expedienteId is provided
    if (createDeadlineDto.expedienteId) {
      const expediente = await this.prisma.expediente.findUnique({
        where: { id: createDeadlineDto.expedienteId },
      });
      if (!expediente) {
        throw new NotFoundException(
          `Expediente with ID ${createDeadlineDto.expedienteId} not found`
        );
      }
    }

    const deadline = await this.prisma.deadline.create({
      data: {
        title: createDeadlineDto.title,
        description: createDeadlineDto.description,
        dueDate: new Date(createDeadlineDto.dueDate),
        priority: createDeadlineDto.priority || 'MEDIUM',
        documentId: createDeadlineDto.documentId,
        expedienteId: createDeadlineDto.expedienteId,
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            correlativeNumber: true,
          },
        },
        expediente: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      },
    });

    this.logger.log(`Deadline created successfully: ${deadline.id}`);
    return deadline;
  }

  /**
   * Find all deadlines with optional filtering
   */
  async findAll(queryDto: QueryDeadlineDto) {
    this.logger.log('Finding deadlines with filters:', queryDto);

    const where: Prisma.DeadlineWhereInput = {};

    if (queryDto.documentId) {
      where.documentId = queryDto.documentId;
    }

    if (queryDto.expedienteId) {
      where.expedienteId = queryDto.expedienteId;
    }

    if (queryDto.status) {
      where.status = queryDto.status;
    }

    if (queryDto.priority) {
      where.priority = queryDto.priority;
    }

    if (queryDto.dueDateFrom || queryDto.dueDateTo) {
      where.dueDate = {};
      if (queryDto.dueDateFrom) {
        where.dueDate.gte = new Date(queryDto.dueDateFrom);
      }
      if (queryDto.dueDateTo) {
        where.dueDate.lte = new Date(queryDto.dueDateTo);
      }
    }

    const deadlines = await this.prisma.deadline.findMany({
      where,
      include: {
        document: {
          select: {
            id: true,
            title: true,
            correlativeNumber: true,
          },
        },
        expediente: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // PENDING, IN_PROGRESS, COMPLETED, OVERDUE
        { dueDate: 'asc' },
      ],
    });

    this.logger.log(`Found ${deadlines.length} deadlines`);
    return deadlines;
  }

  /**
   * Find one deadline by ID
   */
  async findOne(id: string) {
    this.logger.log(`Finding deadline: ${id}`);

    const deadline = await this.prisma.deadline.findUnique({
      where: { id },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            correlativeNumber: true,
          },
        },
        expediente: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      },
    });

    if (!deadline) {
      throw new NotFoundException(`Deadline with ID ${id} not found`);
    }

    return deadline;
  }

  /**
   * Update a deadline
   */
  async update(id: string, updateDeadlineDto: UpdateDeadlineDto) {
    this.logger.log(`Updating deadline: ${id}`);

    // Check if deadline exists
    const existingDeadline = await this.prisma.deadline.findUnique({
      where: { id },
    });

    if (!existingDeadline) {
      throw new NotFoundException(`Deadline with ID ${id} not found`);
    }

    // Verify document exists if documentId is being updated
    if (updateDeadlineDto.documentId) {
      const document = await this.prisma.document.findUnique({
        where: { id: updateDeadlineDto.documentId },
      });
      if (!document) {
        throw new NotFoundException(
          `Document with ID ${updateDeadlineDto.documentId} not found`
        );
      }
    }

    // Verify expediente exists if expedienteId is being updated
    if (updateDeadlineDto.expedienteId) {
      const expediente = await this.prisma.expediente.findUnique({
        where: { id: updateDeadlineDto.expedienteId },
      });
      if (!expediente) {
        throw new NotFoundException(
          `Expediente with ID ${updateDeadlineDto.expedienteId} not found`
        );
      }
    }

    const data: Prisma.DeadlineUpdateInput = {};

    if (updateDeadlineDto.title !== undefined) {
      data.title = updateDeadlineDto.title;
    }

    if (updateDeadlineDto.description !== undefined) {
      data.description = updateDeadlineDto.description;
    }

    if (updateDeadlineDto.dueDate !== undefined) {
      data.dueDate = new Date(updateDeadlineDto.dueDate);
    }

    if (updateDeadlineDto.priority !== undefined) {
      data.priority = updateDeadlineDto.priority;
    }

    if (updateDeadlineDto.status !== undefined) {
      data.status = updateDeadlineDto.status;
      // Set completedAt when status is changed to COMPLETED
      if (updateDeadlineDto.status === DeadlineStatus.COMPLETED) {
        data.completedAt = new Date();
      }
    }

    if (updateDeadlineDto.documentId !== undefined) {
      if (updateDeadlineDto.documentId) {
        data.document = { connect: { id: updateDeadlineDto.documentId } };
      } else {
        data.document = { disconnect: true };
      }
    }

    if (updateDeadlineDto.expedienteId !== undefined) {
      if (updateDeadlineDto.expedienteId) {
        data.expediente = { connect: { id: updateDeadlineDto.expedienteId } };
      } else {
        data.expediente = { disconnect: true };
      }
    }

    const deadline = await this.prisma.deadline.update({
      where: { id },
      data,
      include: {
        document: {
          select: {
            id: true,
            title: true,
            correlativeNumber: true,
          },
        },
        expediente: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      },
    });

    this.logger.log(`Deadline updated successfully: ${id}`);
    return deadline;
  }

  /**
   * Delete a deadline
   */
  async remove(id: string) {
    this.logger.log(`Deleting deadline: ${id}`);

    // Check if deadline exists
    const existingDeadline = await this.prisma.deadline.findUnique({
      where: { id },
    });

    if (!existingDeadline) {
      throw new NotFoundException(`Deadline with ID ${id} not found`);
    }

    await this.prisma.deadline.delete({
      where: { id },
    });

    this.logger.log(`Deadline deleted successfully: ${id}`);
    return { message: 'Deadline deleted successfully' };
  }

  /**
   * Mark deadline as completed
   */
  async complete(id: string) {
    this.logger.log(`Marking deadline as completed: ${id}`);

    return this.update(id, {
      status: DeadlineStatus.COMPLETED,
    });
  }

  /**
   * Update overdue deadlines status (should be run by cron job)
   */
  async updateOverdueDeadlines() {
    this.logger.log('Checking for overdue deadlines');

    const now = new Date();

    // Update deadlines that are past due date and not completed
    const result = await this.prisma.deadline.updateMany({
      where: {
        dueDate: {
          lt: now,
        },
        status: {
          notIn: [DeadlineStatus.COMPLETED, DeadlineStatus.OVERDUE],
        },
      },
      data: {
        status: DeadlineStatus.OVERDUE,
      },
    });

    this.logger.log(`Updated ${result.count} overdue deadlines`);
    return result;
  }
}
