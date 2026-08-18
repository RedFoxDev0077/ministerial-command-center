import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/create-notification.dto';
import { EmailService } from '../email/email.service';
import { CreateSignatureFlowDto } from './dto/create-signature-flow.dto';
import { SignDocumentDto } from './dto/sign-document.dto';
import { RejectDocumentDto } from './dto/reject-document.dto';
import { SignatureStatus, ParticipantStatus } from '@prisma/client';

@Injectable()
export class SignatureFlowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new signature flow and send to participants
   */
  async createSignatureFlow(userId: string, dto: CreateSignatureFlowDto) {
    // Verify document exists
    const document = await this.prisma.document.findUnique({
      where: { id: dto.documentId },
      include: { createdBy: true },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Verify all participants exist
    const participants = await this.prisma.user.findMany({
      where: { id: { in: dto.userIds } },
    });

    if (participants.length !== dto.userIds.length) {
      throw new BadRequestException('One or more participant users not found');
    }

    // Create signature flow
    const flow = await this.prisma.signatureFlow.create({
      data: {
        document: {
          connect: { id: dto.documentId },
        },
        createdBy: {
          connect: { id: userId },
        },
        title: dto.title || `Firma de ${document.title}`,
        description: dto.description || dto.message || '',
        status: SignatureStatus.PENDING,
        participants: {
          create: dto.userIds.map((participantId, index) => ({
            userId: participantId,
            order: index + 1,
            status: ParticipantStatus.PENDING,
          })),
        },
      },
      include: {
        document: true,
        createdBy: true,
        participants: {
          include: { user: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    // Update flow status to IN_PROGRESS
    await this.prisma.signatureFlow.update({
      where: { id: flow.id },
      data: { status: SignatureStatus.IN_PROGRESS },
    });

    // Send notifications to participants
    if (dto.sendNotification !== false) {
      for (const participant of flow.participants) {
        try {
          // Create in-app notification
          await this.notificationsService.create({
            userId: participant.userId,
            type: NotificationType.SIGNATURE_REQUIRED,
            title: 'Nueva solicitud de firma',
            message: `${flow.createdBy.firstName} ${flow.createdBy.lastName} ha solicitado tu firma para: ${flow.title}`,
            relatedId: flow.id,
            relatedType: 'SIGNATURE_FLOW',
          });

          // Send email notification
          if (dto.notificationMethod === 'EMAIL' || dto.notificationMethod === 'BOTH') {
            const appUrl = this.configService.get<string>('APP_URL') || 'http://72.61.41.94';
            await this.emailService.sendSignatureRequiredEmail({
              to: participant.user.email,
              userName: `${participant.user.firstName} ${participant.user.lastName}`,
              correlativeNumber: flow.document.correlativeNumber,
              documentTitle: flow.title,
              deadline: dto.message ? `Mensaje: ${dto.message}` : 'Lo antes posible',
              documentUrl: `${appUrl}/firma-electronica`,
            });
          }
        } catch (error) {
          // Log notification errors but don't fail the signature flow creation
          console.error(`Failed to send notification to ${participant.user.email}:`, error.message);
        }
      }
    }

    // Audit log
    await this.auditService.log(userId, {
      action: 'CREATE_DOCUMENT',
      resourceType: 'SIGNATURE_FLOW',
      resourceId: flow.id,
      changes: {
        documentId: dto.documentId,
        participantCount: dto.userIds.length,
      },
    });

    return flow;
  }

  /**
   * Get all signature flows (optionally filter by status or participant)
   */
  async getSignatureFlows(userId: string, filters?: { status?: SignatureStatus; participantId?: string }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.participantId) {
      where.participants = {
        some: { userId: filters.participantId },
      };
    }

    const flows = await this.prisma.signatureFlow.findMany({
      where,
      include: {
        document: true,
        createdBy: true,
        participants: {
          include: { user: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return flows;
  }

  /**
   * Verify document integrity by comparing stored hash with current content hash
   */
  async verifyIntegrity(flowId: string, userId: string) {
    const flow = await this.prisma.signatureFlow.findUnique({
      where: { id: flowId },
      include: { document: true },
    });

    if (!flow) throw new NotFoundException('Signature flow not found');
    if (!flow.documentHash) {
      return { verified: false, reason: 'No hash stored for this signature flow' };
    }

    const docContent = flow.document.content || flow.document.title || '';
    const currentHash = crypto.createHash('sha256').update(docContent).digest('hex');

    return {
      verified: currentHash === flow.documentHash,
      originalHash: flow.documentHash,
      currentHash,
      hashAlgorithm: flow.hashAlgorithm,
      signedAt: flow.completedAt,
      hashTimestamp: flow.hashTimestamp,
    };
  }

  /**
   * Get signature flow by ID
   */
  async getSignatureFlowById(flowId: string, userId: string) {
    const flow = await this.prisma.signatureFlow.findUnique({
      where: { id: flowId },
      include: {
        document: {
          include: {
            files: true,
            expediente: true,
          },
        },
        createdBy: true,
        participants: {
          include: { user: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!flow) {
      throw new NotFoundException('Signature flow not found');
    }

    return flow;
  }

  /**
   * Sign a document in a signature flow
   */
  async signDocument(flowId: string, userId: string, dto: SignDocumentDto) {
    // Get flow and participant
    const flow = await this.prisma.signatureFlow.findUnique({
      where: { id: flowId },
      include: {
        document: true,
        participants: {
          include: { user: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!flow) {
      throw new NotFoundException('Signature flow not found');
    }

    if (flow.status === SignatureStatus.SIGNED) {
      throw new BadRequestException('This signature flow is already completed');
    }

    if (flow.status === SignatureStatus.REJECTED || flow.status === SignatureStatus.CANCELLED) {
      throw new BadRequestException('This signature flow has been rejected or cancelled');
    }

    // Find participant
    const participant = flow.participants.find((p) => p.userId === userId);

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this signature flow');
    }

    if (participant.status === ParticipantStatus.SIGNED) {
      throw new BadRequestException('You have already signed this document');
    }

    if (participant.status === ParticipantStatus.REJECTED) {
      throw new BadRequestException('You have already rejected this document');
    }

    // Update participant status
    await this.prisma.signatureParticipant.update({
      where: { id: participant.id },
      data: {
        status: ParticipantStatus.SIGNED,
        signedAt: new Date(),
        signatureData: dto.signatureData || null,
      },
    });

    // Check if all participants have signed
    const allParticipants = await this.prisma.signatureParticipant.findMany({
      where: { flowId },
    });

    const allSigned = allParticipants.every((p) => p.status === ParticipantStatus.SIGNED);

    if (allSigned) {
      // Compute document integrity hash
      const docContent = flow.document.content || flow.document.title || '';
      const documentHash = crypto.createHash('sha256').update(docContent).digest('hex');

      // Update flow status to SIGNED with hash
      await this.prisma.signatureFlow.update({
        where: { id: flowId },
        data: {
          status: SignatureStatus.SIGNED,
          completedAt: new Date(),
          documentHash,
          hashAlgorithm: 'SHA-256',
          hashTimestamp: new Date(),
        },
      });

      // Notify creator
      await this.notificationsService.create({
        userId: flow.createdById,
        type: NotificationType.SIGNATURE_COMPLETED,
        title: 'Firma completada',
        message: `Todos los participantes han firmado el documento: ${flow.title}`,
        relatedId: flow.id,
        relatedType: 'SIGNATURE_FLOW',
      });
    }

    // Audit log
    await this.auditService.log(userId, {
      action: 'SIGN_DOCUMENT',
      resourceType: 'SIGNATURE_FLOW',
      resourceId: flowId,
      changes: {
        documentId: flow.documentId,
        participantId: participant.id,
      },
    });

    return this.getSignatureFlowById(flowId, userId);
  }

  /**
   * Reject a document in a signature flow
   */
  async rejectDocument(flowId: string, userId: string, dto: RejectDocumentDto) {
    // Get flow and participant
    const flow = await this.prisma.signatureFlow.findUnique({
      where: { id: flowId },
      include: {
        document: true,
        participants: {
          include: { user: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!flow) {
      throw new NotFoundException('Signature flow not found');
    }

    if (flow.status === SignatureStatus.SIGNED) {
      throw new BadRequestException('This signature flow is already completed');
    }

    if (flow.status === SignatureStatus.REJECTED || flow.status === SignatureStatus.CANCELLED) {
      throw new BadRequestException('This signature flow has already been rejected or cancelled');
    }

    // Find participant
    const participant = flow.participants.find((p) => p.userId === userId);

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this signature flow');
    }

    if (participant.status === ParticipantStatus.SIGNED) {
      throw new BadRequestException('You have already signed this document');
    }

    if (participant.status === ParticipantStatus.REJECTED) {
      throw new BadRequestException('You have already rejected this document');
    }

    // Update participant status
    await this.prisma.signatureParticipant.update({
      where: { id: participant.id },
      data: {
        status: ParticipantStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: dto.rejectionReason,
      },
    });

    // Update flow status to REJECTED
    await this.prisma.signatureFlow.update({
      where: { id: flowId },
      data: {
        status: SignatureStatus.REJECTED,
      },
    });

    // Notify creator
    await this.notificationsService.create({
      userId: flow.createdById,
      type: NotificationType.SYSTEM,
      title: 'Firma rechazada',
      message: `${participant.user.firstName} ${participant.user.lastName} ha rechazado la firma del documento: ${flow.title}. Motivo: ${dto.rejectionReason}`,
      relatedId: flow.id,
      relatedType: 'SIGNATURE_FLOW',
    });

    // Audit log
    await this.auditService.log(userId, {
      action: 'REJECT_SIGNATURE',
      resourceType: 'SIGNATURE_FLOW',
      resourceId: flowId,
      changes: {
        documentId: flow.documentId,
        participantId: participant.id,
        rejectionReason: dto.rejectionReason,
      },
    });

    return this.getSignatureFlowById(flowId, userId);
  }

  /**
   * Cancel a signature flow (creator only)
   */
  async cancelSignatureFlow(flowId: string, userId: string) {
    const flow = await this.prisma.signatureFlow.findUnique({
      where: { id: flowId },
      include: { participants: true },
    });

    if (!flow) {
      throw new NotFoundException('Signature flow not found');
    }

    if (flow.createdById !== userId) {
      throw new ForbiddenException('Only the creator can cancel this signature flow');
    }

    if (flow.status === SignatureStatus.SIGNED) {
      throw new BadRequestException('Cannot cancel a completed signature flow');
    }

    // Update flow status
    await this.prisma.signatureFlow.update({
      where: { id: flowId },
      data: { status: SignatureStatus.CANCELLED },
    });

    // Audit log
    await this.auditService.log(userId, {
      action: 'DELETE_DOCUMENT',
      resourceType: 'SIGNATURE_FLOW',
      resourceId: flowId,
      changes: { documentId: flow.documentId, cancelled: true },
    });

    return this.getSignatureFlowById(flowId, userId);
  }
}
