import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentNumberingService } from './document-numbering.service';
import { QrService } from './qr.service';
import { StorageService } from '../storage/storage.service';
import { COAT_OF_ARMS_BASE64 } from './assets/coat-of-arms.constant';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const execFileAsync = promisify(execFile);

/**
 * Official Word Template Service
 *
 * Generates a DOCX that matches the official Equatorial Guinea government
 * document format (same as the PDF template):
 *
 *   [Coat of Arms — centered]
 *   REPÚBLICA DE GUINEA ECUATORIAL
 *   MINISTERIO DE TRANSPORTES, TELECOMUNICACIONES Y
 *   SISTEMAS DE INTELIGENCIA ARTIFICIAL
 *   ────◆────
 *   EL MINISTRO / LA MINISTRA
 *
 *   Núm. / Ref. / Secc. table
 *   ─────────────────────────────
 *   [recipient]        [date]
 *   DOCUMENT TITLE
 *   body content...
 *   signature block
 *
 * Calls LibreOffice directly via execFile (bypasses libreoffice-convert
 * package which has a quoting bug with filter names containing spaces).
 */
@Injectable()
export class OfficialWordTemplateService {
  private readonly logger = new Logger(OfficialWordTemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly numberingService: DocumentNumberingService,
    private readonly qrService: QrService,
    private readonly storage: StorageService,
  ) {}

