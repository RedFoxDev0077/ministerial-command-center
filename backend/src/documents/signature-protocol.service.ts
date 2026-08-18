import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { MinisterValidationService } from '../auth/minister-validation.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/create-notification.dto';

/**
 * Signature Protocol Service
 *
 * Handles the Minister signature protocol (8-stage workflow):
 * 1. Document preparation for signature
 * 2. Minister review
 * 3. Digital/physical signature
 * 4. Seal application
 * 5. Document finalization
 * 6. Archive preparation
 * 7. Notification to stakeholders
 * 8. Workflow completion
 *
 * Client requirement: Only the Minister can sign documents ("Solo puedo firmar yo")
 */
@Injectable()
export class SignatureProtocolService {
  private readonly logger = new Logger(SignatureProtocolService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private audit: AuditService,
    private ministerValidation: MinisterValidationService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Sign document (Minister only)
   * Client requirement: "Solo puedo firmar yo" - Only Minister can sign
   */
  async signDocument(
    documentId: string,
    userId: string,
    signatureData: {
      signatureType: 'DIGITAL' | 'PHYSICAL' | 'BOTH';
      signatureDate: Date;
      digitalSignatureBuffer?: Buffer;
      physicalSignatureScanBuffer?: Buffer;
      notes?: string;
    },
  ): Promise<any> {
    // CRITICAL: Validate Minister-only permission
    await this.ministerValidation.validateCanSign(userId);

    // Verify document exists and is ready for signature
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        createdBy: {
          select: {
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

    // Check if already signed
    if (document.signedAt) {
      throw new BadRequestException(
        'Document has already been signed. Use updateSignature() to modify.',
      );
    }

    // Verify document is in signature stage
    if (document.currentStage !== 'SIGNATURE_PROTOCOL') {
      const stageMessage = document.currentStage
        ? `Etapa actual: ${document.currentStage}`
        : 'El documento no tiene una etapa asignada';

      throw new BadRequestException(
        `El documento debe estar en la etapa "Protocolo de Firma" (SIGNATURE_PROTOCOL) para ser firmado. ${stageMessage}. Por favor, cambie el estado del documento primero usando el botón "Cambiar Estado".`,
      );
    }

    // Get Minister user info
    const minister = await this.ministerValidation.getMinister();

    // Upload signature images if provided
    let digitalSignatureUrl: string | null = null;
    let physicalSignatureUrl: string | null = null;

    if (signatureData.digitalSignatureBuffer) {
      digitalSignatureUrl = await this.uploadSignatureFile(
        documentId,
        signatureData.digitalSignatureBuffer,
        'digital',
      );
    }

    if (signatureData.physicalSignatureScanBuffer) {
      physicalSignatureUrl = await this.uploadSignatureFile(
        documentId,
        signatureData.physicalSignatureScanBuffer,
        'physical',
      );
    }

    // Update document with signature
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        signedAt: signatureData.signatureDate,
        signedBy: userId,
        digitalSignatureUrl,
        physicalSignatureUrl,
      },
      include: {
        responsible: true,
        createdBy: true,
      },
    });

    // Create audit log
    await this.audit.log(userId, {
      action: 'DOCUMENT_SIGNED',
      resourceType: 'document',
      resourceId: documentId,
      changes: {
        signatureType: signatureData.signatureType,
        signatureDate: signatureData.signatureDate.toISOString(),
        ministerName: `${minister.firstName} ${minister.lastName}`,
        digitalSignature: digitalSignatureUrl,
        physicalSignature: physicalSignatureUrl,
        notes: signatureData.notes,
      },
    });

    // Send notifications (non-blocking — don't wait for email delivery)
    this.sendSignatureNotifications(updated, minister).catch(() => {});

    this.logger.log(
      `Document ${document.correlativeNumber} signed by Minister ${minister.firstName} ${minister.lastName}`,
    );

    return {
      success: true,
      document: updated,
      signature: {
        type: signatureData.signatureType,
        date: signatureData.signatureDate,
        signedBy: `${minister.firstName} ${minister.lastName}`,
        ministerRole: minister.role,
        digitalSignatureUrl,
        physicalSignatureUrl,
      },
    };
  }

