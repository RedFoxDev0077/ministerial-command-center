import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileTypeDetectorService } from './services/file-type-detector.service';
import { StorageService } from '../storage/storage.service';
import * as libre from 'libreoffice-convert';
import { promisify } from 'util';

const libreConvert = promisify(libre.convert);

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private prisma: PrismaService,
    private fileTypeDetector: FileTypeDetectorService,
    private storageService: StorageService,
  ) {}

  /**
   * Get files with security flags (for admin review)
   */
  async getFlaggedFiles(userId?: string) {
    const files = await this.prisma.documentFile.findMany({
      where: {
        OR: [
          { typeMismatch: true },
          { isSecure: false },
        ],
        ...(userId && { uploadedById: userId }),
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            correlativeNumber: true,
          },
        },
        uploadedBy: {
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
      take: 100,
    });

    return { files };
  }

  /**
   * Get detailed security information for a specific file
   */
  async getFileSecurityDetails(fileId: string) {
    const file = await this.prisma.documentFile.findUnique({
      where: { id: fileId },
      include: {
        document: true,
        uploadedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    return {
      id: file.id,
      fileName: file.fileName,
      fileSize: file.fileSize,
      declaredMimeType: file.declaredMimeType || file.mimeType,
      detectedMimeType: file.detectedMimeType,
      typeMismatch: file.typeMismatch,
      isSecure: file.isSecure,
      securityFlags: file.securityFlags,
      uploadedBy: file.uploadedBy,
      uploadedAt: file.createdAt,
      document: {
        id: file.document.id,
        title: file.document.title,
        correlativeNumber: file.document.correlativeNumber,
      },
    };
  }

  /**
   * Mark file security issue as reviewed
   */
  async markFileAsReviewed(fileId: string, userId: string, approved: boolean) {
    const file = await this.prisma.documentFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    const updatedFile = await this.prisma.documentFile.update({
      where: { id: fileId },
      data: {
        isSecure: approved,
        securityFlags: approved
          ? []
          : [...(file.securityFlags || []), 'MANUAL_REVIEW_REJECTED'],
      },
    });

    this.logger.log(
      `File ${fileId} security reviewed by user ${userId}: ${approved ? 'APPROVED' : 'REJECTED'}`,
    );

    return updatedFile;
  }

  /**
   * Get security statistics
   */
  async getSecurityStats() {
    const [totalFiles, flaggedFiles, typeMismatchFiles, reviewedFiles] =
      await Promise.all([
        this.prisma.documentFile.count(),
        this.prisma.documentFile.count({
          where: {
            OR: [{ typeMismatch: true }, { isSecure: false }],
          },
        }),
        this.prisma.documentFile.count({
          where: { typeMismatch: true },
        }),
        this.prisma.documentFile.count({
          where: {
            securityFlags: {
              has: 'MANUAL_REVIEW_REJECTED',
            },
          },
        }),
      ]);

    const secureFiles = totalFiles - flaggedFiles;
    const pendingReview = flaggedFiles - reviewedFiles;

    return {
      totalFiles,
      secureFiles,
      flaggedFiles,
      typeMismatchFiles,
      reviewedFiles,
      pendingReview,
    };
  }

  /**
   * Get download URL for a file
   */
  async getDownloadUrl(fileId: string) {
    console.log('=== FILES SERVICE - getDownloadUrl CALLED ===');
    console.log('File ID:', fileId);
    console.log('Timestamp:', new Date().toISOString());

    const file = await this.prisma.documentFile.findUnique({
      where: { id: fileId },
    });

    console.log('File found:', file ? 'YES' : 'NO');
    if (file) {
      console.log('File name:', file.fileName);
      console.log('Storage path:', file.storagePath);
    }

    if (!file) {
      console.log('ERROR: File not found, throwing NotFoundException');
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // Generate signed URL (for local storage, this returns the static URL)
    const url = await this.storageService.getSignedUrl(file.storagePath);
    console.log('Generated URL:', url);

    return {
      url,
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
    };
  }

  /**
   * Download file buffer with automatic conversion if needed
   */
  async downloadFileBuffer(fileId: string): Promise<{
    buffer: Buffer;
    fileName: string;
    mimeType: string;
  }> {
    console.log('=== downloadFileBuffer ===');
    console.log('File ID:', fileId);

    const file = await this.prisma.documentFile.findUnique({
      where: { id: fileId },
    });

    console.log('File found:', file ? 'YES' : 'NO');
    if (file) {
      console.log('Storage path:', file.storagePath);
      console.log('Declared MIME type:', file.mimeType);
      console.log('Detected MIME type:', file.detectedMimeType);
      console.log('Type mismatch:', file.typeMismatch);
    }

    if (!file) {
      console.log('ERROR: File not found');
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    let buffer = await this.storageService.downloadFile(file.storagePath);
    console.log('Downloaded buffer size:', buffer.length, 'bytes');

    // Check if file needs conversion (Word file with .pdf extension)
    const needsConversion = this.needsWordToPdfConversion(file, buffer);

    if (needsConversion) {
      console.log('File needs Word-to-PDF conversion, converting...');
      try {
        buffer = await this.convertWordToPdf(buffer);
        console.log('Conversion successful. New buffer size:', buffer.length, 'bytes');

        return {
          buffer,
          fileName: file.fileName,
          mimeType: 'application/pdf',
        };
      } catch (error) {
        this.logger.error(`Word to PDF conversion failed: ${error.message}`);
        console.log('Conversion failed, returning original file');
        // Return original file if conversion fails
      }
    }

    return {
      buffer,
      fileName: file.fileName,
      mimeType: file.mimeType,
    };
  }

  /**
   * Check if file needs Word to PDF conversion
   */
  private needsWordToPdfConversion(file: any, buffer: Buffer): boolean {
    // Check if file extension is .pdf but content is Word document
    const fileExtension = file.fileName.toLowerCase();
    const isPdfExtension = fileExtension.endsWith('.pdf');

    if (!isPdfExtension) {
      return false;
    }

    // Check file signature (magic bytes) for Word documents
    // DOCX files start with "PK" (ZIP signature: 0x504B)
    // DOC files start with 0xD0CF11E0 (OLE signature)
    const isDocx = buffer.length > 2 &&
                   buffer[0] === 0x50 &&
                   buffer[1] === 0x4B;

    const isDoc = buffer.length > 4 &&
                  buffer[0] === 0xD0 &&
                  buffer[1] === 0xCF &&
                  buffer[2] === 0x11 &&
                  buffer[3] === 0xE0;

    if (isDocx || isDoc) {
      console.log(`File ${file.fileName} is actually a ${isDocx ? 'DOCX' : 'DOC'} file`);
      return true;
    }

    return false;
  }

  /**
   * Convert Word document buffer to PDF
   */
  private async convertWordToPdf(wordBuffer: Buffer): Promise<Buffer> {
    try {
      // Detect if it's DOCX or DOC based on magic bytes
      const isDocx = wordBuffer.length > 2 &&
                     wordBuffer[0] === 0x50 &&
                     wordBuffer[1] === 0x4B;

      const fileType = isDocx ? 'DOCX' : 'DOC';

      this.logger.log(`Converting ${fileType} to PDF using LibreOffice`);

      // Use libreoffice-convert to convert Word to PDF
      // Second parameter is the OUTPUT format, not input extension
      const pdfBuffer = await libreConvert(wordBuffer, 'pdf', undefined);

      this.logger.log(`Conversion successful. PDF size: ${pdfBuffer.length} bytes`);

      return pdfBuffer;
    } catch (error) {
      this.logger.error(`LibreOffice conversion error: ${error.message}`);
      throw new Error(
        `Word to PDF conversion failed: ${error.message}. Make sure LibreOffice is installed on the server.`,
      );
    }
  }
}