  async generateOfficialWord(documentId: string): Promise<Buffer> {
    this.logger.log(`Generating official DOCX for document: ${documentId}`);

    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { entity: { select: { name: true } } },
    });

    if (!document) throw new Error('Document not found');

    let documentNumber = document.documentNumber;
    if (!documentNumber) {
      documentNumber = await this.numberingService.assignDocumentNumber(documentId);
    }

    const qrDataUrl = await this.qrService.generateDocumentQR(documentId).catch(() => null);
    const decreeNote: string = (document as any).decreeNote || '';

    // Load signature and seal images as base64 data URLs (same logic as PDF service)
    const sigUrl = document.digitalSignatureUrl || document.physicalSignatureUrl;
    const signatureDataUrl = sigUrl
      ? await this.imageToDataUrl(sigUrl).catch(() => null)
      : null;
    const sealDataUrl = document.physicalSealFile
      ? await this.imageToDataUrl(document.physicalSealFile).catch(() => null)
      : null;

    const html = this.buildHtmlDocument(document, documentNumber, qrDataUrl, signatureDataUrl, sealDataUrl, decreeNote);

    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mcc-word-'));
    const inputFile = path.join(tmpDir, 'document.html');
    const outputFile = path.join(tmpDir, 'document.docx');

    try {
      await fs.promises.writeFile(inputFile, html, 'utf-8');

      await execFileAsync('libreoffice', [
        '--headless',
        '--convert-to', 'docx:MS Word 2007 XML',
        '--outdir', tmpDir,
        inputFile,
      ], { timeout: 60000 });

      const docxBuffer = await fs.promises.readFile(outputFile);
      this.logger.log(`DOCX generated successfully for document: ${documentId}`);
      return docxBuffer;
    } catch (error) {
      this.logger.error(`LibreOffice conversion failed: ${error.message}`, error.stack);
      throw new Error(`No se pudo convertir el documento a Word: ${error.message}`);
    } finally {
      await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /** Load an image from storage and return as a base64 data URL for HTML embedding */
  private async imageToDataUrl(urlOrKey: string): Promise<string> {
    const key = this.extractStorageKey(urlOrKey);
    const raw = await this.storage.getFile(key);
    const isJpeg = raw[0] === 0xff && raw[1] === 0xd8;
    const mime = isJpeg ? 'image/jpeg' : 'image/png';
    return `data:${mime};base64,${raw.toString('base64')}`;
  }

  /** Extract storage key from a full URL (mirrors PDF service logic) */
  private extractStorageKey(urlOrKey: string): string {
    if (!urlOrKey) return urlOrKey;
    if (!urlOrKey.startsWith('http://') && !urlOrKey.startsWith('https://'))
      return urlOrKey;
    const m = urlOrKey.match(/\/api\/files\/serve\/(.+)$/);
    if (m?.[1]) return m[1];
    return urlOrKey;
  }

  private stripHtml(html: string): string {
    if (!html) return '';
    return html
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private buildHtmlDocument(
    document: any,
    documentNumber: string,
    qrDataUrl: string | null,
    signatureDataUrl: string | null,
    sealDataUrl: string | null,
    decreeNote: string = '',
  ): string {
    const signerTitle = document.signerTitle || 'EL MINISTRO';
    const referenceCode = document.referenceCode || '';
    const subDepartment = document.subDepartment || '';
    const recipientTitle = document.recipientTitle || '';

    const rawContent =
      document.content?.trim().length > 0
        ? document.content
        : document.aiSummary || '';

    const bodyHtml = rawContent
      ? rawContent
      : '<p><em>(Sin contenido)</em></p>';

    const now = new Date(document.createdAt);
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];
    const dateStr = `Malabo, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
    const coatOfArmsDataUrl = `data:image/png;base64,${COAT_OF_ARMS_BASE64}`;

    // Metadata rows — always show all 3 lines, dots as placeholder when empty
    // No italic, no underline — explicit span styling prevents LibreOffice auto-link
    const dots = '&#8230;&#8230;&#8230;&#8230;&#8230;&#8230;';
    const metaStyle = 'font-size:9pt;margin:2pt 0;line-height:1.3;color:#000000;';
    const labelStyle = 'font-family:Arial,Helvetica,sans-serif;font-size:9pt;font-weight:bold;font-style:normal;color:#000000;text-decoration:none;';
    const valueStyle = 'font-family:Arial,Helvetica,sans-serif;font-size:9pt;font-weight:normal;font-style:normal;color:#000000;text-decoration:none;';
    const metaRows = [
      `<p style="${metaStyle}"><span style="${labelStyle}">N&uacute;m.&nbsp;&nbsp;</span><span style="${valueStyle}">${documentNumber || dots}</span></p>`,
      `<p style="${metaStyle}"><span style="${labelStyle}">Ref.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span style="${valueStyle}">${referenceCode || dots}</span></p>`,
      `<p style="${metaStyle}"><span style="${labelStyle}">Secc.&nbsp;&nbsp;</span><span style="${valueStyle}">${subDepartment || dots}</span></p>`,
    ].join('\n');

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 1.6cm 1.76cm 2.5cm 2cm; }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      color: #000000;
      line-height: 1.4;
      margin: 0; padding: 0;
    }
    p { margin: 0; padding: 0; color: #000000; }
    /* Kill ALL table borders — LibreOffice must not add any */
    table { border-width: 0 !important; border-style: none !important; border-collapse: collapse !important; }
    td, th { border-width: 0 !important; border-style: none !important; padding: 0 !important; }
  </style>
</head>
<body>

<!-- ══════════════════════════════════════════
     OFFICIAL HEADER  (PDF: blockLeft=31, blockWidth=220)
     1-cell table = LibreOffice respects width:220pt
     Left-aligned block, content centered inside it
     <span> on every text = forces character-level black
     ══════════════════════════════════════════ -->
<table border="1" frame="void" rules="none" cellpadding="0" cellspacing="0"
       bordercolor="#FFFFFF" bordercolorlight="#FFFFFF" bordercolordark="#FFFFFF"
       style="width:220pt; border:1px solid #FFFFFF; border-collapse:collapse; margin-bottom:6pt;">
  <tr>
    <td style="border:1px solid #FFFFFF; padding:0; text-align:center; width:220pt; vertical-align:top;">

      <img src="${coatOfArmsDataUrl}" alt=""
           width="44" height="52"
           style="display:block; margin:0 auto 3pt auto; width:44pt; height:52pt;" />

      <p style="font-size:10pt; font-weight:bold; margin:2pt 0 1pt 0; line-height:1.2; text-align:center;">
        <span style="font-family:Arial,Helvetica,sans-serif; font-size:10pt; font-weight:bold; color:#000000; text-decoration:none; font-style:normal;">REP&#218;BLICA DE GUINEA ECUATORIAL</span>
      </p>

      <p style="font-size:8pt; margin:0 0 3pt 0; line-height:1.4; text-align:center;">
        <span style="font-family:Arial,Helvetica,sans-serif; font-size:8pt; font-weight:normal; color:#000000; text-decoration:none; font-style:normal;">MINISTERIO DE TRANSPORTES, TELECOMUNICACIONES Y<br/>SISTEMAS DE INTELIGENCIA ARTIFICIAL</span>
      </p>

      <p style="font-size:9pt; margin:3pt 0; text-align:center;">
        <span style="font-family:Arial,Helvetica,sans-serif; font-size:9pt; font-weight:normal; color:#000000; text-decoration:none; font-style:normal;">----&#9830;----</span>
      </p>

      <p style="font-size:10pt; font-weight:bold; margin:2pt 0 0 0; text-align:center;">
        <span style="font-family:Arial,Helvetica,sans-serif; font-size:10pt; font-weight:bold; color:#000000; text-decoration:none; font-style:normal;">${signerTitle.toUpperCase()}</span>
      </p>

    </td>
  </tr>
</table>

<!-- ══════════════════════════════════════════
     METADATA  Núm. / Ref. / Secc.
     Direct <p> tags — NO wrapper div (div causes LibreOffice bordered frame)
     ══════════════════════════════════════════ -->
${metaRows}

<!-- ══════════════════════════════════════════
     SEPARATOR LINE  (PDF: full-width 0.8pt)
     ══════════════════════════════════════════ -->
<hr style="border:none; border-top:0.8pt solid #000000; margin:4pt 0 8pt 0;" />

<!-- ══════════════════════════════════════════
     RECIPIENT + DATE  — plain paragraphs, no table
     ══════════════════════════════════════════ -->
<p style="font-size:11pt; font-weight:bold; color:#000000; margin:0 0 2pt 0;">
  ${recipientTitle || ''}
</p>
<p style="font-size:11pt; color:#000000; text-align:right; margin:0 0 10pt 0;">
  ${dateStr}
</p>

<!-- ══════════════════════════════════════════
     DOCUMENT TITLE  (centered, bold, uppercase)
     ══════════════════════════════════════════ -->
<p style="text-align:center; font-weight:bold; font-size:11pt; color:#000000;
           margin:0 0 14pt 0;">
  ${(document.title || '').toUpperCase()}
</p>

<!-- ══════════════════════════════════════════
     SALUTATION
     ══════════════════════════════════════════ -->
<p style="text-align:center; font-size:11pt; color:#000000; margin:0 0 10pt 0;">
  Excmo. Se&#241;or:
</p>

<!-- ══════════════════════════════════════════
     BODY CONTENT
     ══════════════════════════════════════════ -->
<div style="font-size:11pt; line-height:1.5; text-align:justify; color:#000000;">
  ${bodyHtml}
</div>

<!-- ══════════════════════════════════════════
     DECREE NOTE  (Minister's written order — only shown when set)
     ══════════════════════════════════════════ -->
${decreeNote ? `
<table border="1" frame="box" rules="none" cellpadding="6" cellspacing="0"
       bordercolor="#CCCCCC"
       style="width:100%; border:1pt solid #CCCCCC; border-collapse:collapse; margin:10pt 0 4pt 0; background-color:#F9FAFB;">
  <tr>
    <td style="border:1pt solid #CCCCCC; padding:6pt; vertical-align:top;">
      <p style="font-size:8pt; font-weight:bold; color:#374151; margin:0 0 4pt 0; font-family:Arial,Helvetica,sans-serif;">
        <span style="font-family:Arial,Helvetica,sans-serif; font-size:8pt; font-weight:bold; color:#374151; text-decoration:none; font-style:normal;">NOTA DE DECRETO</span>
      </p>
      <p style="font-size:10pt; color:#000000; margin:0; font-family:Arial,Helvetica,sans-serif; white-space:pre-wrap;">
        <span style="font-family:Arial,Helvetica,sans-serif; font-size:10pt; color:#000000; text-decoration:none; font-style:normal;">${decreeNote.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
      </p>
    </td>
  </tr>
</table>` : ''}

<!-- ══════════════════════════════════════════
     QR CODE  (PDF: placed after body, right side)
     doc.image(qr, page.width-115, doc.y, {width:65, height:65})
     ══════════════════════════════════════════ -->
${qrDataUrl ? `
<div style="text-align:right; margin-top:8pt; margin-bottom:0;">
  <img src="${qrDataUrl}" alt="QR"
       width="65" height="65"
       style="width:65pt; height:65pt;" />
</div>` : '<div style="margin-top:8pt;"></div>'}

<!-- ══════════════════════════════════════════
     SIGNATURE SECTION  (PDF: addSignatureSection)
     Seal (left) + Signature image (right) — same layout as PDF
     ══════════════════════════════════════════ -->
<div style="margin-top:24pt; page-break-inside:avoid;">
  <p style="font-size:11pt; text-align:center; color:#000000; margin:0 0 4pt 0;">
    ${dateStr}
  </p>
  <p style="font-size:11pt; font-weight:bold; text-align:center; color:#000000; margin:0 0 12pt 0;">
    POR UNA GUINEA MEJOR,
  </p>

  <!-- Seal + Signature images side-by-side using table (PDF: cx-110 and cx+30) -->
  <table border="1" frame="void" rules="none" cellpadding="0" cellspacing="0"
         bordercolor="#FFFFFF" bordercolorlight="#FFFFFF" bordercolordark="#FFFFFF"
         style="width:100%; border:1px solid #FFFFFF; border-collapse:collapse; margin-bottom:6pt;">
    <tr>
      <td style="border:1px solid #FFFFFF; width:50%; text-align:center; vertical-align:bottom; padding:0;">
        ${sealDataUrl
          ? `<img src="${sealDataUrl}" alt="Sello" width="80" height="60" style="width:80pt; height:60pt;" />`
          : `<p style="font-size:8pt; color:#aaaaaa; margin:0;">[Sello Oficial]</p>`}
      </td>
      <td style="border:1px solid #FFFFFF; width:50%; text-align:center; vertical-align:bottom; padding:0;">
        ${signatureDataUrl
          ? `<img src="${signatureDataUrl}" alt="Firma" width="80" height="60" style="width:80pt; height:60pt;" />`
          : `<p style="font-size:8pt; color:#aaaaaa; margin:0;">[Firma]</p>`}
      </td>
    </tr>
  </table>

  <p style="font-size:11pt; font-weight:bold; text-align:center; color:#000000; margin:0;">
    - ${signerTitle.toUpperCase()} -
  </p>
</div>

<!-- ══════════════════════════════════════════
     FOOTER  (PDF: separator + recipientTitle)
     ══════════════════════════════════════════ -->
<hr style="border:none; border-top:0.8pt solid #000000; margin:18pt 0 6pt 0;" />
<p style="font-size:10pt; color:#000000; margin:3pt 0;">
  ${recipientTitle || 'Excmo. Sr. __________________.- Ciudad'}
</p>

</body>
</html>`;
  }
}