  /**
   * Apply physical seal to signed document
   * Seal is applied after Minister signature
   */
  async applySeal(
    documentId: string,
    userId: string,
    sealData: {
      sealDate: Date;
      sealScanBuffer?: Buffer;
      sealImagePath?: string;
      appliedBy: string;
      notes?: string;
    },
  ): Promise<any> {
    // Verify document exists and is signed
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    if (!document.signedAt) {
      throw new BadRequestException(
        'Document must be signed before applying seal',
      );
    }

    if (document.physicalSealFile) {
      throw new BadRequestException(
        'Seal has already been applied. Use updateSeal() to modify.',
      );
    }

    // Upload seal scan if provided
    let sealImageUrl: string | null = null;
    if (sealData.sealScanBuffer) {
      sealImageUrl = await this.uploadSealFile(
        documentId,
        sealData.sealScanBuffer,
      );
    } else if (sealData.sealImagePath) {
      sealImageUrl = sealData.sealImagePath;
    }

    // Update document with seal
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        physicalSealFile: sealImageUrl,
        sealAppliedAt: sealData.sealDate,
      },
    });

    // Create audit log
    await this.audit.log(userId, {
      action: 'SEAL_APPLIED',
      resourceType: 'document',
      resourceId: documentId,
      changes: {
        sealDate: sealData.sealDate.toISOString(),
        appliedBy: sealData.appliedBy,
        sealImage: sealImageUrl,
        notes: sealData.notes,
      },
    });

    this.logger.log(
      `Seal applied to document ${document.correlativeNumber} by ${sealData.appliedBy}`,
    );

    return {
      success: true,
      document: updated,
      seal: {
        date: sealData.sealDate,
        appliedBy: sealData.appliedBy,
        imageUrl: sealImageUrl,
      },
    };
  }

  /**
   * Complete signature protocol workflow
   * Final step after signature and seal
   */
  async completeSignatureProtocol(
    documentId: string,
    userId: string,
  ): Promise<any> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // Verify signature and seal
    if (!document.signedAt) {
      throw new BadRequestException('Document must be signed first');
    }

    if (!document.physicalSealFile && document.direction === 'OUT') {
      throw new BadRequestException(
        'Outgoing documents require physical seal before completing protocol',
      );
    }

    // Update document to next stage
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        currentStage:
          document.direction === 'IN' ? 'ACKNOWLEDGMENT' : 'PRINTED_SENT',
      },
    });

    // Create audit log
    await this.audit.log(userId, {
      action: 'SIGNATURE_PROTOCOL_COMPLETED',
      resourceType: 'document',
      resourceId: documentId,
      changes: {
        signedAt: document.signedAt,
        sealAppliedAt: document.sealAppliedAt,
        nextStage: updated.currentStage,
      },
    });

    this.logger.log(
      `Signature protocol completed for document ${document.correlativeNumber}`,
    );

    return {
      success: true,
      document: updated,
      message: 'Signature protocol completed successfully',
      nextStage: updated.currentStage,
    };
  }

  /**
   * Check if document is ready for Minister signature
   */
  async isReadyForSignature(documentId: string): Promise<boolean> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        currentStage: true,
        signedAt: true,
        direction: true,
      },
    });

    if (!document) {
      return false;
    }

    // Document must be in SIGNATURE_PROTOCOL stage
    // Document must not be already signed
    return (
      document.currentStage === 'SIGNATURE_PROTOCOL' &&
      document.signedAt === null
    );
  }

  /**
   * Get signature information
   */
  async getSignatureInfo(documentId: string): Promise<any> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        correlativeNumber: true,
        signedAt: true,
        signedBy: true,
        physicalSealFile: true,
        sealAppliedAt: true,
        currentStage: true,
      },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    if (!document.signedAt) {
      return {
        isSigned: false,
        message: 'Document has not been signed yet',
        isReadyForSignature: await this.isReadyForSignature(documentId),
      };
    }

    // Get Minister info
    let ministerInfo = null;
    if (document.signedBy) {
      const minister = await this.prisma.user.findUnique({
        where: { id: document.signedBy },
        select: {
          firstName: true,
          lastName: true,
          position: true,
          role: true,
        },
      });
      ministerInfo = minister;
    }

    return {
      isSigned: true,
      signature: {
        date: document.signedAt,
        signedBy: ministerInfo,
      },
      seal: {
        applied: !!document.physicalSealFile,
        date: document.sealAppliedAt,
        imageUrl: document.physicalSealFile,
      },
    };
  }

  /**
   * Upload signature file to storage
   */
  private async uploadSignatureFile(
    documentId: string,
    fileBuffer: Buffer,
    type: 'digital' | 'physical',
  ): Promise<string> {
    try {
      const fileName = `signature-${type}-${documentId}-${Date.now()}.png`;
      const folder = `documents/${documentId}/signatures`;

      const uploadResult = await this.storage.uploadFileBuffer(
        fileBuffer,
        fileName,
        'image/png',
        folder,
      );

      return uploadResult.url;
    } catch (error) {
      this.logger.error(
        `Failed to upload signature file: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to upload signature file');
    }
  }

  /**
   * Upload seal file to storage
   */
  private async uploadSealFile(
    documentId: string,
    fileBuffer: Buffer,
  ): Promise<string> {
    try {
      const fileName = `seal-${documentId}-${Date.now()}.png`;
      const folder = `documents/${documentId}/seals`;

      const uploadResult = await this.storage.uploadFileBuffer(
        fileBuffer,
        fileName,
        'image/png',
        folder,
      );

      return uploadResult.url;
    } catch (error) {
      this.logger.error(
        `Failed to upload seal file: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to upload seal file');
    }
  }

  /**
   * Send notifications when document is signed
   */
  private async sendSignatureNotifications(
    document: any,
    minister: any,
  ): Promise<void> {
    try {
      // Notify document creator
      if (document.createdById) {
        await this.notifications.create({
          userId: document.createdById,
          type: NotificationType.SIGNATURE_COMPLETED,
          title: 'Documento Firmado',
          message: `El documento ${document.correlativeNumber} ha sido firmado por el Ministro ${minister.firstName} ${minister.lastName}.`,
          relatedId: document.id,
          relatedType: 'document',
        });

        // Send email
        if (document.createdBy?.email) {
          await this.notifications.sendEmailNotification(
            document.createdBy.email,
            `Documento Firmado - ${document.correlativeNumber}`,
            this.buildSignatureEmail(document, minister),
          );
        }
      }

      // Notify responsible user if different
      if (
        document.responsibleId &&
        document.responsibleId !== document.createdById
      ) {
        await this.notifications.create({
          userId: document.responsibleId,
          type: NotificationType.SIGNATURE_COMPLETED,
          title: 'Documento Firmado',
          message: `El documento ${document.correlativeNumber} ha sido firmado por el Ministro.`,
          relatedId: document.id,
          relatedType: 'document',
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to send signature notifications: ${error.message}`,
      );
      // Don't throw - signature was recorded successfully
    }
  }

  /**
   * Build signature email content
   */
  private buildSignatureEmail(document: any, minister: any): string {
    const signDate = new Date(document.signedAt).toLocaleDateString('es-ES');

    return `
Estimado/a,

Le informamos que el siguiente documento ha sido firmado oficialmente:

Documento: ${document.correlativeNumber}
Título: ${document.title}
Fecha de Firma: ${signDate}
Firmado por: ${minister.firstName} ${minister.lastName}
Cargo: ${minister.position || 'Ministro'}

El documento ahora está en proceso de finalización y archivo.

---
Sistema de Gestión Documental
Ministerio de Transporte, Tecnología, Correos y Telecomunicaciones
República de Guinea Ecuatorial
    `.trim();
  }

  /**
   * Get signature statistics
   */
  async getSignatureStats(): Promise<{
    totalSigned: number;
    signedToday: number;
    signedThisWeek: number;
    signedThisMonth: number;
    withSeal: number;
    withoutSeal: number;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalSigned, signedToday, signedThisWeek, signedThisMonth, withSeal] =
      await Promise.all([
        this.prisma.document.count({
          where: {
            signedAt: { not: null },
          },
        }),
        this.prisma.document.count({
          where: {
            signedAt: { gte: todayStart },
          },
        }),
        this.prisma.document.count({
          where: {
            signedAt: { gte: weekStart },
          },
        }),
        this.prisma.document.count({
          where: {
            signedAt: { gte: monthStart },
          },
        }),
        this.prisma.document.count({
          where: {
            signedAt: { not: null },
            physicalSealFile: { not: null },
          },
        }),
      ]);

    const withoutSeal = totalSigned - withSeal;

    return {
      totalSigned,
      signedToday,
      signedThisWeek,
      signedThisMonth,
      withSeal,
      withoutSeal,
    };
  }
}
