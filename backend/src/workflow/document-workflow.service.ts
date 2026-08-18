import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentStage, StageStatus, Direction } from '@prisma/client';
import { WorkflowStageService } from './workflow-stage.service';
import { BusinessHoursService } from '../common/utils/business-hours.util';
import { AdvanceStageDto } from './dto';
import { addHours } from 'date-fns';

/**
 * Service for managing document workflow lifecycle
 *
 * Handles:
 * - Workflow initialization on document creation
 * - Stage transitions and validation
 * - Stage advancement logic
 * - Workflow completion tracking
 *
 * Client workflow:
 * - 10 stages for incoming documents
 * - 5 stages for outgoing documents
 */
@Injectable()
export class DocumentWorkflowService {
  // Incoming document workflow (10 stages)
  private readonly INCOMING_WORKFLOW: DocumentStage[] = [
    DocumentStage.MANUAL_ENTRY,
    DocumentStage.SCANNING_ASSIGNED,
    DocumentStage.AI_SUMMARY,
    DocumentStage.DECREED,
    DocumentStage.DECREE_PRINTED,
    DocumentStage.REPORT_RECEIVED,
    DocumentStage.RESPONSE_PREPARED,
    DocumentStage.SIGNATURE_PROTOCOL,
    DocumentStage.ACKNOWLEDGMENT,
    DocumentStage.ARCHIVED,
  ];

  // Outgoing document workflow (5 stages)
  private readonly OUTGOING_WORKFLOW: DocumentStage[] = [
    DocumentStage.DRAFT_CREATION,
    DocumentStage.SIGNATURE_PROTOCOL,
    DocumentStage.PRINTED_SENT,
    DocumentStage.AWAITING_RESPONSE, // Only if requiresResponse = true
    DocumentStage.RESPONSE_RECEIVED, // Only if requiresResponse = true
  ];

  constructor(
    private prisma: PrismaService,
    private workflowStageService: WorkflowStageService,
    private businessHours: BusinessHoursService,
  ) {}

  /**
   * Initialize workflow for a new document
   * Creates all workflow stages based on document direction
   */
  async initializeWorkflow(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        direction: true,
        requiresResponse: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Determine workflow stages based on document direction
    let stages: DocumentStage[] = [];

    if (document.direction === Direction.IN) {
      stages = [...this.INCOMING_WORKFLOW];
    } else if (document.direction === Direction.OUT) {
      stages = [...this.OUTGOING_WORKFLOW];

      // Remove response stages if not required
      if (!document.requiresResponse) {
        stages = stages.filter(
          (stage) =>
            stage !== DocumentStage.AWAITING_RESPONSE &&
            stage !== DocumentStage.RESPONSE_RECEIVED,
        );
      }
    }

    // Create all workflow stages
    for (const stage of stages) {
      await this.workflowStageService.createStage(documentId, stage);
    }

    // Set current stage to first stage
    await this.prisma.document.update({
      where: { id: documentId },
      data: { currentStage: stages[0] },
    });

    // Mark first stage as IN_PROGRESS
    const firstStage = await this.prisma.workflowStage.findFirst({
      where: { documentId, stage: stages[0] },
    });

    if (firstStage) {
      await this.workflowStageService.startStage(firstStage.id);
    }

    return this.getWorkflowStatus(documentId);
  }

