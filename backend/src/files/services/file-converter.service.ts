import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { ConversionFormat, ConversionResult } from '../dto/convert-file.dto';
import * as libre from 'libreoffice-convert';
import { promisify } from 'util';

const libreConvert = promisify(libre.convert);

@Injectable()
export class FileConverterService {
  private readonly logger = new Logger(FileConverterService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  /**
   * Convert a file to the target format
   */
  async convertFile(
    fileId: string,
    targetFormat: ConversionFormat,
    userId: string,
  ): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      // Get source file
      const sourceFile = await this.prisma.documentFile.findUnique({
        where: { id: fileId },
        include: { document: true },
      });

      if (!sourceFile) {
        throw new NotFoundException(`File ${fileId} not found`);
      }

      this.logger.log(
        `Converting file ${sourceFile.fileName} to ${targetFormat}`,
      );

      // Check if conversion is supported
      const canConvert = await this.canConvert(
        sourceFile.mimeType,
        targetFormat,
      );

      if (!canConvert) {
        return {
          success: false,
          fileId,
          error: `Cannot convert from ${sourceFile.mimeType} to ${targetFormat}`,
        };
      }

      // Download source file from storage
      const sourceBuffer = await this.storageService.downloadFile(
        sourceFile.storagePath,
      );

      // Perform conversion
      const convertedBuffer = await this.performConversion(
        sourceBuffer,
        sourceFile.mimeType,
        targetFormat,
      );

      // Generate new filename
      const newFileName = this.getConvertedFileName(
        sourceFile.fileName,
        targetFormat,
      );

      // Upload converted file
      const uploadResult = await this.storageService.uploadFileBuffer(
        convertedBuffer,
        newFileName,
        this.getTargetMimeType(targetFormat),
        `documents/${sourceFile.documentId}`,
      );

      // Create new DocumentFile record
      const convertedFile = await this.prisma.documentFile.create({
        data: {
          documentId: sourceFile.documentId,
          fileName: newFileName,
          fileSize: convertedBuffer.length,
          mimeType: this.getTargetMimeType(targetFormat),
          storageType: 'S3',
          storagePath: uploadResult.key,
          storageUrl: uploadResult.url,
          hash: uploadResult.hash,
          uploadedById: userId,
          // Copy security metadata from source
          detectedMimeType: this.getTargetMimeType(targetFormat),
          declaredMimeType: this.getTargetMimeType(targetFormat),
          typeMismatch: false,
          isSecure: true,
          securityFlags: [],
        },
      });

      const duration = Date.now() - startTime;

      this.logger.log(
        `Conversion completed in ${duration}ms: ${newFileName}`,
      );

      return {
        success: true,
        fileId,
        convertedFileId: convertedFile.id,
        duration,
      };
    } catch (error) {
      this.logger.error(`Conversion failed: ${error.message}`, error.stack);
      return {
        success: false,
        fileId,
        error: error.message,
      };
    }
  }

  /**
   * Check if conversion is supported
   */
  private async canConvert(
    sourceMimeType: string,
    targetFormat: ConversionFormat,
  ): Promise<boolean> {
    const supportedConversions: Record<string, ConversionFormat[]> = {
      // Word documents → PDF
      'application/msword': [ConversionFormat.PDF],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        [ConversionFormat.PDF],

      // Excel spreadsheets → PDF
      'application/vnd.ms-excel': [ConversionFormat.PDF],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        ConversionFormat.PDF,
      ],

      // PowerPoint presentations → PDF
      'application/vnd.ms-powerpoint': [ConversionFormat.PDF],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        [ConversionFormat.PDF],
    };

    const formats = supportedConversions[sourceMimeType];
    return formats ? formats.includes(targetFormat) : false;
  }

  /**
   * Perform the actual conversion using LibreOffice
   */
  private async performConversion(
    sourceBuffer: Buffer,
    sourceMimeType: string,
    targetFormat: ConversionFormat,
  ): Promise<Buffer> {
    this.logger.log(
      `Converting ${sourceMimeType} to ${targetFormat} using LibreOffice`,
    );

    try {
      // LibreOffice convert expects file extension
      const ext = this.getExtensionFromMimeType(sourceMimeType);
      const convertedBuffer = await libreConvert(sourceBuffer, ext, undefined);

      this.logger.log(
        `Conversion successful. Output size: ${convertedBuffer.length} bytes`,
      );

      return convertedBuffer;
    } catch (error) {
      this.logger.error(`LibreOffice conversion error: ${error.message}`);
      throw new Error(
        `Conversion failed: ${error.message}. Make sure LibreOffice is installed on the server.`,
      );
    }
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        '.xlsx',
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        '.pptx',
    };

    return mimeToExt[mimeType] || '.bin';
  }

  /**
   * Generate filename for converted file
   */
  private getConvertedFileName(
    originalName: string,
    targetFormat: ConversionFormat,
  ): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExt}_converted.${targetFormat}`;
  }

  /**
   * Get MIME type for target format
   */
  private getTargetMimeType(format: ConversionFormat): string {
    const formatMimes: Record<ConversionFormat, string> = {
      [ConversionFormat.PDF]: 'application/pdf',
      [ConversionFormat.DOCX]:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      [ConversionFormat.XLSX]:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    return formatMimes[format];
  }

  /**
   * Get list of supported conversions for a file
   */
  async getSupportedConversions(fileId: string): Promise<ConversionFormat[]> {
    const file = await this.prisma.documentFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return [];
    }

    const supportedFormats: ConversionFormat[] = [];

    if (await this.canConvert(file.mimeType, ConversionFormat.PDF)) {
      supportedFormats.push(ConversionFormat.PDF);
    }

    return supportedFormats;
  }
}
