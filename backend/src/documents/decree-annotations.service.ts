import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as PDFDocument from 'pdfkit';

/**
 * Decree Annotations Service
 *
 * Manages left-margin annotations (notas marginales) for decree documents
 * Client requirement: Officials add handwritten-style notes during workflow stages
 *
 * Features:
 * - Add annotations to decree documents
 * - Position annotations in left margin
 * - Support multiple annotations per document
 * - Track annotation author and timestamp
 * - Render annotations on PDF output
 */
@Injectable()
export class DecreeAnnotationsService {
  private readonly logger = new Logger(DecreeAnnotationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Add a decree annotation to a document
   * Annotations appear in left margin of printed PDFs
   */
  async addAnnotation(
    documentId: string,
    userId: string,
    annotation: {
      text: string;
      pageNumber?: number;
      yPosition?: number;
    },
  ): Promise<any> {
    // Verify document exists
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // Get user info for attribution
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    // Create annotation record
    const newAnnotation = await this.prisma.decreeAnnotation.create({
      data: {
        documentId,
        userId,
        text: annotation.text,
        pageNumber: annotation.pageNumber || 1,
        yPosition: annotation.yPosition || 100,
        authorName: `${user.firstName} ${user.lastName}`,
        authorRole: user.role,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    this.logger.log(
      `Annotation added to document ${document.correlativeNumber} by ${user.firstName} ${user.lastName}`,
    );

    return newAnnotation;
  }

  /**
   * Get all annotations for a document
   * Ordered by page number and Y position
   */
  async getDocumentAnnotations(documentId: string): Promise<any[]> {
    const annotations = await this.prisma.decreeAnnotation.findMany({
      where: { documentId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: [{ pageNumber: 'asc' }, { yPosition: 'asc' }],
    });

    return annotations;
  }

  /**
   * Update an annotation
   */
  async updateAnnotation(
    annotationId: string,
    userId: string,
    updates: {
      text?: string;
      pageNumber?: number;
      yPosition?: number;
    },
  ): Promise<any> {
    // Verify annotation exists and user owns it
    const annotation = await this.prisma.decreeAnnotation.findUnique({
      where: { id: annotationId },
    });

    if (!annotation) {
      throw new NotFoundException(`Annotation ${annotationId} not found`);
    }

    // Only annotation author or admin can update
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (annotation.userId !== userId && user.role !== 'ADMIN') {
      throw new Error('Only the annotation author or admin can update it');
    }

    // Update annotation
    const updated = await this.prisma.decreeAnnotation.update({
      where: { id: annotationId },
      data: {
        text: updates.text,
        pageNumber: updates.pageNumber,
        yPosition: updates.yPosition,
        editedAt: new Date(),
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    this.logger.log(`Annotation ${annotationId} updated by user ${userId}`);

    return updated;
  }

  /**
   * Delete an annotation
   * Only author or admin can delete
   */
  async deleteAnnotation(annotationId: string, userId: string): Promise<void> {
    const annotation = await this.prisma.decreeAnnotation.findUnique({
      where: { id: annotationId },
    });

    if (!annotation) {
      throw new NotFoundException(`Annotation ${annotationId} not found`);
    }

    // Only annotation author or admin can delete
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (annotation.userId !== userId && user.role !== 'ADMIN') {
      throw new Error('Only the annotation author or admin can delete it');
    }

    await this.prisma.decreeAnnotation.delete({
      where: { id: annotationId },
    });

    this.logger.log(`Annotation ${annotationId} deleted by user ${userId}`);
  }

  /**
   * Add annotations to a PDF document
   * Renders annotations in left margin
   */
  addAnnotationsToPDF(
    doc: PDFKit.PDFDocument,
    annotations: any[],
    pageNumber: number = 1,
  ): void {
    // Filter annotations for this page
    const pageAnnotations = annotations.filter(
      (ann) => ann.pageNumber === pageNumber,
    );

    if (pageAnnotations.length === 0) {
      return;
    }

    // Left margin width: 72 points (1 inch)
    const marginLeft = 30;
    const annotationWidth = 60;

    for (const annotation of pageAnnotations) {
      try {
        // Save current state
        doc.save();

        // Draw annotation box (subtle background)
        doc
          .rect(marginLeft, annotation.yPosition, annotationWidth, 40)
          .fillOpacity(0.1)
          .fill('#f59e0b');

        // Draw annotation text
        doc
          .fillOpacity(1)
          .fillColor('#92400e')
          .fontSize(8)
          .font('Helvetica')
          .text(annotation.text, marginLeft + 2, annotation.yPosition + 2, {
            width: annotationWidth - 4,
            align: 'left',
          });

        // Draw author initials (small)
        const initials = this.getInitials(annotation.authorName);
        doc
          .fontSize(6)
          .fillColor('#78716c')
          .text(
            initials,
            marginLeft + 2,
            annotation.yPosition + 32,
            {
              width: annotationWidth - 4,
              align: 'right',
            },
          );

        // Restore state
        doc.restore();
      } catch (error) {
        this.logger.error(
          `Failed to render annotation ${annotation.id}: ${error.message}`,
        );
        // Continue rendering other annotations
      }
    }
  }

  /**
   * Get initials from full name
   */
  private getInitials(fullName: string): string {
    const parts = fullName.split(' ').filter((p) => p.length > 0);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  /**
   * Get annotation statistics for a document
   */
  async getAnnotationStats(documentId: string): Promise<{
    total: number;
    byAuthor: { authorName: string; count: number }[];
    byPage: { pageNumber: number; count: number }[];
  }> {
    const annotations = await this.prisma.decreeAnnotation.findMany({
      where: { documentId },
      select: {
        authorName: true,
        pageNumber: true,
      },
    });

    // Group by author
    const byAuthor = Object.entries(
      annotations.reduce((acc, ann) => {
        acc[ann.authorName] = (acc[ann.authorName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    ).map(([authorName, count]) => ({ authorName, count }));

    // Group by page
    const byPage = Object.entries(
      annotations.reduce((acc, ann) => {
        acc[ann.pageNumber] = (acc[ann.pageNumber] || 0) + 1;
        return acc;
      }, {} as Record<number, number>),
    ).map(([pageNumber, count]) => ({
      pageNumber: parseInt(pageNumber),
      count,
    }));

    return {
      total: annotations.length,
      byAuthor,
      byPage,
    };
  }
}
