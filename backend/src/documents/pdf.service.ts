import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Convert HTML to plain text while preserving structure
   * Strips HTML tags but keeps formatting intent (paragraphs, lists, etc.)
   */
  private htmlToPlainText(html: string): string {
    if (!html || html.trim().length === 0) {
      return '';
    }

    let text = html;

    // Convert block-level elements to line breaks
    text = text
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/td>/gi, '\t');

    // Convert list items to bullets
    text = text.replace(/<li[^>]*>/gi, '• ');

    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");

    // Clean up excessive whitespace
    text = text
      .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive line breaks
      .replace(/ {2,}/g, ' ')       // Remove excessive spaces
      .replace(/\t+/g, '\t')        // Clean up tabs
      .trim();

    return text;
  }

  /**
   * Format OCR-extracted text for official documents
   * Handles paragraph breaks, spacing, indentation
   * Now also handles HTML content from CKEditor
   */
  private formatOCRText(ocrText: string): string[] {
    if (!ocrText || ocrText.trim().length === 0) {
      return [];
    }

    // Check if content is HTML (contains HTML tags)
    const isHTML = /<[^>]+>/g.test(ocrText);

    let cleaned: string;
    if (isHTML) {
      // Convert HTML to plain text first
      cleaned = this.htmlToPlainText(ocrText);
    } else {
      // 1. Clean and normalize plain text
      cleaned = ocrText
        .replace(/\r\n/g, '\n')           // Normalize line breaks
        .replace(/\n{3,}/g, '\n\n')       // Max 2 line breaks (paragraph separator)
        .replace(/ {2,}/g, ' ')           // Remove excessive spaces
        .replace(/\t/g, ' ')              // Replace tabs with spaces
        .trim();
    }

    // 2. Split into paragraphs (double line break = paragraph separator)
    const paragraphs = cleaned
      .split('\n\n')
      .filter(p => p.trim().length > 0)
      .map(p => p.trim());

    // 3. Handle very long paragraphs (split at logical points)
    const formattedParagraphs: string[] = [];

    paragraphs.forEach(paragraph => {
      const words = paragraph.split(' ');

      // If paragraph is very long (>500 words), split it
      if (words.length > 500) {
        let currentParagraph = '';
        let wordCount = 0;

        for (let i = 0; i < words.length; i++) {
          currentParagraph += words[i] + ' ';
          wordCount++;

          // Split at ~300-400 words, but only at sentence end
          if (wordCount >= 300 && (words[i].endsWith('.') || words[i].endsWith(';'))) {
            formattedParagraphs.push(currentParagraph.trim());
            currentParagraph = '';
            wordCount = 0;
          }
        }

        // Add remaining text
        if (currentParagraph.trim().length > 0) {
          formattedParagraphs.push(currentParagraph.trim());
        }
      } else {
        // Add paragraph with proper indentation for first line
        formattedParagraphs.push('    ' + paragraph);
      }
    });

    return formattedParagraphs;
  }

  /**
   * Render formatted text with proper pagination
   * Ensures no paragraph is split across pages
   */
  private renderFormattedText(
    doc: PDFKit.PDFDocument,
    paragraphs: string[],
    options: {
      x: number;
      maxWidth: number;
      fontSize: number;
      lineGap: number;
      pageBottomMargin: number;
    }
  ): void {
    const { x, maxWidth, fontSize, lineGap, pageBottomMargin } = options;

    doc.fontSize(fontSize).font('Times-Roman');

    paragraphs.forEach((paragraph, index) => {
      // Calculate height needed for this paragraph
      const paragraphHeight = doc.heightOfString(paragraph, {
        width: maxWidth,
        align: 'justify',
        lineGap: lineGap,
      });

      // Check if paragraph will fit on current page
      // pageBottomMargin is already the absolute Y coordinate limit
      const spaceRemaining = pageBottomMargin - doc.y;

      if (paragraphHeight > spaceRemaining && doc.y > 100) {
        // Paragraph won't fit, start new page
        doc.addPage();
        doc.y = doc.page.margins.top; // Use proper margin top
      }

      // Render paragraph
      doc.text(paragraph, x, doc.y, {
        width: maxWidth,
        align: 'justify',
        lineGap: lineGap,
      });

      // Add spacing between paragraphs
      if (index < paragraphs.length - 1) {
        doc.moveDown(0.8);
      }
    });
  }

  async generateDocumentPdf(document: any, res: Response): Promise<void> {
    try {
      // Fetch full document with relations
      const fullDocument = await this.prisma.document.findUnique({
        where: { id: document.id },
        include: {
          files: { orderBy: { createdAt: 'asc' } },
          entity: true,
          responsible: true,
          createdBy: {
            select: { firstName: true, lastName: true, position: true },
          },
        },
      });

      // Create PDF document WITHOUT bufferPages to prevent blank pages
      const doc = new PDFDocument({
        size: 'A4',
        autoFirstPage: false, // We'll add first page manually
        margins: {
          top: 70,     // 2.5cm
          bottom: 60,  // 2cm
          left: 70,    // 2.5cm
          right: 70,   // 2.5cm
        },
        info: {
          Title: document.title,
          Author: 'Gobierno de Guinea Ecuatorial',
          Subject: `Documento Oficial ${document.correlativeNumber}`,
          Keywords: 'oficial, gobierno, documento',
        },
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Documento-${document.correlativeNumber}.pdf"`,
      );

      // Pipe PDF to response
      doc.pipe(res);

      // Add first page
      doc.addPage();

      // Define page constants
      const PAGE_WIDTH = doc.page.width;
      const PAGE_HEIGHT = doc.page.height;
      const MARGIN_LEFT = doc.page.margins.left;
      const MARGIN_RIGHT = doc.page.margins.right;
      const MARGIN_TOP = doc.page.margins.top;
      const MARGIN_BOTTOM = doc.page.margins.bottom;
      const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
      const PAGE_BOTTOM_LIMIT = PAGE_HEIGHT - MARGIN_BOTTOM;

      // ==================== HEADER - OFFICIAL FORMAT ====================

      // Check if coat of arms exists
      const coatOfArmsPath = path.join(process.cwd(), 'assets', 'coat-of-arms-equatorial-guinea.png');

      try {
        // Try to add coat of arms at top center
        doc.image(coatOfArmsPath, (PAGE_WIDTH - 80) / 2, 30, {
          width: 80,
          height: 80,
        });
        doc.y = 120;
      } catch (error) {
        // If image not found, add placeholder text
        doc
          .fontSize(10)
          .font('Times-Bold')
          .text('[ESCUDO DE GUINEA ECUATORIAL]', { align: 'center' });
        doc.moveDown(0.5);
      }

      // Republic header
      doc
        .fontSize(16)
        .font('Times-Bold')
        .fillColor('#000000')
        .text('REPÚBLICA DE GUINEA ECUATORIAL', { align: 'center' });

      doc.moveDown(0.3);

      // National motto
      doc
        .fontSize(10)
        .font('Times-Roman')
        .text('UNIDAD • PAZ • JUSTICIA', { align: 'center' });

      doc.moveDown(0.8);

      // Ministry/Department name (centered, uppercase)
      doc
        .fontSize(14)
        .font('Times-Bold')
        .text(
          'MINISTERIO DE TRANSPORTE, TECNOLOGÍA,',
          { align: 'center' }
        );

      doc.text(
        'CORREOS Y TELECOMUNICACIONES',
        { align: 'center' }
      );

      doc.moveDown(0.5);

      // Horizontal line separator
      doc
        .moveTo(MARGIN_LEFT + 50, doc.y)
        .lineTo(PAGE_WIDTH - MARGIN_RIGHT - 50, doc.y)
        .stroke('#000000');

      doc.moveDown(0.8);

      // QR Code (top right corner, discrete) - if exists
      if (document.qrCode) {
        try {
          const qrSize = 80;
          const qrX = PAGE_WIDTH - MARGIN_RIGHT - qrSize - 10;
          const qrY = 30;

          doc.image(document.qrCode, qrX, qrY, {
            width: qrSize,
            height: qrSize,
          });
        } catch (error) {
          this.logger.warn(`Failed to add QR code: ${error.message}`);
        }
      }

      // ==================== DOCUMENT METADATA ====================

      const metaStartY = doc.y;

      // Left column - document numbers
      doc
        .fontSize(11)
        .font('Times-Bold')
        .text('Núm:', MARGIN_LEFT, metaStartY, { continued: true })
        .font('Times-Roman')
        .text(` ${document.correlativeNumber || '_____________'}`);

      doc.y = metaStartY + 15;
      doc
        .font('Times-Bold')
        .text('Ref:', MARGIN_LEFT, doc.y, { continued: true })
        .font('Times-Roman')
        .text(` ${document.id.substring(0, 12).toUpperCase()}`);

      doc.y = metaStartY + 30;
      doc
        .font('Times-Bold')
        .text('Secc:', MARGIN_LEFT, doc.y, { continued: true })
        .font('Times-Roman')
        .text(` ${document.entity?.shortName || document.entity?.name?.substring(0, 15) || 'N/A'}`);

      // Right column - dates
      doc.y = metaStartY;
      const rightColX = PAGE_WIDTH / 2 + 30;

      doc
        .font('Times-Bold')
        .text('Fecha:', rightColX, doc.y, { continued: true })
        .font('Times-Roman')
        .text(
          ` ${new Date(document.createdAt).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}`
        );

      doc.y = metaStartY + 15;
      doc
        .font('Times-Bold')
        .text('Estado:', rightColX, doc.y, { continued: true })
        .font('Times-Roman')
        .text(` En Proceso`);

      doc.y = metaStartY + 30;
      doc
        .font('Times-Bold')
        .text('Dirección:', rightColX, doc.y, { continued: true })
        .font('Times-Roman')
        .text(` ${document.direction === 'IN' ? 'Entrada' : 'Salida'}`);

      doc.y = metaStartY + 50;
      doc.moveDown(1.5);

      // ==================== ENTITY/RESPONSIBLE INFO ====================

      if (document.entity) {
        doc
          .fontSize(11)
          .font('Times-Bold')
          .text('DE:', MARGIN_LEFT, doc.y, { continued: true })
          .font('Times-Roman')
          .text(` ${document.entity.name}`, {
            width: CONTENT_WIDTH - 40,
          });
        doc.moveDown(0.5);
      }

      if (document.responsible) {
        doc
          .font('Times-Bold')
          .text('PARA:', MARGIN_LEFT, doc.y, { continued: true })
          .font('Times-Roman')
          .text(
            ` ${document.responsible.firstName} ${document.responsible.lastName}`,
            { width: CONTENT_WIDTH - 40 }
          );
        doc.moveDown(1);
      }

      // ==================== SUBJECT ====================

      doc
        .fontSize(12)
        .font('Times-Bold')
        .text('ASUNTO', MARGIN_LEFT, doc.y);

      // Underline
      const asuntoY = doc.y;
      doc
        .moveTo(MARGIN_LEFT, asuntoY + 2)
        .lineTo(MARGIN_LEFT + 70, asuntoY + 2)
        .stroke('#000000');

      doc.moveDown(0.8);

      // Subject content
      doc
        .fontSize(12)
        .font('Times-Roman')
        .text(document.title, MARGIN_LEFT, doc.y, {
          width: CONTENT_WIDTH,
          align: 'justify',
          lineGap: 6,
        });

      doc.moveDown(1.5);

      // ==================== CONTENT ====================

      if (document.content) {
        doc
          .fontSize(12)
          .font('Times-Bold')
          .text('CONTENIDO DEL DOCUMENTO', MARGIN_LEFT, doc.y);

        // Underline
        const contenidoY = doc.y;
        doc
          .moveTo(MARGIN_LEFT, contenidoY + 2)
          .lineTo(MARGIN_LEFT + 190, contenidoY + 2)
          .stroke('#000000');

        doc.moveDown(0.8);

        // Format and render OCR text with proper paragraph handling
        const formattedParagraphs = this.formatOCRText(document.content);

        this.renderFormattedText(doc, formattedParagraphs, {
          x: MARGIN_LEFT,
          maxWidth: CONTENT_WIDTH,
          fontSize: 12,
          lineGap: 6, // 1.5 line spacing
          pageBottomMargin: PAGE_BOTTOM_LIMIT,
        });

        doc.moveDown(1.5);
      }

      // ==================== AI SUMMARY (if exists) ====================

      if (document.aiSummary) {
        // Calculate space needed for summary (estimate: title + some content)
        const summaryHeight = 80; // Rough estimate for title + few lines
        const spaceRemaining = PAGE_BOTTOM_LIMIT - doc.y;

        // Only add new page if there's really not enough space
        if (spaceRemaining < summaryHeight) {
          doc.addPage();
          doc.y = MARGIN_TOP;
        }

        doc
          .fontSize(12)
          .font('Times-Bold')
          .text('RESUMEN GENERADO POR IA', MARGIN_LEFT, doc.y);

        doc.moveDown(0.5);

        doc
          .fontSize(11)
          .font('Times-Italic')
          .text(document.aiSummary, MARGIN_LEFT, doc.y, {
            width: CONTENT_WIDTH,
            align: 'justify',
            lineGap: 5,
          });

        doc.moveDown(1);
      }

      // ==================== KEY POINTS (if exist) ====================

      if (document.aiKeyPoints && document.aiKeyPoints.length > 0) {
        // Calculate space needed for key points section
        const keyPointsHeight = 60 + (document.aiKeyPoints.length * 30); // Rough estimate
        const spaceRemaining = PAGE_BOTTOM_LIMIT - doc.y;

        // Only add new page if there's really not enough space
        if (spaceRemaining < keyPointsHeight) {
          doc.addPage();
          doc.y = MARGIN_TOP;
        }

        doc
          .fontSize(12)
          .font('Times-Bold')
          .text('PUNTOS CLAVE', MARGIN_LEFT, doc.y);

        doc.moveDown(0.5);

        document.aiKeyPoints.forEach((point: string, index: number) => {
          doc
            .fontSize(11)
            .font('Times-Roman')
            .text(`• ${point}`, MARGIN_LEFT + 15, doc.y, {
              width: CONTENT_WIDTH - 30,
              align: 'left',
              lineGap: 4,
            });

          if (index < document.aiKeyPoints.length - 1) {
            doc.moveDown(0.3);
          }
        });

        doc.moveDown(1);
      }

      // ==================== SIGNATURE SECTION ====================

      // Calculate space needed for signature section (line + name + position)
      const signatureHeight = 80; // Line + name + position
      const spaceRemaining = PAGE_BOTTOM_LIMIT - doc.y;

      // Only add new page if signature truly won't fit
      if (spaceRemaining < signatureHeight) {
        doc.addPage();
        doc.y = MARGIN_TOP;
      }

      doc.moveDown(2);

      const sigY = doc.y;

      doc
        .fontSize(11)
        .font('Times-Roman')
        .text('________________________', MARGIN_LEFT, sigY);

      if (fullDocument?.createdBy) {
        doc
          .fontSize(11)
          .font('Times-Bold')
          .text(
            `${fullDocument.createdBy.firstName} ${fullDocument.createdBy.lastName}`,
            MARGIN_LEFT,
            sigY + 20
          );

        if (fullDocument.createdBy.position) {
          doc
            .fontSize(10)
            .font('Times-Roman')
            .text(fullDocument.createdBy.position, MARGIN_LEFT, sigY + 35);
        }
      }

      // Finalize PDF (no footers for now - focus on fixing blank pages first)
      doc.end();

      this.logger.log(
        `PDF generated successfully: ${document.correlativeNumber}`,
      );
    } catch (error) {
      this.logger.error(`PDF generation error: ${error.message}`, error.stack);
      throw error;
    }
  }
}
