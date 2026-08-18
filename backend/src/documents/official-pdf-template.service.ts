import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QrService } from './qr.service';
import { DocumentNumberingService } from './document-numbering.service';
import { StorageService } from '../storage/storage.service';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { COAT_OF_ARMS_BASE64 } from './assets/coat-of-arms.constant';

/**
 * Official PDF Template Service
 *
 * Header layout — matches MHP rem info Eco Digital.pdf exactly:
 *
 *         [Coat of Arms — centered]
 *      REPÚBLICA DE GUINEA ECUATORIAL
 *  MINISTERIO DE TRANSPORTES, TELECOMUNICACIONES Y
 *          SISTEMAS DE INTELIGENCIA ARTIFICIAL
 *                  ────◆────
 *                 EL MINISTRO        ← dynamic signerTitle
 *
 *  Núm.  003-MT-026-003
 *  Ref.  [referenceCode]
 *  Secc. [subDepartment]
 * ─────────────────────────────────────────────
 *
 * NO entry-stamp box in the header.
 * The REGISTRO DE ENTRADA box has been removed per client request.
 */
@Injectable()
export class OfficialPdfTemplateService {
  private readonly logger = new Logger(OfficialPdfTemplateService.name);

  // Pre-decoded coat of arms buffer (created once at service init)
  private readonly coatOfArmsBuffer: Buffer = Buffer.from(
    COAT_OF_ARMS_BASE64,
    'base64',
  );

  constructor(
    private prisma: PrismaService,
    private qrService: QrService,
    private numberingService: DocumentNumberingService,
    private storage: StorageService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  async generateOfficialPDF(documentId: string): Promise<Buffer> {
    try {
      // entity is included for potential future use; responsible is NOT included
      // because it is not rendered anywhere in the official PDF template.
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          entity: { select: { name: true } },
        },
      });

      if (!document) throw new Error('Document not found');

      // Ensure document has a formatted number
      let documentNumber = document.documentNumber;
      if (!documentNumber) {
        documentNumber =
          await this.numberingService.assignDocumentNumber(documentId);
      }

      const qrCode = await this.qrService.generateDocumentQR(document.id);

      // ── Build PDF body content ──────────────────────────────────────────
      // Normal documents: use content field (rich-text HTML), fall back to aiSummary.
      // Decreto documents: content textarea is hidden in the form so content is
      // usually empty. Build it from the structured decreto fields instead.
      let rawContent =
        document.content?.trim().length > 0
          ? document.content
          : document.aiSummary || '';

      if (document.isDecreto && !rawContent.trim()) {
        const months = [
          'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
          'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
        ];
        const parts: string[] = [];

        if (document.considerandos?.length > 0) {
          parts.push('<p><strong>CONSIDERANDO:</strong></p>');
          document.considerandos.forEach((c, i) =>
            parts.push(`<p>${i + 1}. ${c}</p>`),
          );
        }

        if (document.articulado?.length > 0) {
          parts.push('<p><strong>ARTÍCULO:</strong></p>');
          document.articulado.forEach((a, i) =>
            parts.push(`<p>Art. ${i + 1}.– ${a}</p>`),
          );
        }

        if (document.disposiciones?.length > 0) {
          parts.push('<p><strong>DISPOSICIONES TRANSITORIAS:</strong></p>');
          document.disposiciones.forEach((d, i) =>
            parts.push(`<p>${i + 1}. ${d}</p>`),
          );
        }

        if (document.vigencia) {
          const v = new Date(document.vigencia);
          parts.push(
            `<p>El presente decreto entrará en vigor el ` +
            `${v.getDate()} de ${months[v.getMonth()]} de ${v.getFullYear()}.</p>`,
          );
        }

        rawContent = parts.join('');
      }

