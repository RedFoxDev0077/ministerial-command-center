import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentStage, StageStatus, Role } from '@prisma/client';
import { addHours } from 'date-fns';
import { UpdateStageDto, SkipStageDto } from './dto';

/**
 * Service for managing individual workflow stages
 *
 * Handles:
 * - Stage creation and updates
 * - Stage completion tracking
 * - Stage skipping with admin approval
 * - Deadline management (configurable)
 */
@Injectable()
export class WorkflowStageService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new workflow stage for a document
   */
  async createStage(
    documentId: string,
    stage: DocumentStage,
    dueDate?: Date,
    metadata?: any,
  ) {
    return this.prisma.workflowStage.create({
      data: {
        documentId,
        stage,
        status: StageStatus.PENDING,
        dueDate,
        metadata,
      },
    });
  }

  /**
   * Get all stages for a document
   */
  async getDocumentStages(documentId: string) {
    return this.prisma.workflowStage.findMany({
      where: { documentId },
      orderBy: { createdAt: 'asc' },
      include: {
        completedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get current active stage for a document
   */
  async getCurrentStage(documentId: string) {
    return this.prisma.workflowStage.findFirst({
      where: {
        documentId,
        status: {
          in: [StageStatus.PENDING, StageStatus.IN_PROGRESS],
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Update stage properties
   */
  async updateStage(stageId: string, updateDto: UpdateStageDto) {
    const stage = await this.prisma.workflowStage.findUnique({
      where: { id: stageId },
    });

    if (!stage) {
      throw new NotFoundException('Workflow stage not found');
    }

    if (stage.status === StageStatus.COMPLETED) {
      throw new BadRequestException('Cannot update completed stage');
    }

    const updateData: any = {};

    if (updateDto.customDeadline) {
      updateData.customDeadline = new Date(updateDto.customDeadline);
      updateData.dueDate = new Date(updateDto.customDeadline);
    } else if (updateDto.deadlineHours) {
      const deadline = addHours(new Date(), updateDto.deadlineHours);
      updateData.deadlineHours = updateDto.deadlineHours;
      updateData.dueDate = deadline;
    }

    if (updateDto.notes) {
      updateData.notes = updateDto.notes;
    }

    if (updateDto.metadata) {
      updateData.metadata = updateDto.metadata;
    }

    return this.prisma.workflowStage.update({
      where: { id: stageId },
      data: updateData,
    });
  }

  /**
   * Mark stage as in progress
   */
  async startStage(stageId: string) {
    const stage = await this.prisma.workflowStage.findUnique({
      where: { id: stageId },
    });

    if (!stage) {
      throw new NotFoundException('Workflow stage not found');
    }

    if (stage.status !== StageStatus.PENDING) {
      throw new BadRequestException(
        'Only pending stages can be started',
      );
    }

    return this.prisma.workflowStage.update({
      where: { id: stageId },
      data: { status: StageStatus.IN_PROGRESS },
    });
  }

  /**
   * Mark stage as completed
   */
  async completeStage(
    stageId: string,
    userId: string,
    notes?: string,
    metadata?: any,
  ) {
    const stage = await this.prisma.workflowStage.findUnique({
      where: { id: stageId },
    });

    if (!stage) {
      throw new NotFoundException('Workflow stage not found');
    }

    if (stage.status === StageStatus.COMPLETED) {
      throw new BadRequestException('Stage already completed');
    }

    if (stage.status === StageStatus.SKIPPED) {
      throw new BadRequestException('Skipped stages cannot be completed');
    }

    const updateData: any = {
      status: StageStatus.COMPLETED,
      completedAt: new Date(),
      completedBy: userId,
    };

    if (notes) {
      updateData.notes = notes;
    }

    if (metadata) {
      updateData.metadata = metadata;
    }

    return this.prisma.workflowStage.update({
      where: { id: stageId },
      data: updateData,
    });
  }

  /**
   * Skip a stage (admin only with approval)
   *
   * Client requirement: Admin approval required to skip stages
   */
  async skipStage(
    stageId: string,
    userId: string,
    skipDto: SkipStageDto,
  ) {
    // Verify user is admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== Role.ADMIN) {
      throw new UnauthorizedException(
        'Solo el administrador puede omitir etapas. Only admin can skip stages.',
      );
    }

    const stage = await this.prisma.workflowStage.findUnique({
      where: { id: stageId },
    });

    if (!stage) {
      throw new NotFoundException('Workflow stage not found');
    }

    if (stage.status === StageStatus.COMPLETED) {
      throw new BadRequestException('Cannot skip completed stage');
    }

    if (stage.status === StageStatus.SKIPPED) {
      throw new BadRequestException('Stage already skipped');
    }

    // Check if stage is skippable (non-critical stages)
    const nonSkippableStages: DocumentStage[] = [
      DocumentStage.MANUAL_ENTRY,
      DocumentStage.SCANNING_ASSIGNED,
      DocumentStage.SIGNATURE_PROTOCOL,
      DocumentStage.ACKNOWLEDGMENT,
      DocumentStage.ARCHIVED,
    ];

    if (nonSkippableStages.includes(stage.stage)) {
      throw new BadRequestException(
        `La etapa ${stage.stage} no se puede omitir. This stage cannot be skipped.`,
      );
    }

    return this.prisma.workflowStage.update({
      where: { id: stageId },
      data: {
        status: StageStatus.SKIPPED,
        isSkipped: true,
        skipReason: skipDto.reason,
        skipApprovedBy: userId,
        skipApprovedAt: new Date(),
      },
    });
  }

  /**
   * Get overdue stages
   */
  async getOverdueStages() {
    const now = new Date();

    return this.prisma.workflowStage.findMany({
      where: {
        dueDate: {
          lt: now,
        },
        status: {
          in: [StageStatus.PENDING, StageStatus.IN_PROGRESS],
        },
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            correlativeNumber: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Get stages by status
   */
  async getStagesByStatus(status: StageStatus) {
    return this.prisma.workflowStage.findMany({
      where: { status },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            correlativeNumber: true,
          },
        },
        completedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete stage (admin only, for corrections)
   */
  async deleteStage(stageId: string, userId: string) {
    // Verify user is admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== Role.ADMIN) {
      throw new UnauthorizedException(
        'Solo el administrador puede eliminar etapas. Only admin can delete stages.',
      );
    }

    const stage = await this.prisma.workflowStage.findUnique({
      where: { id: stageId },
    });

    if (!stage) {
      throw new NotFoundException('Workflow stage not found');
    }

    if (stage.status === StageStatus.COMPLETED) {
      throw new BadRequestException(
        'No se puede eliminar una etapa completada. Cannot delete completed stage.',
      );
    }

    await this.prisma.workflowStage.delete({
      where: { id: stageId },
    });

    return { message: 'Stage deleted successfully' };
  }
}
