import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/create-notification.dto';

/**
 * Acknowledgment Service
 *
 * Handles document acknowledgment of receipt (ACKNOWLEDGMENT stage):
 * - Record acknowledgment date and type
 * - Upload scanned acknowledgment documents
 * - Track who acknowledged receipt
 * - Notify stakeholders
 *
 * Client requirement: Physical acknowledgment capture (manual, stamp, or digital)
 */
@Injectable()
export class AcknowledgmentService {
  private readonly logger = new Logger(AcknowledgmentService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Record document acknowledgment
   */
  async recordAcknowledgment(
    documentId: string,
    userId: string,
    acknowledgmentData: {
      acknowledgmentType: 'MANUAL' | 'STAMP' | 'DIGITAL';
      acknowledgmentDate: Date;
      acknowledgedBy: string;
      acknowledgmentFileBuffer?: Buffer;
      acknowledgmentFilePath?: string;
      notes?: string;
    },
  ): Promise<any> {
    // Verify document exists
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        responsible: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // Check if already acknowledged
    if (document.acknowledgmentDate) {
      throw new BadRequestException(
        'Document has already been acknowledged. Use updateAcknowledgment() to modify.',
      );
    }

    // Upload acknowledgment file if provided
    let acknowledgmentFileUrl: string | null = null;
    if (acknowledgmentData.acknowledgmentFileBuffer) {
      acknowledgmentFileUrl = await this.uploadAcknowledgmentFile(
        documentId,
        acknowledgmentData.acknowledgmentFileBuffer,
      );
    } else if (acknowledgmentData.acknowledgmentFilePath) {
      acknowledgmentFileUrl = acknowledgmentData.acknowledgmentFilePath;
    }

    // Update document with acknowledgment
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        acknowledgmentDate: acknowledgmentData.acknowledgmentDate,
        acknowledgmentType: acknowledgmentData.acknowledgmentType,
        acknowledgmentFile: acknowledgmentFileUrl,
        acknowledgmentBy: acknowledgmentData.acknowledgedBy,
        currentStage: 'ACKNOWLEDGMENT',
      },
      include: {
        responsible: true,
        createdBy: true,
      },
    });

    // Create audit log
    await this.audit.log(userId, {
      action: 'ACKNOWLEDGMENT_RECORDED',
      resourceType: 'document',
      resourceId: documentId,
      changes: {
        acknowledgmentType: acknowledgmentData.acknowledgmentType,
        acknowledgmentDate: acknowledgmentData.acknowledgmentDate.toISOString(),
        acknowledgedBy: acknowledgmentData.acknowledgedBy,
        acknowledgmentFile: acknowledgmentFileUrl,
        notes: acknowledgmentData.notes,
      },
    });

    // Send notifications
    await this.sendAcknowledgmentNotifications(updated, userId);

    this.logger.log(
      `Acknowledgment recorded for document ${document.correlativeNumber} by ${acknowledgmentData.acknowledgedBy}`,
    );

    return {
      success: true,
      document: updated,
      acknowledgment: {
        type: acknowledgmentData.acknowledgmentType,
        date: acknowledgmentData.acknowledgmentDate,
        by: acknowledgmentData.acknowledgedBy,
        fileUrl: acknowledgmentFileUrl,
      },
    };
  }

  /**
   * Update existing acknowledgment
   */
  async updateAcknowledgment(
    documentId: string,
    userId: string,
    updates: {
      acknowledgmentType?: 'MANUAL' | 'STAMP' | 'DIGITAL';
      acknowledgmentDate?: Date;
      acknowledgedBy?: string;
      acknowledgmentFileBuffer?: Buffer;
      acknowledgmentFilePath?: string;
      notes?: string;
    },
  ): Promise<any> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    if (!document.acknowledgmentDate) {
      throw new BadRequestException(
        'Document has not been acknowledged yet. Use recordAcknowledgment() first.',
      );
    }

    // Upload new acknowledgment file if provided
    let acknowledgmentFileUrl = document.acknowledgmentFile;
    if (updates.acknowledgmentFileBuffer) {
      acknowledgmentFileUrl = await this.uploadAcknowledgmentFile(
        documentId,
        updates.acknowledgmentFileBuffer,
      );
    } else if (updates.acknowledgmentFilePath) {
      acknowledgmentFileUrl = updates.acknowledgmentFilePath;
    }

    // Update document
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        acknowledgmentDate: updates.acknowledgmentDate || document.acknowledgmentDate,
        acknowledgmentType: updates.acknowledgmentType || document.acknowledgmentType,
        acknowledgmentFile: acknowledgmentFileUrl,
        acknowledgmentBy: updates.acknowledgedBy || document.acknowledgmentBy,
      },
    });

    // Create audit log
    await this.audit.log(userId, {
      action: 'ACKNOWLEDGMENT_UPDATED',
      resourceType: 'document',
      resourceId: documentId,
      changes: {
        updates,
        previousData: {
          acknowledgmentType: document.acknowledgmentType,
          acknowledgmentDate: document.acknowledgmentDate,
          acknowledgedBy: document.acknowledgmentBy,
          acknowledgmentFile: document.acknowledgmentFile,
        },
      },
    });

    this.logger.log(
      `Acknowledgment updated for document ${document.correlativeNumber}`,
    );

    return {
      success: true,
      document: updated,
    };
  }

  /**
   * Get acknowledgment information
   */
  async getAcknowledgment(documentId: string): Promise<any> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        correlativeNumber: true,
        acknowledgmentDate: true,
        acknowledgmentType: true,
        acknowledgmentFile: true,
        acknowledgmentBy: true,
        currentStage: true,
      },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    if (!document.acknowledgmentDate) {
      return {
        hasAcknowledgment: false,
        message: 'Document has not been acknowledged yet',
      };
    }

    return {
      hasAcknowledgment: true,
      acknowledgment: {
        type: document.acknowledgmentType,
        date: document.acknowledgmentDate,
        by: document.acknowledgmentBy,
        fileUrl: document.acknowledgmentFile,
      },
    };
  }

  /**
   * Remove acknowledgment (admin only)
   */
  async removeAcknowledgment(
    documentId: string,
    userId: string,
    reason: string,
  ): Promise<any> {
    // Verify user is admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      throw new BadRequestException('Only admin can remove acknowledgments');
    }

    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // Update document
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        acknowledgmentDate: null,
        acknowledgmentType: null,
        acknowledgmentFile: null,
        acknowledgmentBy: null,
      },
    });

    // Create audit log
    await this.audit.log(userId, {
      action: 'ACKNOWLEDGMENT_REMOVED',
      resourceType: 'document',
      resourceId: documentId,
      changes: {
        reason,
        previousData: {
          acknowledgmentType: document.acknowledgmentType,
          acknowledgmentDate: document.acknowledgmentDate,
          acknowledgedBy: document.acknowledgmentBy,
          acknowledgmentFile: document.acknowledgmentFile,
        },
      },
    });

    this.logger.warn(
      `Acknowledgment removed from document ${document.correlativeNumber} by admin ${userId}. Reason: ${reason}`,
    );

    return {
      success: true,
      message: 'Acknowledgment removed',
    };
  }

  /**
   * Upload acknowledgment file to storage
   */
  private async uploadAcknowledgmentFile(
    documentId: string,
    fileBuffer: Buffer,
  ): Promise<string> {
    try {
      const fileName = `acknowledgment-${documentId}-${Date.now()}.pdf`;
      const folder = `documents/${documentId}/acknowledgments`;

      const uploadResult = await this.storage.uploadFileBuffer(
        fileBuffer,
        fileName,
        'application/pdf',
        folder,
      );

      return uploadResult.url;
    } catch (error) {
      this.logger.error(
        `Failed to upload acknowledgment file: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to upload acknowledgment file');
    }
  }

  /**
   * Send notifications when acknowledgment is recorded
   */
  private async sendAcknowledgmentNotifications(
    document: any,
    acknowledgedByUserId: string,
  ): Promise<void> {
    try {
      // Notify document creator
      if (document.createdById && document.createdById !== acknowledgedByUserId) {
        await this.notifications.create({
          userId: document.createdById,
          type: NotificationType.STATUS_CHANGED,
          title: 'Documento Confirmado',
          message: `El documento ${document.correlativeNumber} ha sido confirmado como recibido.`,
          relatedId: document.id,
          relatedType: 'document',
        });

        // Send email
        if (document.createdBy?.email) {
          await this.notifications.sendEmailNotification(
            document.createdBy.email,
            `Confirmación de Recepción - ${document.correlativeNumber}`,
            this.buildAcknowledgmentEmail(document),
          );
        }
      }

      // Notify responsible user if different
      if (
        document.responsibleId &&
        document.responsibleId !== acknowledgedByUserId &&
        document.responsibleId !== document.createdById
      ) {
        await this.notifications.create({
          userId: document.responsibleId,
          type: NotificationType.STATUS_CHANGED,
          title: 'Documento Confirmado',
          message: `El documento ${document.correlativeNumber} ha sido confirmado como recibido.`,
          relatedId: document.id,
          relatedType: 'document',
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to send acknowledgment notifications: ${error.message}`,
      );
      // Don't throw - acknowledgment was recorded successfully
    }
  }

  /**
   * Build acknowledgment email content
   */
  private buildAcknowledgmentEmail(document: any): string {
    const ackDate = new Date(document.acknowledgmentDate).toLocaleDateString(
      'es-ES',
    );

    return `
Estimado/a,

Le informamos que el siguiente documento ha sido confirmado como recibido:

Documento: ${document.correlativeNumber}
Título: ${document.title}
Tipo de Confirmación: ${document.acknowledgmentType}
Fecha de Confirmación: ${ackDate}
Confirmado por: ${document.acknowledgmentBy}

El documento ahora está en proceso de archivo.

---
Sistema de Gestión Documental
Ministerio de Transporte, Tecnología, Correos y Telecomunicaciones
República de Guinea Ecuatorial
    `.trim();
  }

  /**
   * Get acknowledgment statistics
   */
  async getAcknowledgmentStats(): Promise<{
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    byType: { type: string; count: number }[];
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, today, thisWeek, thisMonth] = await Promise.all([
      this.prisma.document.count({
        where: {
          acknowledgmentDate: { not: null },
        },
      }),
      this.prisma.document.count({
        where: {
          acknowledgmentDate: { gte: todayStart },
        },
      }),
      this.prisma.document.count({
        where: {
          acknowledgmentDate: { gte: weekStart },
        },
      }),
      this.prisma.document.count({
        where: {
          acknowledgmentDate: { gte: monthStart },
        },
      }),
    ]);

    // Count by type
    const byTypeData = await this.prisma.document.groupBy({
      by: ['acknowledgmentType'],
      where: {
        acknowledgmentType: { not: null },
      },
      _count: true,
    });

    const byType = byTypeData.map((item) => ({
      type: item.acknowledgmentType || 'UNKNOWN',
      count: item._count,
    }));

    return {
      total,
      today,
      thisWeek,
      thisMonth,
      byType,
    };
  }
}