      return this.createPDFDocument({
        documentNumber,
        title: document.title,
        content: rawContent,
        date: document.createdAt,
        qrCode,
        recipients: document.decretedTo || [],
        signedAt: document.signedAt,
        digitalSignatureUrl: document.digitalSignatureUrl,
        physicalSignatureUrl: document.physicalSignatureUrl,
        physicalSealFile: document.physicalSealFile,
        signerTitle: (document as any).signerTitle || 'EL MINISTRO',
        referenceCode: (document as any).referenceCode || '',
        subDepartment: (document as any).subDepartment || '',
        recipientTitle: (document as any).recipientTitle || '',
        decreeNote: (document as any).decreeNote || '',
      });
    } catch (error) {
      this.logger.error(`Failed to generate official PDF: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE: PDF CREATION
  // ─────────────────────────────────────────────────────────────────────────

  private async createPDFDocument(data: {
    documentNumber: string;
    title: string;
    content: string;
    date: Date;
    qrCode: string;
    recipients: string[];
    signedAt?: Date | null;
    digitalSignatureUrl?: string | null;
    physicalSignatureUrl?: string | null;
    physicalSealFile?: string | null;
    signerTitle?: string;
    referenceCode?: string;
    subDepartment?: string;
    recipientTitle?: string;
    decreeNote?: string;
  }): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 45, bottom: 72, left: 57, right: 50 },
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // ── 1. OFFICIAL HEADER (matches MHP reference) ─────────────────────
        this.addOfficialHeader(
          doc,
          data.documentNumber,
          data.signerTitle || 'EL MINISTRO',
          data.referenceCode,
          data.subDepartment,
        );

        // ── 2. SEPARATOR LINE ───────────────────────────────────────────────
        doc
          .moveTo(57, doc.y)
          .lineTo(doc.page.width - 50, doc.y)
          .lineWidth(0.8)
          .stroke();

        // Explicitly reset x to left margin — fixes PDFKit cursor x-drift
        // from continued:true usage in the header block above.
        doc.x = doc.page.margins.left;
        doc.moveDown(0.8);

        // ── 3. TITLE  (ASUNTO:) ─────────────────────────────────────────────
        const bodyX = doc.page.margins.left;                                       // 57
        const bodyW = doc.page.width - doc.page.margins.left - doc.page.margins.right; // 488
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(data.title, bodyX, doc.y, { width: bodyW, align: 'center' });

        doc.moveDown(1);

        // ── 4. SALUTATION ───────────────────────────────────────────────────
        doc
          .fontSize(11)
          .font('Helvetica')
          .text('Excmo. Señor:', bodyX, doc.y, { width: bodyW, align: 'center' });

        doc.moveDown(1);

        // ── 5. BODY CONTENT (HTML-aware) ────────────────────────────────────
        this.renderHtmlContent(doc, data.content);

        // ── 5b. DECREE NOTE (if present) ────────────────────────────────────
        if (data.decreeNote) {
          doc.moveDown(1);
          const noteX = doc.page.margins.left;
          const noteWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
          const noteY = doc.y;
          // Draw bordered box
          doc
            .rect(noteX, noteY, noteWidth, 14)
            .fillAndStroke('#f3f4f6', '#cccccc');
          doc
            .fillColor('#374151')
            .fontSize(8)
            .font('Helvetica-Bold')
            .text('NOTA DE DECRETO', noteX + 4, noteY + 3, { width: noteWidth - 8 });
          doc.moveDown(0.2);
          const bodyY = doc.y;
          doc
            .rect(noteX, bodyY, noteWidth, 0.5)
            .fillAndStroke('#cccccc', '#cccccc');
          doc
            .fillColor('#000000')
            .fontSize(10)
            .font('Helvetica')
            .text(data.decreeNote, noteX + 4, bodyY + 6, {
              width: noteWidth - 8,
              align: 'left',
            });
          const afterNoteY = doc.y + 4;
          doc
            .rect(noteX, bodyY, noteWidth, afterNoteY - bodyY + 4)
            .stroke('#cccccc');
          doc.y = afterNoteY + 6;
          doc.fillColor('#000000');
        }

        // ── 6. QR CODE ──────────────────────────────────────────────────────
        if (data.qrCode) {
          try {
            const qrBuffer = Buffer.from(
              data.qrCode.replace(/^data:image\/\w+;base64,/, ''),
              'base64',
            );
            doc.image(qrBuffer, doc.page.width - 115, doc.y, {
              width: 65,
              height: 65,
            });
          } catch (e) {
            this.logger.warn(`QR embed failed: ${e.message}`);
          }
        }

        doc.moveDown(3);

        // ── 7. SIGNATURE SECTION ────────────────────────────────────────────
        if (doc.page.height - doc.page.margins.bottom - doc.y < 220) {
          doc.addPage();
        }

        await this.addSignatureSection(
          doc,
          data.date,
          data.signerTitle || 'EL MINISTRO',
          {
            signedAt: data.signedAt,
            digitalSignatureUrl: data.digitalSignatureUrl,
            physicalSignatureUrl: data.physicalSignatureUrl,
            physicalSealFile: data.physicalSealFile,
          },
        );

        // ── 8. FOOTER ───────────────────────────────────────────────────────
        if (doc.page.height - doc.page.margins.bottom - doc.y < 90) {
          doc.addPage();
        }

        this.addFooter(doc, data.recipients, data.recipientTitle || '');

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE: HEADER — matches MHP rem info Eco Digital.pdf exactly
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Official header — matches MHP rem info Eco Digital.pdf reference exactly.
   *
   * Layout: coat of arms + text block CENTERED at x=167 (left-column center).
   * This matches the reference: coat of arms extracted at center_x=167 pts.
   * Núm./Ref./Secc. are LEFT-ALIGNED at x=57 (page left margin).
   *
   *  x=57        x=167        x=277   x=545
   *  |            ↑            |       |
   *  |       [Coat of Arms]    |       |
   *  |  REPÚBLICA DE GUINEA... |       |
   *  |  MINISTERIO DE TRANS... |       |
   *  |        ────◆────        |       |
   *  |       EL MINISTRO       |       |
   *  |                         |       |
   *  Núm. 003-MT-...  ← left-aligned at x=57
   *  Ref.  ...
   *  Secc. ...
   *  ─────────────────────────────────── (full-width separator)
   */
  private addOfficialHeader(
    doc: any,
    documentNumber: string,
    signerTitle: string,
    referenceCode?: string,
    subDepartment?: string,
  ) {
    // ── Block geometry ────────────────────────────────────────────────────
    // The centered block (coat of arms → EL MINISTRO) is shifted left so that
    // the left edge of "REPÚBLICA DE GUINEA ECUATORIAL" lands at x=57 (page margin).
    //
    // REPÚBLICA text width ≈ 168 pts at 10pt Bold-Helvetica.
    // For left edge at 57: blockCenter = 57 + 168/2 = 141
    // blockLeft = blockCenter - blockWidth/2 = 141 - 110 = 31
    //
    // PDFKit allows explicit x positions inside the margin area.
    const blockLeft   = 31;   // start of centered block (inside margin — intentional)
    const blockWidth  = 220;  // width of the centered block
    const blockCenter = blockLeft + blockWidth / 2;  // 31+110 = 141 pts

    // Núm./Ref./Secc. stay left-aligned at the page margin.
    const fieldLeft = 57;

    let y = doc.y; // starts at top margin (~45 pts)

    // ── Coat of Arms (centered at blockCenter) ────────────────────────────
    const emblemW = 44;
    const emblemH = 52;
    const emblemX = blockCenter - emblemW / 2;  // 141 - 22 = 119 pts

    try {
      doc.image(this.coatOfArmsBuffer, emblemX, y, {
        width: emblemW,
        height: emblemH,
        fit: [emblemW, emblemH],
      });
    } catch (e) {
      this.logger.warn(`Coat of arms embed failed: ${e.message}`);
    }

    y += emblemH + 4;

    // ── REPÚBLICA DE GUINEA ECUATORIAL (centered in block) ───────────────
    // Left edge ≈ blockCenter - 84 = 57 (page left margin). ✓
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('REPÚBLICA DE GUINEA ECUATORIAL', blockLeft, y, {
        width: blockWidth,
        align: 'center',
        lineGap: 0,
      });

    y = doc.y + 2;

    // ── Ministry name (centered in block) ────────────────────────────────
    doc
      .fontSize(8)
      .font('Helvetica')
      .text(
        'MINISTERIO DE TRANSPORTES, TELECOMUNICACIONES Y\nSISTEMAS DE INTELIGENCIA ARTIFICIAL',
        blockLeft, y,
        { width: blockWidth, align: 'center', lineGap: 1 },
      );

    y = doc.y + 5;

    // ── Ornamental divider (centered at blockCenter = 141) ───────────────
    this.drawOrnamentalLine(doc, blockCenter, y);

    y = doc.y + 4;

    // ── Signer title (centered in block) ─────────────────────────────────
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(signerTitle.toUpperCase(), blockLeft, y, {
        width: blockWidth,
        align: 'center',
      });

    y = doc.y + 7;

    // ── Núm. / Ref. / Secc. — LEFT-ALIGNED at page margin (x=57) ─────────
    const fs   = 9;
    const dots = '...........';

    doc.fontSize(fs).font('Helvetica-BoldOblique').text('Núm.  ', fieldLeft, y, { continued: true, width: blockWidth });
    doc.font('Helvetica-Oblique').text(documentNumber || dots);
    y = doc.y + 2;

    doc.fontSize(fs).font('Helvetica-BoldOblique').text('Ref.    ', fieldLeft, y, { continued: true, width: blockWidth });
    doc.font('Helvetica-Oblique').text(referenceCode?.trim() || dots);
    y = doc.y + 2;

    doc.fontSize(fs).font('Helvetica-BoldOblique').text('Secc.  ', fieldLeft, y, { continued: true, width: blockWidth });
    doc.font('Helvetica-Oblique').text(subDepartment?.trim() || dots);
    y = doc.y + 2;

    // Advance doc.y; reset x to page left margin (fixes PDFKit cursor drift).
    doc.y = y + 8;
    doc.x = fieldLeft;
  }

  /**
   * Draw the ornamental divider: ────◆────
   * Centered around the given centerX coordinate (column center, not page center).
   */
  private drawOrnamentalLine(doc: any, centerX: number, y: number) {
    const lineLen       = 45;  // length of each line segment
    const gapFromCenter = 5;   // gap between line end and diamond edge
    const diamondHalf   = 3.5; // half-size of diamond
    const lineY         = y + 6;

    // Left line segment
    doc
      .moveTo(centerX - lineLen, lineY)
      .lineTo(centerX - gapFromCenter, lineY)
      .lineWidth(0.7)
      .stroke();

    // Filled diamond (rotated square)
    doc
      .moveTo(centerX,               lineY - diamondHalf)
      .lineTo(centerX + diamondHalf, lineY)
      .lineTo(centerX,               lineY + diamondHalf)
      .lineTo(centerX - diamondHalf, lineY)
      .closePath()
      .fillAndStroke('#000000', '#000000');

    // Right line segment
    doc
      .moveTo(centerX + gapFromCenter, lineY)
      .lineTo(centerX + lineLen,       lineY)
      .lineWidth(0.7)
      .stroke();

    doc.y = lineY + diamondHalf + 2;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE: SIGNATURE SECTION
  // ─────────────────────────────────────────────────────────────────────────

  private async addSignatureSection(
    doc: any,
    documentDate: Date,
    signerTitle: string,
    signatureData: {
      signedAt?: Date | null;
      digitalSignatureUrl?: string | null;
      physicalSignatureUrl?: string | null;
      physicalSealFile?: string | null;
    },
  ) {
    doc.moveDown(2);

    // Spanish date
    const effectiveDate = signatureData.signedAt || documentDate;
    doc
      .fontSize(11)
      .font('Helvetica')
      .text(this.formatSpanishDate(effectiveDate), { align: 'center' });

    doc.moveDown(0.5);

    // Motto
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('POR UNA GUINEA MEJOR,', { align: 'center' });

    doc.moveDown(2);

    const cx = doc.page.width / 2;
    const currentY = doc.y;

    // ── Seal (left of center) ────────────────────────────────────────────
    let sealBuffer: Buffer | null = null;
    if (signatureData.physicalSealFile) {
      try {
        const key = this.extractStorageKey(signatureData.physicalSealFile);
        const raw = await this.storage.getFile(key);
        sealBuffer = await this.toEmbeddableBuffer(raw);
      } catch (e) {
        this.logger.warn(`Seal load failed: ${e.message}`);
      }
    }

    if (sealBuffer) {
      doc.image(sealBuffer, cx - 110, currentY, {
        width: 80,
        height: 60,
        fit: [80, 60],
      });
    } else {
      doc
        .fontSize(8.5)
        .font('Helvetica-Oblique')
        .fillColor('#aaaaaa')
        .text('[Sello Oficial]', cx - 110, currentY + 20, {
          width: 80,
          align: 'center',
        });
    }

    // ── Signature (right of center) ─────────────────────────────────────
    let sigBuffer: Buffer | null = null;
    const sigUrl =
      signatureData.digitalSignatureUrl || signatureData.physicalSignatureUrl;
    if (sigUrl) {
      try {
        const key = this.extractStorageKey(sigUrl);
        const raw = await this.storage.getFile(key);
        sigBuffer = await this.toEmbeddableBuffer(raw);
      } catch (e) {
        this.logger.warn(`Signature load failed: ${e.message}`);
      }
    }

    if (sigBuffer) {
      doc.image(sigBuffer, cx + 30, currentY, {
        width: 80,
        height: 60,
        fit: [80, 60],
      });
    } else {
      doc
        .fontSize(8.5)
        .font('Helvetica-Oblique')
        .fillColor('#aaaaaa')
        .text('[Firma]', cx + 30, currentY + 20, {
          width: 80,
          align: 'center',
        });
    }

    doc.y = currentY + 68;
    doc.fillColor('#000000');

    doc.moveDown(0.5);

    // Signer name / title (e.g. "- Honorato EVITA OMA-")
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`- ${signerTitle} -`, { align: 'center' });

    doc.moveDown(1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE: FOOTER
  // ─────────────────────────────────────────────────────────────────────────

  private addFooter(
    doc: any,
    recipients: string[],
    recipientTitle: string,
  ) {
    doc.moveDown(1);

    doc
      .moveTo(57, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .lineWidth(0.8)
      .stroke();

    doc.moveDown(0.5);

    // Primary recipient title
    if (recipientTitle?.trim()) {
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(recipientTitle, 57, doc.y, {
          width: doc.page.width - 107,
          align: 'left',
          lineGap: 2,
        });
      doc.moveDown(0.4);
    }

    // Decreed recipients
    recipients.forEach((r) => {
      doc
        .fontSize(9.5)
        .font('Helvetica')
        .text(`Excmo. Sr. ${r}.- Ciudad`, 57, doc.y, { align: 'left' });
      doc.moveDown(0.3);
    });

    // Fallback placeholder
    if (!recipientTitle?.trim() && recipients.length === 0) {
      doc
        .fontSize(10)
        .font('Helvetica')
        .text('Excmo. Sr. __________________.- Ciudad', 57, doc.y);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE: HTML CONTENT RENDERER
  // ─────────────────────────────────────────────────────────────────────────

  private renderHtmlContent(doc: any, html: string) {
    if (!html?.trim()) return;

    const decode = (s: string) =>
      s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (_, c) =>
          String.fromCharCode(parseInt(c, 10)),
        );

    const toPlain = (fragment: string) =>
      decode(
        fragment.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''),
      );

    const blockRe =
      /<(h[1-3]|p|ul|ol|li|br)[^>]*>([\s\S]*?)<\/\1>|<br\s*\/?>/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    const flushText = (raw: string) => {
      const plain = toPlain(raw).trim();
      if (!plain) return;
      doc
        .fontSize(11)
        .font('Helvetica')
        .text(plain, { align: 'justify', lineGap: 4 });
      doc.moveDown(0.6);
    };

    while ((match = blockRe.exec(html)) !== null) {
      if (match.index > lastIndex) flushText(html.slice(lastIndex, match.index));

      const tag = match[1]?.toLowerCase();
      const inner = match[2] || '';

      if (tag === 'h1') {
        const t = toPlain(inner).trim();
        if (t) {
          doc.moveDown(0.5);
          doc.fontSize(14).font('Helvetica-Bold').text(t, { align: 'left' });
          doc.moveDown(0.5);
        }
      } else if (tag === 'h2') {
        const t = toPlain(inner).trim();
        if (t) {
          doc.moveDown(0.4);
          doc.fontSize(13).font('Helvetica-Bold').text(t, { align: 'left' });
          doc.moveDown(0.4);
        }
      } else if (tag === 'h3') {
        const t = toPlain(inner).trim();
        if (t) {
          doc.moveDown(0.3);
          doc.fontSize(12).font('Helvetica-Bold').text(t, { align: 'left' });
          doc.moveDown(0.3);
        }
      } else if (tag === 'p') {
        const t = toPlain(inner).trim();
        if (t) {
          doc
            .fontSize(11)
            .font('Helvetica')
            .text(t, { align: 'justify', lineGap: 4 });
          doc.moveDown(0.8);
        }
      } else if (tag === 'ul' || tag === 'ol') {
        const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        let liM: RegExpExecArray | null;
        let idx = 1;
        doc.moveDown(0.3);
        while ((liM = liRe.exec(inner)) !== null) {
          const itemText = toPlain(liM[1]).trim();
          if (itemText) {
            const bullet = tag === 'ol' ? `${idx++}.  ` : '\u2022  ';
            doc.fontSize(11).font('Helvetica').text(`${bullet}${itemText}`, {
              indent: 20,
              align: 'left',
              lineGap: 3,
            });
            doc.moveDown(0.3);
          }
        }
        doc.moveDown(0.5);
      } else if (!tag) {
        doc.moveDown(0.4);
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < html.length) flushText(html.slice(lastIndex));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE: HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /** "Malabo, a 2 de febrero de 2026" */
  private formatSpanishDate(date: Date): string {
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];
    return `Malabo, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  }

  /** Convert any image buffer to PNG that PDFKit can embed */
  private async toEmbeddableBuffer(raw: Buffer): Promise<Buffer> {
    try {
      const isPng = raw[0] === 0x89 && raw[1] === 0x50;
      const isJpeg = raw[0] === 0xff && raw[1] === 0xd8;
      if (isPng || isJpeg) return raw;
      return await sharp(raw).png().toBuffer();
    } catch (err) {
      this.logger.warn(`Image conversion failed: ${err.message}`);
      return raw;
    }
  }

  /** Extract storage key from URL or return as-is */
  private extractStorageKey(urlOrKey: string): string {
    if (!urlOrKey) return urlOrKey;
    if (!urlOrKey.startsWith('http://') && !urlOrKey.startsWith('https://'))
      return urlOrKey;
    const m = urlOrKey.match(/\/api\/files\/serve\/(.+)$/);
    if (m?.[1]) return m[1];
    this.logger.warn(`Could not extract storage key from: ${urlOrKey}`);
    return urlOrKey;
  }
}