  /**
   * Get workflow status for a document
   */
  async getWorkflowStatus(documentId: string) {
    const stages = await this.workflowStageService.getDocumentStages(
      documentId,
    );
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        currentStage: true,
        workflowCompleted: true,
        workflowCompletedAt: true,
      },
    });

    const totalStages = stages.length;
    const completedStages = stages.filter(
      (s) => s.status === StageStatus.COMPLETED || s.status === StageStatus.SKIPPED,
    ).length;
    const progress = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;

    return {
      documentId,
      currentStage: document?.currentStage,
      workflowCompleted: document?.workflowCompleted,
      workflowCompletedAt: document?.workflowCompletedAt,
      totalStages,
      completedStages,
      progress: Math.round(progress),
      stages,
    };
  }

  /**
   * Advance document to next workflow stage
   */
  async advanceToNextStage(
    documentId: string,
    userId: string,
    advanceDto?: AdvanceStageDto,
  ) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        currentStage: true,
        direction: true,
        requiresResponse: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (!document.currentStage) {
      throw new BadRequestException(
        'Document has no active workflow. Initialize workflow first.',
      );
    }

    // Get current stage
    const currentStage = await this.prisma.workflowStage.findFirst({
      where: {
        documentId,
        stage: document.currentStage,
      },
    });

    if (!currentStage) {
      throw new NotFoundException('Current workflow stage not found');
    }

    // Check if current stage is completed or skipped
    if (
      currentStage.status !== StageStatus.IN_PROGRESS &&
      currentStage.status !== StageStatus.PENDING
    ) {
      throw new BadRequestException(
        'Current stage must be in progress or pending to advance',
      );
    }

    // Complete current stage
    await this.workflowStageService.completeStage(
      currentStage.id,
      userId,
      advanceDto?.notes,
      advanceDto?.metadata,
    );

    // Determine next stage
    const workflow =
      document.direction === Direction.IN
        ? this.INCOMING_WORKFLOW
        : this.OUTGOING_WORKFLOW;

    const currentIndex = workflow.indexOf(document.currentStage);

    if (currentIndex === -1) {
      throw new BadRequestException('Invalid current stage');
    }

    // Check if this is the last stage
    if (currentIndex >= workflow.length - 1) {
      // Mark workflow as completed
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          workflowCompleted: true,
          workflowCompletedAt: new Date(),
        },
      });

      return this.getWorkflowStatus(documentId);
    }

    // Get next stage (skip skipped stages)
    let nextStageIndex = currentIndex + 1;
    let nextStage = workflow[nextStageIndex];

    // Skip to next non-skipped stage
    while (nextStageIndex < workflow.length) {
      const stageRecord = await this.prisma.workflowStage.findFirst({
        where: {
          documentId,
          stage: workflow[nextStageIndex],
        },
      });

      if (stageRecord && stageRecord.status !== StageStatus.SKIPPED) {
        nextStage = workflow[nextStageIndex];
        break;
      }

      nextStageIndex++;
    }

    // Update document current stage
    await this.prisma.document.update({
      where: { id: documentId },
      data: { currentStage: nextStage },
    });

    // Mark next stage as IN_PROGRESS
    const nextStageRecord = await this.prisma.workflowStage.findFirst({
      where: { documentId, stage: nextStage },
    });

    if (nextStageRecord) {
      await this.workflowStageService.startStage(nextStageRecord.id);
    }

    return this.getWorkflowStatus(documentId);
  }

  /**
   * Set custom deadline for decree stage
   *
   * Client requirement: "Es a mi criterio" (At Minister's discretion)
   * Minister can set custom deadline for each decree
   */
  async setDecreeDeadline(
    documentId: string,
    customDeadline?: Date,
    deadlineHours?: number,
  ) {
    const decreeStage = await this.prisma.workflowStage.findFirst({
      where: {
        documentId,
        stage: DocumentStage.DECREED,
      },
    });

    if (!decreeStage) {
      throw new NotFoundException('Decree stage not found for this document');
    }

    let dueDate: Date;

    if (customDeadline) {
      dueDate = customDeadline;
    } else if (deadlineHours) {
      dueDate = addHours(new Date(), deadlineHours);
    } else {
      // Default 48 hours
      dueDate = addHours(new Date(), 48);
    }

    return this.prisma.workflowStage.update({
      where: { id: decreeStage.id },
      data: {
        customDeadline,
        deadlineHours,
        dueDate,
      },
    });
  }

  /**
   * Check if document is ready for signature
   */
  async isReadyForSignature(documentId: string): Promise<boolean> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { currentStage: true },
    });

    return document?.currentStage === DocumentStage.SIGNATURE_PROTOCOL;
  }

  /**
   * Check documents that need reminders
   * Only during business hours, 24h after deadline
   *
   * Client requirement: "un solo recordatorio 24 horas después de la fecha límite"
   */
  async checkForReminders() {
    // Only run during business hours
    if (!this.businessHours.shouldSendReminderNow()) {
      return {
        message: 'Not business hours, reminders not sent',
        sent: 0,
      };
    }

    const twentyFourHoursAgo = addHours(new Date(), -24);
    const twentyFiveHoursAgo = addHours(new Date(), -25);

    // Find documents with deadline expired 24h ago
    const documentsNeedingReminders = await this.prisma.document.findMany({
      where: {
        responseDeadline: {
          gte: twentyFiveHoursAgo,
          lt: twentyFourHoursAgo,
        },
        remindersSent: 0, // Only one reminder
        responseReceived: false,
      },
      include: {
        responsible: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const remindersSent = [];

    for (const doc of documentsNeedingReminders) {
      // Create reminder log
      await this.prisma.reminderLog.create({
        data: {
          documentId: doc.id,
          reminderType: 'RESPONSE',
          recipientIds: doc.responsibleId ? [doc.responsibleId] : [],
          method: 'EMAIL',
        },
      });

      // Update document
      await this.prisma.document.update({
        where: { id: doc.id },
        data: {
          remindersSent: 1,
          lastReminderSentAt: new Date(),
        },
      });

      remindersSent.push(doc.id);
    }

    return {
      message: `Sent ${remindersSent.length} reminders`,
      sent: remindersSent.length,
      documentIds: remindersSent,
    };
  }

  /**
   * Get workflow configuration for document type
   */
  async getWorkflowConfiguration(documentType: Direction) {
    const stages =
      documentType === Direction.IN
        ? this.INCOMING_WORKFLOW
        : this.OUTGOING_WORKFLOW;

    return {
      documentType,
      stages: stages.map((stage, index) => ({
        order: index + 1,
        stage,
        name: this.getStageName(stage),
        description: this.getStageDescription(stage),
      })),
    };
  }

  /**
   * Helper: Get stage display name
   */
  private getStageName(stage: DocumentStage): string {
    const names: Record<DocumentStage, string> = {
      [DocumentStage.MANUAL_ENTRY]: 'Entrada Manual',
      [DocumentStage.SCANNING_ASSIGNED]: 'Asignación de Escaneo',
      [DocumentStage.AI_SUMMARY]: 'Resumen IA',
      [DocumentStage.DECREED]: 'Decreto',
      [DocumentStage.DECREE_PRINTED]: 'Decreto Impreso',
      [DocumentStage.REPORT_RECEIVED]: 'Reporte Recibido',
      [DocumentStage.RESPONSE_PREPARED]: 'Respuesta Preparada',
      [DocumentStage.SIGNATURE_PROTOCOL]: 'Protocolo de Firma',
      [DocumentStage.ACKNOWLEDGMENT]: 'Acuse de Recibo',
      [DocumentStage.ARCHIVED]: 'Archivado',
      [DocumentStage.DRAFT_CREATION]: 'Creación de Borrador',
      [DocumentStage.PRINTED_SENT]: 'Impreso y Enviado',
      [DocumentStage.AWAITING_RESPONSE]: 'Esperando Respuesta',
      [DocumentStage.REMINDER_SENT]: 'Recordatorio Enviado',
      [DocumentStage.RESPONSE_RECEIVED]: 'Respuesta Recibida',
    };

    return names[stage] || stage;
  }

  /**
   * Helper: Get stage description
   */
  private getStageDescription(stage: DocumentStage): string {
    const descriptions: Record<DocumentStage, string> = {
      [DocumentStage.MANUAL_ENTRY]: 'Registro manual de entrada del documento',
      [DocumentStage.SCANNING_ASSIGNED]: 'Asignación de número de escaneo',
      [DocumentStage.AI_SUMMARY]: 'Generación de resumen con IA',
      [DocumentStage.DECREED]: 'Documento decretado a departamento',
      [DocumentStage.DECREE_PRINTED]: 'Decreto impreso y enviado',
      [DocumentStage.REPORT_RECEIVED]: 'Reporte recibido del departamento',
      [DocumentStage.RESPONSE_PREPARED]: 'Respuesta preparada',
      [DocumentStage.SIGNATURE_PROTOCOL]: 'Protocolo de firma del Ministro',
      [DocumentStage.ACKNOWLEDGMENT]: 'Acuse de recibo capturado',
      [DocumentStage.ARCHIVED]: 'Documento archivado',
      [DocumentStage.DRAFT_CREATION]: 'Creación del borrador',
      [DocumentStage.PRINTED_SENT]: 'Documento impreso y enviado',
      [DocumentStage.AWAITING_RESPONSE]: 'Esperando respuesta del destinatario',
      [DocumentStage.REMINDER_SENT]: 'Recordatorio enviado',
      [DocumentStage.RESPONSE_RECEIVED]: 'Respuesta recibida',
    };

    return descriptions[stage] || '';
  }
}
