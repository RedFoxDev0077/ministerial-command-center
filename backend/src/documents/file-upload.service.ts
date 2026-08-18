import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { OcrService } from '../ocr/ocr.service';
import { ConfigService } from '@nestjs/config';
import { validateFiles, scanFileContent } from '../common/validators/file-validation';
import { FileTypeDetectorService } from '../files/services/file-type-detector.service';

export interface UploadFilesResult {
  files: any[];
  extractedText: string;
  totalSize: number;
}

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private maxFileSize: number;
  private allowedTypes: string[];
  private maxFilesPerDocument: number;

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private ocrService: OcrService,
    private configService: ConfigService,
    private fileTypeDetector: FileTypeDetectorService,
  ) {
    this.maxFileSize = this.configService.get<number>(
      'MAX_FILE_SIZE',
      50 * 1024 * 1024,
    );
    this.allowedTypes = this.configService
      .get<string>('ALLOWED_FILE_TYPES', 'pdf,doc,docx,jpg,jpeg,png,txt')
      .split(',');
    this.maxFilesPerDocument = this.configService.get<number>(
      'MAX_FILES_PER_DOCUMENT',
      10,
    );
  }

  /**
   * Upload files for a document and extract text
   */
  async uploadDocumentFiles(
    documentId: string,
    files: Express.Multer.File[],
    userId: string,
  ): Promise<UploadFilesResult> {
    // Validate document exists
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    // Validate files
    validateFiles(files, {
      maxSize: this.maxFileSize,
      allowedTypes: this.allowedTypes,
      maxFiles: this.maxFilesPerDocument,
    });

    this.logger.log(
      `Uploading ${files.length} file(s) for document ${documentId}`,
    );

    const uploadedFiles = [];
    let combinedExtractedText = '';
    let totalSize = 0;

    // Process each file
    for (const file of files) {
      try {
        // Phase 1: File type detection and security validation
        this.logger.log(`Detecting file type for ${file.originalname}...`);
        const validation = await this.fileTypeDetector.validateFileType(file);

        // Reject dangerous files immediately
        if (!validation.isSafe) {
          this.logger.error(
            `SECURITY: Dangerous file detected and rejected: ${file.originalname} - ${validation.message}`,
          );
          throw new BadRequestException(
            `File "${file.originalname}" was rejected for security reasons: ${validation.message}`,
          );
        }

        // Log security warnings for flagged files
        if (!validation.isValid || validation.typeMismatch) {
          this.logger.warn(
            `SECURITY WARNING: File flagged for review: ${file.originalname} - ${validation.message}`,
          );
        }

        // Security scan
        scanFileContent(file);

        // Upload to R2 storage
        const storageResult = await this.storageService.uploadFile(
          file,
          `documents/${documentId}`,
        );

        // Extract text using OCR
        let extractedText = '';
        try {
          this.logger.log(`Starting OCR extraction for ${file.originalname} (${file.mimetype})`);
          const ocrResult = await this.ocrService.extractText(file);
          extractedText = ocrResult.text;

          if (extractedText && extractedText.length > 0) {
            this.logger.log(
              `OCR completed for ${file.originalname} using ${ocrResult.method} (${extractedText.length} chars)`,
            );
          } else {
            this.logger.warn(
              `OCR completed but extracted no text from ${file.originalname} using ${ocrResult.method}`,
            );
          }
        } catch (ocrError) {
          this.logger.error(
            `OCR failed for ${file.originalname}: ${ocrError.message}`,
          );
          this.logger.error(`OCR Error stack: ${ocrError.stack}`);
        }

        // Save file metadata to database (with Phase 1 security data)
        const documentFile = await this.prisma.documentFile.create({
          data: {
            documentId,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            storageType: 'S3', // R2 is S3-compatible
            storagePath: storageResult.key,
            storageUrl: storageResult.url,
            hash: storageResult.hash,
            uploadedById: userId,
            // Phase 1: Security metadata
            detectedMimeType: validation.detectedType,
            declaredMimeType: validation.declaredType,
            typeMismatch: validation.typeMismatch,
            isSecure: validation.isSafe && validation.isValid,
            securityFlags: validation.securityFlags,
          },
        });

        // Log security event if file was flagged
        if (validation.typeMismatch || validation.securityFlags.length > 0) {
          this.logger.warn(
            `File uploaded with security flags: ${file.originalname} - Flags: ${validation.securityFlags.join(', ')}`,
          );
        }

        uploadedFiles.push(documentFile);
        combinedExtractedText += (extractedText ? extractedText + '\n\n' : '');
        totalSize += file.size;

        this.logger.log(`File uploaded successfully: ${file.originalname}`);
      } catch (error) {
        this.logger.error(
          `Failed to upload file ${file.originalname}: ${error.message}`,
        );
        throw error;
      }
    }

    // Update document content with extracted OCR text if document has no content
    const trimmedExtractedText = combinedExtractedText.trim();
    if (trimmedExtractedText.length > 0) {
      const currentDocument = await this.prisma.document.findUnique({
        where: { id: documentId },
        select: { content: true },
      });

      // Only update content if it's currently empty or very short
      if (!currentDocument?.content || currentDocument.content.trim().length < 50) {
        // Convert plain OCR text to HTML so CKEditor displays it with proper paragraphs
        const htmlContent = this.plainTextToHtml(trimmedExtractedText);
        await this.prisma.document.update({
          where: { id: documentId },
          data: { content: htmlContent },
        });
        this.logger.log(`Updated document ${documentId} content with OCR text as HTML (${htmlContent.length} chars)`);
      }
    }

    return {
      files: uploadedFiles,
      extractedText: trimmedExtractedText,
      totalSize,
    };
  }

  /**
   * Delete file from document
   */
  async deleteDocumentFile(
    documentId: string,
    fileId: string,
  ): Promise<void> {
    // Get file metadata
    const file = await this.prisma.documentFile.findFirst({
      where: {
        id: fileId,
        documentId,
      },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // Delete from R2 storage
    try {
      await this.storageService.deleteFile(file.storagePath);
    } catch (error) {
      this.logger.error(
        `Failed to delete file from storage: ${error.message}`,
      );
      // Continue anyway to delete from database
    }

    // Delete from database
    await this.prisma.documentFile.delete({
      where: { id: fileId },
    });

    this.logger.log(`File deleted successfully: ${file.fileName}`);
  }

  /**
   * Get all files for a document
   */
  async getDocumentFiles(documentId: string) {
    return this.prisma.documentFile.findMany({
      where: { documentId },
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
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get file download URL
   */
  async getFileUrl(fileId: string): Promise<string> {
    const file = await this.prisma.documentFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // Generate signed URL for download
    return this.storageService.getSignedUrl(file.storagePath, 3600); // 1 hour expiry
  }

  /**
   * Process uploaded files and generate AI insights
   */
  async processDocumentWithAI(
    documentId: string,
    extractedText: string,
    documentType: string,
  ): Promise<void> {
    if (!extractedText || extractedText.length < 50) {
      this.logger.warn('Text too short for AI processing');
      return;
    }

    try {
      // Generate AI summary
      const aiSummary = await this.ocrService.generateSummary(extractedText);

      // Extract key points
      const keyPoints = await this.ocrService.extractKeyPoints(extractedText);

      // Generate proposed response
      const proposedResponse = await this.ocrService.generateProposedResponse(
        extractedText,
        documentType,
      );

      // Update document with AI results
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          aiSummary: aiSummary || undefined,
          aiKeyPoints: keyPoints.length > 0 ? keyPoints : undefined,
          aiProposedResponse: proposedResponse || undefined,
        },
      });

      this.logger.log(`AI processing completed for document ${documentId}`);
    } catch (error) {
      this.logger.error(`AI processing failed: ${error.message}`);
      // Don't throw - AI processing is optional
    }
  }

  /**
   * Generate AI content for a document (summary, key points, proposed response)
   * Can be called manually to regenerate AI content
   */
  async generateDocumentAI(
    documentId: string,
    force: boolean = false,
  ): Promise<any> {
    // Get document with files
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        files: true,
      },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    // Check if AI content already exists and force is not set
    if (!force && document.aiSummary && document.aiProposedResponse) {
      this.logger.log(`AI content already exists for document ${documentId}, skipping generation`);
      return {
        message: 'AI content already exists. Use force=true to regenerate.',
        document,
      };
    }

    // Get text content from document — prefer full content, fall back to aiSummary
    // (aiSummary was stored during original file upload OCR, content may be HTML-rich)
    const rawContent = document.content?.trim() || '';
    const rawSummary = (document as any).aiSummary?.trim() || '';
    let textContent = rawContent || rawSummary;

    // Strip HTML tags from content for cleaner AI input
    if (textContent && /<[^>]+>/g.test(textContent)) {
      textContent = textContent
        .replace(/<\/p>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    // If still no content, report but include the document so frontend can react gracefully
    if (!textContent && document.files.length > 0) {
      this.logger.log(`No text content for document ${documentId} with ${document.files.length} file(s)`);
      return {
        message: 'Document has files but no extracted text content. Please re-upload files to extract text.',
        files: document.files.length,
        document,
      };
    }

    // Check minimum text length
    if (!textContent || textContent.length < 50) {
      throw new BadRequestException(
        `Document text is too short for AI processing. Minimum 50 characters required, found ${textContent?.length || 0}. Please upload a document with more content.`,
      );
    }

    this.logger.log(`Generating AI content for document ${documentId} (${textContent.length} chars)`);

    // Generate AI content
    await this.processDocumentWithAI(documentId, textContent, document.type);

    // Fetch updated document
    const updatedDocument = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        entity: true,
        responsible: true,
        files: true,
      },
    });

    return {
      message: 'AI content generated successfully',
      document: updatedDocument,
    };
  }

  /**
   * Convert plain text (from OCR or AI) to HTML for CKEditor display.
   * - Blank line (double newline) -> new paragraph
   * - Single newline inside paragraph -> line break
   * - ALL-CAPS short lines -> h2 heading
   * - Lines starting with dash, bullet, or number -> list item
   */
  private plainTextToHtml(plainText: string): string {
    if (!plainText || plainText.trim() === '') return '';

    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const isHeading = (line: string) => {
      if (line.length < 3 || line.length > 80) return false;
      const letters = (line.match(/[A-ZÁÉÍÓÚÑa-záéíóúñ]/g) || []).length;
      const uppers = (line.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length;
      return letters > 0 && uppers / letters > 0.7;
    };

    const isListItem = (line: string) =>
      /^[•\-\*\→]\s+/.test(line) || /^(\d+[\.\)]\s+|[a-z][\.\)]\s+)/i.test(line);

    const formatListItem = (line: string) => {
      const isNumbered = /^(\d+[\.\)]\s+|[a-z][\.\)]\s+)/i.test(line);
      const content = line.replace(/^[•\-\*\→]\s+/, '').replace(/^[\da-z]+[\.\)]\s+/i, '');
      return { content: escapeHtml(content), numbered: isNumbered };
    };

    // Split into paragraphs by blank lines
    const rawParagraphs = plainText.split(/\n{2,}/);
    const htmlParts: string[] = [];

    for (const para of rawParagraphs) {
      const lines = para.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) continue;

      // Check if all lines are list items
      if (lines.every(isListItem)) {
        const items = lines.map(formatListItem);
        const isOl = items[0].numbered;
        const tag = isOl ? 'ol' : 'ul';
        const liItems = items.map(i => `<li>${i.content}</li>`).join('');
        htmlParts.push(`<${tag}>${liItems}</${tag}>`);
        continue;
      }

      // Single line that is a heading
      if (lines.length === 1 && isHeading(lines[0])) {
        htmlParts.push(`<h2>${escapeHtml(lines[0])}</h2>`);
        continue;
      }

      // Regular paragraph — join lines with <br> for soft breaks
      const inner = lines.map(l => escapeHtml(l)).join('<br>');
      htmlParts.push(`<p>${inner}</p>`);
    }

    return htmlParts.join('\n');
  }
}
