import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';

/**
 * Manual Entry Stamp Service
 *
 * Handles the first stage of incoming document workflow:
 * - Manual entry stamp capture (date, time, stamp image)
 * - Stamp validation and storage
 * - Integration with document workflow
 *
 * Client requirement: Physical documents receive manual entry stamp
 * Format: Date, Time, Entry number
 */
@Injectable()
export class ManualEntryStampService {
  private readonly logger = new Logger(ManualEntryStampService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private audit: AuditService,
  ) {}

  /**
   * Apply manual entry stamp to document
   * Records date, time, and uploads stamp image
   */
  async applyManualEntryStamp(
    documentId: string,
    userId: string,
    stampData: {
      entryDate: Date;
      entryTime: string;
      stampImageBuffer?: Buffer;
      stampImagePath?: string;
      notes?: string;
    },
  ): Promise<any> {
    // Verify document exists
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // Check if document already has manual entry stamp
    if (document.manualEntryStamp) {
      throw new BadRequestException(
        'Document already has a manual entry stamp. Use updateManualEntryStamp() to modify it.',
      );
    }

    // Upload stamp image if provided
    let stampImageUrl: string | null = null;
    if (stampData.stampImageBuffer) {
      stampImageUrl = await this.uploadStampImage(
        documentId,
        stampData.stampImageBuffer,
      );
    } else if (stampData.stampImagePath) {
      stampImageUrl = stampData.stampImagePath;
    }

    // Format entry stamp string
    const entryStampText = this.formatEntryStamp(
      stampData.entryDate,
      stampData.entryTime,
      document.correlativeNumber,
    );

    // Update document with manual entry stamp
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        manualEntryDate: stampData.entryDate,
        manualEntryTime: stampData.entryTime,
        manualEntryStamp: stampImageUrl,
        currentStage: 'MANUAL_ENTRY',
      },
      include: {
        responsible: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    await this.audit.log(userId, {
      action: 'MANUAL_ENTRY_STAMP_APPLIED',
      resourceType: 'document',
      resourceId: documentId,
      changes: {
        entryDate: stampData.entryDate.toISOString(),
        entryTime: stampData.entryTime,
        stampImage: stampImageUrl,
        notes: stampData.notes,
      },
    });

    this.logger.log(
      `Manual entry stamp applied to document ${document.correlativeNumber} by user ${userId}`,
    );

    return {
      success: true,
      document: updated,
      entryStamp: {
        date: stampData.entryDate,
        time: stampData.entryTime,
        imageUrl: stampImageUrl,
        formattedText: entryStampText,
      },
    };
  }

  /**
   * Update existing manual entry stamp
   */
  async updateManualEntryStamp(
    documentId: string,
    userId: string,
    updates: {
      entryDate?: Date;
      entryTime?: string;
      stampImageBuffer?: Buffer;
      stampImagePath?: string;
      notes?: string;
    },
  ): Promise<any> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    if (!document.manualEntryStamp && !document.manualEntryDate) {
      throw new BadRequestException(
        'Document does not have a manual entry stamp yet. Use applyManualEntryStamp() first.',
      );
    }

    // Upload new stamp image if provided
    let stampImageUrl = document.manualEntryStamp;
    if (updates.stampImageBuffer) {
      stampImageUrl = await this.uploadStampImage(
        documentId,
        updates.stampImageBuffer,
      );
    } else if (updates.stampImagePath) {
      stampImageUrl = updates.stampImagePath;
    }

