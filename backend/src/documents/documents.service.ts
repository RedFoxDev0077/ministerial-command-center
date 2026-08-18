import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QrService } from './qr.service';
import { StorageService } from '../storage/storage.service';
import { CreateDocumentDto, DocumentStatus } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';
import { DecreeDocumentDto } from './dto/decree-document.dto';
import { AssignDocumentDto } from './dto/assign-document.dto';
import { SearchDocumentDto } from './dto/search-document.dto';
import { CreateDocumentFromTemplateDto } from './dto/create-document-from-template.dto';
import { PaginatedResponseDto, DashboardStatsDto } from './dto/document-response.dto';
import { CorrelativeNumberService } from './utils/correlative-number.util';
import { createPaginatedResponse, calculateSkip } from './utils/pagination.util';
import { Prisma, DocumentStage } from '@prisma/client';
import { OfficialPdfTemplateService } from './official-pdf-template.service';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private correlativeNumberService: CorrelativeNumberService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    private qrService: QrService,
    private storageService: StorageService,
    private officialPdfService: OfficialPdfTemplateService,
    private configService: ConfigService,
  ) {}

  /**
   * Create a new document
   */
  async create(createDocumentDto: CreateDocumentDto, userId: string) {
    // For non-draft documents, entityId and responsibleId are required
    if (!createDocumentDto.isDraft) {
      if (!createDocumentDto.entityId) {
        throw new BadRequestException('Entity ID is required for non-draft documents');
      }
      if (!createDocumentDto.responsibleId) {
        throw new BadRequestException('Responsible user ID is required for non-draft documents');
      }
    }

    // Validate entity exists (only if provided)
    if (createDocumentDto.entityId) {
      const entity = await this.prisma.entity.findUnique({
        where: { id: createDocumentDto.entityId },
      });
      if (!entity) {
        throw new NotFoundException(`Entity with ID ${createDocumentDto.entityId} not found`);
      }
    }

    // Validate responsible user exists (only if provided)
    if (createDocumentDto.responsibleId) {
      const responsibleUser = await this.prisma.user.findUnique({
        where: { id: createDocumentDto.responsibleId },
      });
      if (!responsibleUser) {
        throw new NotFoundException(
          `User with ID ${createDocumentDto.responsibleId} not found`,
        );
      }
    }

    // Validate expediente if provided
    if (createDocumentDto.expedienteId) {
      const expediente = await this.prisma.expediente.findUnique({
        where: { id: createDocumentDto.expedienteId },
      });
      if (!expediente) {
        throw new NotFoundException(
          `Expediente with ID ${createDocumentDto.expedienteId} not found`,
        );
      }
    }

    // Generate correlative number (decreto or regular)
    const correlativeNumber = createDocumentDto.isDecreto
      ? await this.correlativeNumberService.generateDecretoNumber()
      : await this.correlativeNumberService.generateCorrelativeNumber(
          createDocumentDto.direction,
        );

    // Determine status based on isDraft
    const status = createDocumentDto.isDraft ? DocumentStatus.DRAFT : DocumentStatus.PENDING;

    // Determine initial workflow stage based on direction
    let currentStage: DocumentStage;
    if (createDocumentDto.direction === 'IN') {
      // Incoming documents start at MANUAL_ENTRY stage
      currentStage = DocumentStage.MANUAL_ENTRY;
    } else {
      // Outgoing documents start at DRAFT_CREATION stage
      currentStage = DocumentStage.DRAFT_CREATION;
    }

    // Create document
    const { tags, ...documentData } = createDocumentDto;

    // Ensure entityId and responsibleId are provided (required by Prisma schema)
    if (!documentData.entityId || !documentData.responsibleId) {
      throw new BadRequestException('Entity ID and Responsible ID are required');
    }

    const document = await this.prisma.document.create({
      data: {
        title: documentData.title,
        type: documentData.type,
        direction: documentData.direction,
        classification: documentData.classification,
        channel: documentData.channel,
        origin: documentData.origin,
        entityId: documentData.entityId,
        responsibleId: documentData.responsibleId,
        expedienteId: documentData.expedienteId,
        priority: documentData.priority,
        content: documentData.content,
        isDraft: documentData.isDraft,
        receivedAt: documentData.receivedAt,
        sentAt: documentData.sentAt,
        correlativeNumber,
        status,
        currentStage, // Set initial workflow stage
        createdById: userId,
        // Decreto fields
        isDecreto: documentData.isDecreto || false,
        considerandos: documentData.considerandos || [],
        articulado: documentData.articulado || [],
        disposiciones: documentData.disposiciones || [],
        vigencia: documentData.vigencia,
        // Official PDF header fields
        subDepartment: documentData.subDepartment,
        referenceCode: documentData.referenceCode,
        signerTitle: documentData.signerTitle,
        recipientTitle: documentData.recipientTitle,
        tags: tags
          ? {
              create: tags.map((tagName) => ({
                tag: {
                  connectOrCreate: {
                    where: { name: tagName },
                    create: { name: tagName },
                  },
                },
              })),
            }
          : undefined,
      },
      include: {
        entity: true,
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
        expediente: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Generate QR code for document
    try {
      const qrCode = await this.qrService.generateDocumentQR(document.id);

      // Update document with QR code
      await this.prisma.document.update({
        where: { id: document.id },
        data: { qrCode },
      });

      this.logger.log(`QR code generated for document ${correlativeNumber}`);
    } catch (error) {
      this.logger.error(`Failed to generate QR code: ${error.message}`);
      // Don't throw - QR generation is not critical
    }

    // Audit log
    await this.auditService.logDocumentAction(
      userId,
      'CREATE_DOCUMENT',
      document.id,
      { documentData: { ...documentData, correlativeNumber, status } },
    );

    // Return document with QR code
    return this.prisma.document.findUnique({
      where: { id: document.id },
      include: {
        entity: true,
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
        expediente: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });
  }

  /**
   * Find all documents with filters and pagination
   */
  async findAll(queryDto: QueryDocumentDto): Promise<PaginatedResponseDto<any>> {
    const { page = 1, limit = 20, search, sort = 'createdAt:desc', ...filters } = queryDto;

    // Build WHERE clause
    const where: Prisma.DocumentWhereInput = {};

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { correlativeNumber: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Direction filter
    if (filters.direction) {
      where.direction = filters.direction;
    }

    // Status filter
    if (filters.status) {
      where.status = filters.status as any;
    }

    // Classification filter
    if (filters.classification) {
      where.classification = filters.classification;
    }

    // Entity filter
    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    // Responsible filter
    if (filters.responsibleId) {
      where.responsibleId = filters.responsibleId;
    }

    // Created by filter
    if (filters.createdById) {
      where.createdById = filters.createdById;
    }

    // Priority filter
    if (filters.priority) {
      where.priority = filters.priority;
    }

    // AI summary filter
    if (filters.hasAiSummary !== undefined) {
      where.aiSummary = filters.hasAiSummary ? { not: null } : null;
    }

    // Expediente filter
    if (filters.expedienteId) {
      where.expedienteId = filters.expedienteId;
    }

    // Draft filter
    if (filters.isDraft !== undefined) {
      where.isDraft = filters.isDraft;
    }

    // Date range filters
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    // Parse sort parameter
    const [sortField, sortOrder] = sort.split(':');
    const orderBy: Prisma.DocumentOrderByWithRelationInput = {
      [sortField]: sortOrder === 'asc' ? 'asc' : 'desc',
    };

    // Calculate pagination
    const skip = calculateSkip(page, limit);

    // Execute query
    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          entity: true,
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
          expediente: true,
          tags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              files: true,
              comments: true,
            },
          },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return createPaginatedResponse(documents, { total, page, limit });
  }

  /**
   * Find one document by ID
   */
  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        entity: true,
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
        expediente: true,
        tags: {
          include: {
            tag: true,
          },
        },
        files: true,
        comments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        deadlines: true,
        signatureFlows: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return document;
  }

  /**
   * Get a document for the unauthenticated QR-code view.
   *
   * This is an explicit allow-list, NOT `findOne`. Anyone holding (or guessing)
   * a document id can call this, so it must never expose internal working data:
   * the Minister's decree note and annotations, AI summaries/draft responses,
   * internal comments, deadlines, signature flows, expediente linkage, or staff
   * email addresses all stay server-side.
   */
  async findOnePublic(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        correlativeNumber: true,
        title: true,
        type: true,
        status: true,
        direction: true,
        classification: true,
        content: true,
        createdAt: true,
        receivedAt: true,
        sentAt: true,
        entity: {
          select: { id: true, name: true, shortName: true },
        },
        responsible: {
          select: { firstName: true, lastName: true },
        },
        files: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
          },
        },
        tags: {
          select: {
            tagId: true,
            tag: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return {
      ...document,
      // The public view reads `size`; the column is `fileSize`.
      files: document.files.map(({ fileSize, ...file }) => ({
        ...file,
        size: fileSize,
      })),
    };
  }

  /**
   * Update document
   */
  async update(id: string, updateDocumentDto: UpdateDocumentDto) {
    // Check if document exists
    await this.findOne(id);

    // Validate entity if being updated
    if (updateDocumentDto.entityId) {
      const entity = await this.prisma.entity.findUnique({
        where: { id: updateDocumentDto.entityId },
      });
      if (!entity) {
        throw new NotFoundException(`Entity with ID ${updateDocumentDto.entityId} not found`);
      }
    }

    // Validate responsible if being updated
    if (updateDocumentDto.responsibleId) {
      const user = await this.prisma.user.findUnique({
        where: { id: updateDocumentDto.responsibleId },
      });
      if (!user) {
        throw new NotFoundException(
          `User with ID ${updateDocumentDto.responsibleId} not found`,
        );
      }
    }

    const { tags, ...documentData } = updateDocumentDto;

    const document = await this.prisma.document.update({
      where: { id },
      data: {
        ...documentData,
        tags: tags
          ? {
              deleteMany: {},
              create: tags.map((tagName) => ({
                tag: {
                  connectOrCreate: {
                    where: { name: tagName },
                    create: { name: tagName },
                  },
                },
              })),
            }
          : undefined,
      },
      include: {
        entity: true,
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
        expediente: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Audit log
    await this.auditService.log(document.createdById, {
      action: 'UPDATE_DOCUMENT',
      resourceType: 'document',
      resourceId: id,
      changes: { updated: documentData },
    });

    return document;
  }

  /**
   * Update document status
   */
  async updateStatus(
    id: string,
    status: DocumentStatus,
    comment?: string,
    userId?: string,
  ) {
    const existingDoc = await this.findOne(id);

    const document = await this.prisma.document.update({
      where: { id },
      data: { status },
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

    // Audit log with status change details
    await this.auditService.log(userId || existingDoc.createdById, {
      action: 'UPDATE_STATUS',
      resourceType: 'document',
      resourceId: id,
      changes: {
        oldStatus: existingDoc.status,
        newStatus: status,
        comment: comment || undefined,
      },
    });

    return document;
  }

  /**
   * Update document workflow stage
   */
  async updateStage(
    id: string,
    currentStage: string,
    comment?: string,
    userId?: string,
  ) {
    const existingDoc = await this.findOne(id);

    const document = await this.prisma.document.update({
      where: { id },
      data: { currentStage: currentStage as any },
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

    // Audit log with stage change details
    await this.auditService.log(userId || existingDoc.createdById, {
      action: 'UPDATE_STAGE',
      resourceType: 'document',
      resourceId: id,
      changes: {
        oldStage: existingDoc.currentStage,
        newStage: currentStage,
        comment: comment || undefined,
      },
    });

    return document;
  }

  /**
   * Archive document (soft delete)
   */
  async remove(id: string) {
    const existingDoc = await this.findOne(id);

    const document = await this.prisma.document.update({
      where: { id },
      data: { status: 'ARCHIVED' as any },
    });

    // Audit log
    await this.auditService.log(existingDoc.createdById, {
      action: 'DELETE_DOCUMENT',
      resourceType: 'document',
      resourceId: id,
    });

    return {
      message: 'Document archived successfully',
      document,
    };
  }

  /**
   * Permanently delete document from database
   * This is a hard delete - data cannot be recovered
   */
  async permanentDelete(id: string) {
    const existingDoc = await this.findOne(id);

    // Delete related data first
    await this.prisma.documentFile.deleteMany({
      where: { documentId: id },
    });

    await this.prisma.deadline.deleteMany({
      where: { documentId: id },
    });

    // Delete the document
    await this.prisma.document.delete({
      where: { id },
    });

    // Audit log
    await this.auditService.log(existingDoc.createdById, {
      action: 'PERMANENT_DELETE_DOCUMENT',
      resourceType: 'document',
      resourceId: id,
    });

    return {
      message: 'Document permanently deleted',
    };
  }

  /**
   * Assign document to a user
   */
  async assign(id: string, assignDto: AssignDocumentDto) {
    await this.findOne(id);

    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: assignDto.userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${assignDto.userId} not found`);
    }

    const document = await this.prisma.document.update({
      where: { id },
      data: {
        responsibleId: assignDto.userId,
        status: 'IN_PROGRESS' as any,
      },
      include: {
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

    // Audit log
    await this.auditService.log(document.createdById, {
      action: 'ASSIGN_DOCUMENT',
      resourceType: 'document',
      resourceId: id,
      changes: { assignedTo: assignDto.userId, note: assignDto.note },
    });

    // Send notification to assigned user
    await this.notificationsService.create({
      userId: assignDto.userId,
      type: 'DOCUMENT_ASSIGNED' as any,
      title: 'Documento Asignado',
      message: `Se le ha asignado el documento: ${document.title}${assignDto.note ? `\n\nNota: ${assignDto.note}` : ''}`,
      relatedId: id,
      relatedType: 'document',
    });

    return {
      message: `Document assigned to ${user.firstName} ${user.lastName}`,
      document,
    };
  }

  /**
   * Decree document — saves the Minister's decree note and optionally sends
   * the official PDF to an external email address.
   */
  async decree(id: string, decreeDto: DecreeDocumentDto) {
    const document = await this.findOne(id);

    // Save decree note (and keep decretedTo if departments were passed)
    const updatedDocument = await this.prisma.document.update({
      where: { id },
      data: {
        ...(decreeDto.departmentIds?.length && { decretedTo: decreeDto.departmentIds }),
        ...(decreeDto.decreeNote !== undefined && { decreeNote: decreeDto.decreeNote }),
      },
    });

    // Send official PDF to external email if provided
    let emailResult: { sent: boolean; error?: string } | null = null;
    if (decreeDto.externalEmail) {
      try {
        const pdfBuffer = await this.officialPdfService.generateOfficialPDF(id);
        const filename = `Decreto-${document.correlativeNumber || id}.pdf`;
        const decreeNoteHtml = decreeDto.decreeNote
          ? `<div style="margin:16px 0;padding:12px;background:#FFF7ED;border-left:4px solid #F97316;border-radius:4px;">
               <strong style="color:#C2410C;">Nota de Decreto:</strong>
               <p style="margin:6px 0 0;color:#1f2937;">${decreeDto.decreeNote.replace(/\n/g, '<br>')}</p>
             </div>`
          : '';
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#1e3a5f;color:white;padding:20px;text-align:center;">
              <h2 style="margin:0;">MINISTERIO DE TRANSPORTES, TELECOMUNICACIONES Y<br>SISTEMAS DE INTELIGENCIA ARTIFICIAL</h2>
              <p style="margin:6px 0 0;font-size:13px;">REPÚBLICA DE GUINEA ECUATORIAL</p>
            </div>
            <div style="padding:24px;background:#f9fafb;">
              <h3 style="color:#1e3a5f;">Documento Decretado</h3>
              <p><strong>Documento:</strong> ${document.title}</p>
              <p><strong>Referencia:</strong> ${document.correlativeNumber || '-'}</p>
              ${decreeNoteHtml}
              <p style="color:#6b7280;font-size:13px;">Adjunto encontrará el documento oficial en formato PDF.</p>
            </div>
            <div style="padding:10px;text-align:center;color:#9ca3af;font-size:12px;">
              Sistema de Gestión Ministerial — Plataforma IA Ministerial
            </div>
          </div>`;
        emailResult = await this.notificationsService.sendEmailWithPdfAttachment(
          decreeDto.externalEmail,
          `Decreto Ministerial — ${document.correlativeNumber || document.title}`,
          html,
          pdfBuffer,
          filename,
        );
      } catch (err) {
        this.logger.error(`Failed to send decree PDF email: ${err.message}`);
        emailResult = { sent: false, error: err.message };
      }
    }

    // Audit log
    await this.auditService.log(document.createdById, {
      action: 'DECREE_DOCUMENT',
      resourceType: 'document',
      resourceId: id,
      changes: {
        decreeNote: decreeDto.decreeNote,
        externalEmail: decreeDto.externalEmail,
        emailSent: emailResult?.sent ?? false,
      },
    });

    return {
      message: decreeDto.externalEmail
        ? `Decreto guardado y PDF enviado a ${decreeDto.externalEmail}`
        : 'Decreto guardado correctamente',
      document: updatedDocument,
      emailResult,
    };
  }

  /**
   * Get inbox documents (direction = IN)
   */
  async getInbox(queryDto: QueryDocumentDto): Promise<PaginatedResponseDto<any>> {
    return this.findAll({ ...queryDto, direction: 'IN' as any });
  }

  /**
   * Get outbox documents (direction = OUT)
   */
  async getOutbox(queryDto: QueryDocumentDto): Promise<PaginatedResponseDto<any>> {
    return this.findAll({ ...queryDto, direction: 'OUT' as any });
  }

  /**
   * Get documents assigned to current user
   */
  async getMyDocuments(
    userId: string,
    queryDto: QueryDocumentDto,
  ): Promise<PaginatedResponseDto<any>> {
    return this.findAll({ ...queryDto, responsibleId: userId });
  }

  /**
   * Get pending documents
   */
  async getPending(queryDto: QueryDocumentDto): Promise<PaginatedResponseDto<any>> {
    return this.findAll({ ...queryDto, status: 'PENDING' as any });
  }

  /**
   * Get documents by entity
   */
  async getByEntity(
    entityId: string,
    queryDto: QueryDocumentDto,
  ): Promise<PaginatedResponseDto<any>> {
    // Validate entity exists
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
    });
    if (!entity) {
      throw new NotFoundException(`Entity with ID ${entityId} not found`);
    }

    return this.findAll({ ...queryDto, entityId });
  }

  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<DashboardStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      entriesToday,
      exitsToday,
      pending,
      inProgress,
      completed,
      openCases,
      upcomingDeadlines,
      pendingSignatures,
    ] = await Promise.all([
      // Documents entered today
      this.prisma.document.count({
        where: {
          direction: 'IN',
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      // Documents sent out today
      this.prisma.document.count({
        where: {
          direction: 'OUT',
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      // Pending documents
      this.prisma.document.count({
        where: { status: 'PENDING' },
      }),
      // In progress documents
      this.prisma.document.count({
        where: { status: 'IN_PROGRESS' },
      }),
      // Completed documents
      this.prisma.document.count({
        where: { status: 'COMPLETED' },
      }),
      // Open cases (expedientes)
      this.prisma.expediente.count({
        where: { status: 'OPEN' },
      }),
      // Upcoming deadlines (next 7 days)
      this.prisma.deadline.count({
        where: {
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          status: {
            in: ['PENDING', 'IN_PROGRESS'],
          },
        },
      }),
      // Pending signatures
      this.prisma.signatureParticipant.count({
        where: {
          status: 'PENDING',
        },
      }),
    ]);

    return {
      entriesToday,
      exitsToday,
      pending,
      inProgress,
      completed,
      openCases,
      upcomingDeadlines,
      pendingSignatures,
    };
  }

  /**
   * Get workflow statistics for the WorkflowStatisticsCard dashboard component
   */
  async getWorkflowStats() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [total, incoming, outgoing, thisWeek, thisMonth, archivedDocs] = await Promise.all([
      this.prisma.document.count(),
      this.prisma.document.count({ where: { direction: 'IN' } }),
      this.prisma.document.count({ where: { direction: 'OUT' } }),
      this.prisma.document.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.document.count({ where: { createdAt: { gte: monthAgo } } }),
      this.prisma.document.count({ where: { status: 'ARCHIVED' } }),
    ]);

    // Group by currentStage using raw SQL to avoid Prisma type issues
    const stageRows: Array<{ stage: string; count: bigint }> = await this.prisma.$queryRaw`
      SELECT "currentStage" AS stage, COUNT(*)::bigint AS count FROM documents GROUP BY "currentStage" ORDER BY count DESC
    `;

    const stageData = stageRows.map((s) => ({
      stage: s.stage,
      count: Number(s.count),
      percentage: total > 0 ? Math.round((Number(s.count) / total) * 1000) / 10 : 0,
    }));

    // Average completion time (creation → updatedAt for ARCHIVED docs)
    const archivedSample = await this.prisma.document.findMany({
      where: { status: 'ARCHIVED' },
      select: { createdAt: true, updatedAt: true },
      take: 100,
      orderBy: { updatedAt: 'desc' },
    });
    const avgDays =
      archivedSample.length > 0
        ? Math.round(
            (archivedSample.reduce(
              (sum, d) =>
                sum + (d.updatedAt.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24),
              0,
            ) /
              archivedSample.length) *
              10,
          ) / 10
        : 0;

    return {
      totalDocuments: total,
      incomingDocuments: incoming,
      outgoingDocuments: outgoing,
      byStage: stageData,
      documentsThisWeek: thisWeek,
      documentsThisMonth: thisMonth,
      averageCompletionTime: avgDays,
      archivedDocuments: archivedDocs,
    };
  }

  /**
   * Full-text search documents using PostgreSQL tsvector
   */
  async search(searchDto: SearchDocumentDto) {
    const { query, page = 1, limit = 20, direction, classification, status, entityId } = searchDto;

    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    // Build WHERE clause for filters
    const where: Prisma.DocumentWhereInput = {};

    if (direction) {
      where.direction = direction;
    }

    if (classification) {
      where.classification = classification as any;
    }

    if (status) {
      where.status = status as any;
    }

    if (entityId) {
      where.entityId = entityId;
    }

    const skip = calculateSkip(page, limit);

    // Convert query to tsquery format (handle Spanish characters and multiple words).
    // tsquery operators (& | ! : * ( ) ' \) are stripped from each term: they are
    // syntax, not text, and passing them through makes to_tsquery raise a syntax
    // error that surfaces to the user as a 500.
    const tsQuery = query
      .trim()
      .split(/\s+/)
      .map((word) => word.replace(/[&|!:*()'\\<>@]/g, '').trim())
      .filter((word) => word.length > 0)
      .map((word) => `${word}:*`)
      .join(' & ');

    if (!tsQuery) {
      throw new BadRequestException('Search query cannot be empty');
    }

    try {
      return await this.searchFullText(searchDto, tsQuery, skip);
    } catch (error) {
      // The tsvector column is created by an out-of-band migration
      // (prisma/sql/001_document_search_vector.sql) and Prisma does not manage
      // it, so it can legitimately be absent. Degrade to a portable LIKE search
      // instead of failing the request.
      this.logger.warn(
        `Full-text search unavailable, falling back to substring search: ${error?.message}`,
      );
      return this.searchFallback(searchDto, where, skip);
    }
  }

  /**
   * PostgreSQL tsvector search. Requires the `search_vector` column.
   */
  private async searchFullText(
    searchDto: SearchDocumentDto,
    tsQuery: string,
    skip: number,
  ) {
    const { page = 1, limit = 20, direction, classification, status, entityId } = searchDto;

    // Execute full-text search using raw SQL
    const documents = await this.prisma.$queryRaw<any[]>`
      SELECT
        d.id,
        d."correlativeNumber",
        d.title,
        d.type,
        d.status,
        d.direction,
        d.classification,
        d."entityId",
        d."createdById",
        d."responsibleId",
        d."expedienteId",
        d.content,
        d.priority,
        d."decretedTo",
        d."receivedAt",
        d."sentAt",
        d."createdAt",
        d."updatedAt",
        ts_rank(d.search_vector, to_tsquery('spanish', ${tsQuery})) as rank
      FROM documents d
      WHERE d.search_vector @@ to_tsquery('spanish', ${tsQuery})
        ${direction ? Prisma.sql`AND d.direction = ${direction}` : Prisma.empty}
        ${classification ? Prisma.sql`AND d.classification = ${classification}` : Prisma.empty}
        ${status ? Prisma.sql`AND d.status = ${status}` : Prisma.empty}
        ${entityId ? Prisma.sql`AND d."entityId" = ${entityId}` : Prisma.empty}
      ORDER BY rank DESC, d."createdAt" DESC
      LIMIT ${limit}
      OFFSET ${skip}
    `;

    // Get total count for pagination
    const totalResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::int as count
      FROM documents d
      WHERE d.search_vector @@ to_tsquery('spanish', ${tsQuery})
        ${direction ? Prisma.sql`AND d.direction = ${direction}` : Prisma.empty}
        ${classification ? Prisma.sql`AND d.classification = ${classification}` : Prisma.empty}
        ${status ? Prisma.sql`AND d.status = ${status}` : Prisma.empty}
        ${entityId ? Prisma.sql`AND d."entityId" = ${entityId}` : Prisma.empty}
    `;

    const total = Number(totalResult[0].count);

    // Fetch related data for each document
    const enrichedDocuments = await Promise.all(
      documents.map(async (doc) => {
        const [entity, createdBy, responsible] = await Promise.all([
          this.prisma.entity.findUnique({
            where: { id: doc.entityId },
            select: { id: true, name: true, shortName: true, type: true },
          }),
          this.prisma.user.findUnique({
            where: { id: doc.createdById },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              position: true,
            },
          }),
          this.prisma.user.findUnique({
            where: { id: doc.responsibleId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              position: true,
            },
          }),
        ]);

        return {
          ...doc,
          rank: parseFloat(doc.rank),
          entity,
          createdBy,
          responsible,
        };
      })
    );

    return createPaginatedResponse(enrichedDocuments, { total, page, limit });
  }

  /**
   * Portable substring search, used when the tsvector column is unavailable.
   * Slower than the FTS path but correct on any PostgreSQL instance.
   */
  private async searchFallback(
    searchDto: SearchDocumentDto,
    filters: Prisma.DocumentWhereInput,
    skip: number,
  ) {
    const { query, page = 1, limit = 20 } = searchDto;

    const where: Prisma.DocumentWhereInput = {
      ...filters,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { correlativeNumber: { contains: query, mode: 'insensitive' } },
      ],
    };

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          entity: {
            select: { id: true, name: true, shortName: true, type: true },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              position: true,
            },
          },
          responsible: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              position: true,
            },
          },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return createPaginatedResponse(
      documents.map((doc) => ({ ...doc, rank: 0 })),
      { total, page, limit },
    );
  }

  /**
   * Get file version history
   */
  async getFileVersions(fileId: string) {
    // Check if file exists
    const file = await this.prisma.documentFile.findUnique({
      where: { id: fileId },
      select: { id: true, version: true },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Get all versions
    const versions = await this.prisma.fileVersion.findMany({
      where: { fileId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { versionNumber: 'desc' },
    });

    return {
      currentVersion: file.version,
      totalVersions: versions.length,
      versions,
    };
  }

  /**
   * Restore a previous file version
   */
  async restoreFileVersion(fileId: string, versionNumber: number, comment?: string) {
    // Get the file
    const file = await this.prisma.documentFile.findUnique({
      where: { id: fileId },
      include: { document: true },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Get the version to restore
    const versionToRestore = await this.prisma.fileVersion.findFirst({
      where: {
        fileId,
        versionNumber,
      },
    });

    if (!versionToRestore) {
      throw new NotFoundException(`Version ${versionNumber} not found`);
    }

    // Create a new version from the current file state before restoring
    const newVersionNumber = file.version + 1;
    await this.prisma.fileVersion.create({
      data: {
        fileId: file.id,
        versionNumber: newVersionNumber,
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        hash: file.hash,
        storagePath: file.storagePath,
        storageUrl: file.storageUrl,
        comment: comment || `Restored from version ${versionNumber}`,
        uploadedById: file.document.createdById,
      },
    });

    // Update the current file with the restored version data
    await this.prisma.documentFile.update({
      where: { id: fileId },
      data: {
        fileName: versionToRestore.fileName,
        fileSize: versionToRestore.fileSize,
        mimeType: versionToRestore.mimeType,
        hash: versionToRestore.hash,
        storagePath: versionToRestore.storagePath,
        storageUrl: versionToRestore.storageUrl,
        version: newVersionNumber,
      },
    });

    return {
      success: true,
      message: `File restored to version ${versionNumber}`,
      newVersion: newVersionNumber,
    };
  }

  /**
   * Download a specific file version
   */
  async downloadFileVersion(fileId: string, versionNumber: number) {
    // Get the version
    const version = await this.prisma.fileVersion.findFirst({
      where: {
        fileId,
        versionNumber,
      },
    });

    if (!version) {
      throw new NotFoundException(`Version ${versionNumber} not found`);
    }

    // Generate signed URL for the version
    const signedUrl = await this.storageService.getSignedUrl(version.storagePath);

    return {
      id: version.id,
      fileName: version.fileName,
      url: signedUrl,
      mimeType: version.mimeType,
      size: version.fileSize,
      versionNumber: version.versionNumber,
    };
  }

  /**
   * Create document from template
   * Replaces {{variables}} with actual values and generates PDF
   */
  async createFromTemplate(
    dto: CreateDocumentFromTemplateDto,
    userId: string,
  ) {
    this.logger.log(`Creating document from template ${dto.templateId} for user ${userId}`);

    // 1. Fetch template from database
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id: dto.templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (!template.isActive) {
      throw new BadRequestException('Template is not active');
    }

    // 2. Replace all {{variable}} placeholders with actual values
    let content = template.content;
    Object.entries(dto.variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      content = content.replace(regex, value);
    });

    // Check if any variables are still unreplaced
    const unreplacedVars = content.match(/\{\{(\w+)\}\}/g);
    if (unreplacedVars) {
      this.logger.warn(`Unreplaced variables found: ${unreplacedVars.join(', ')}`);
    }

    //  3. Generate document number if not provided
    const documentDirection = dto.direction === 'OUTGOING' ? 'OUT' : 'IN';
    const documentNumber = dto.variables.numero || await this.correlativeNumberService.generateCorrelativeNumber(documentDirection as any);

    this.logger.log(`Document created from template with number: ${documentNumber}`);
    this.logger.log(`Content preview: ${content.substring(0, 200)}...`);

    // Return mock document for now (full implementation requires schema adjustments)
    // TODO: Complete database integration after schema review
    return {
      id: `doc-${Date.now()}`,
      documentNumber,
      title: dto.title || dto.variables.asunto || template.name,
      content,
      type: template.type,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Translate document content to target language using OpenAI
   */
  async translateDocument(documentId: string, targetLanguage: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Document not found');
    if (!document.content || document.content.trim().length < 10) {
      throw new BadRequestException('El documento no tiene suficiente contenido para traducir');
    }

    const langNames: Record<string, string> = {
      ES: 'Spanish', FR: 'French', EN: 'English', RU: 'Russian', ZH: 'Chinese',
    };
    const langName = langNames[targetLanguage.toUpperCase()] || targetLanguage;

    const openai = new OpenAI({ apiKey: this.configService.get<string>('OPENAI_API_KEY') });

    const plainContent = document.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    const response = await openai.chat.completions.create({
      model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a professional government document translator. Translate the following document to ${langName}. Maintain the formal tone and official language. Return ONLY the translation, no explanations.`,
        },
        { role: 'user', content: plainContent },
      ],
      max_tokens: 4000,
    });

    const translatedContent = response.choices[0]?.message?.content || '';

    // Generate summary in target language
    const summaryResponse = await openai.chat.completions.create({
      model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Generate a 2-3 sentence executive summary of this document in ${langName}. Be concise and formal.`,
        },
        { role: 'user', content: translatedContent },
      ],
      max_tokens: 500,
    });

    const translatedSummary = summaryResponse.choices[0]?.message?.content || '';

    return {
      originalLanguage: 'ES',
      targetLanguage: targetLanguage.toUpperCase(),
      translatedContent,
      translatedSummary,
      documentId,
      correlativeNumber: document.correlativeNumber,
    };
  }
}