    // Update document
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        manualEntryDate: updates.entryDate || document.manualEntryDate,
        manualEntryTime: updates.entryTime || document.manualEntryTime,
        manualEntryStamp: stampImageUrl,
      },
    });

    // Create audit log
    await this.audit.log(userId, {
      action: 'MANUAL_ENTRY_STAMP_UPDATED',
      resourceType: 'document',
      resourceId: documentId,
      changes: {
        updates,
        previousStamp: document.manualEntryStamp,
        newStamp: stampImageUrl,
      },
    });

    this.logger.log(
      `Manual entry stamp updated for document ${document.correlativeNumber}`,
    );

    return {
      success: true,
      document: updated,
    };
  }

  /**
   * Get manual entry stamp information
   */
  async getManualEntryStamp(documentId: string): Promise<any> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        correlativeNumber: true,
        manualEntryDate: true,
        manualEntryTime: true,
        manualEntryStamp: true,
        currentStage: true,
      },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    if (!document.manualEntryDate && !document.manualEntryStamp) {
      return {
        hasStamp: false,
        message: 'Document does not have a manual entry stamp yet',
      };
    }

    return {
      hasStamp: true,
      stamp: {
        date: document.manualEntryDate,
        time: document.manualEntryTime,
        imageUrl: document.manualEntryStamp,
        formattedText: this.formatEntryStamp(
          document.manualEntryDate,
          document.manualEntryTime,
          document.correlativeNumber,
        ),
      },
    };
  }

  /**
   * Remove manual entry stamp (admin only)
   */
  async removeManualEntryStamp(
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
      throw new BadRequestException('Only admin can remove manual entry stamps');
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
        manualEntryDate: null,
        manualEntryTime: null,
        manualEntryStamp: null,
      },
    });

    // Create audit log
    await this.audit.log(userId, {
      action: 'MANUAL_ENTRY_STAMP_REMOVED',
      resourceType: 'document',
      resourceId: documentId,
      changes: {
        reason,
        previousStamp: {
          date: document.manualEntryDate,
          time: document.manualEntryTime,
          imageUrl: document.manualEntryStamp,
        },
      },
    });

    this.logger.warn(
      `Manual entry stamp removed from document ${document.correlativeNumber} by admin ${userId}. Reason: ${reason}`,
    );

    return {
      success: true,
      message: 'Manual entry stamp removed',
    };
  }

  /**
   * Upload stamp image to storage
   */
  private async uploadStampImage(
    documentId: string,
    imageBuffer: Buffer,
  ): Promise<string> {
    try {
      const fileName = `manual-entry-stamp-${documentId}-${Date.now()}.png`;
      const folder = `documents/${documentId}/stamps`;

      const uploadResult = await this.storage.uploadFileBuffer(
        imageBuffer,
        fileName,
        'image/png',
        folder,
      );

      return uploadResult.url;
    } catch (error) {
      this.logger.error(
        `Failed to upload stamp image: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to upload stamp image');
    }
  }

  /**
   * Format entry stamp text for display
   */
  private formatEntryStamp(
    entryDate: Date | null,
    entryTime: string | null,
    correlativeNumber: string,
  ): string {
    if (!entryDate || !entryTime) {
      return '';
    }

    const dateStr = entryDate.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    return `Entrada Manual
Fecha: ${dateStr}
Hora: ${entryTime}
Doc: ${correlativeNumber}`;
  }

  /**
   * Get statistics on manual entry stamps
   */
  async getManualEntryStats(): Promise<{
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    byUser: { userId: string; userName: string; count: number }[];
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, today, thisWeek, thisMonth] = await Promise.all([
      this.prisma.document.count({
        where: {
          manualEntryDate: { not: null },
        },
      }),
      this.prisma.document.count({
        where: {
          manualEntryDate: { gte: todayStart },
        },
      }),
      this.prisma.document.count({
        where: {
          manualEntryDate: { gte: weekStart },
        },
      }),
      this.prisma.document.count({
        where: {
          manualEntryDate: { gte: monthStart },
        },
      }),
    ]);

    // Get counts by user (from audit logs)
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        action: 'MANUAL_ENTRY_STAMP_APPLIED',
      },
      select: {
        userId: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const byUserMap = auditLogs.reduce((acc, log) => {
      if (!acc[log.userId]) {
        acc[log.userId] = {
          userId: log.userId,
          userName: `${log.user.firstName} ${log.user.lastName}`,
          count: 0,
        };
      }
      acc[log.userId].count++;
      return acc;
    }, {} as Record<string, { userId: string; userName: string; count: number }>);

    const byUser = Object.values(byUserMap).sort((a, b) => b.count - a.count);

    return {
      total,
      today,
      thisWeek,
      thisMonth,
      byUser,
    };
  }
}
