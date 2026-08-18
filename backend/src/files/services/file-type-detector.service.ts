import { Injectable, Logger } from '@nestjs/common';

export interface FileTypeResult {
  detectedMimeType: string | null;
  detectedExtension: string | null;
  confidence: 'high' | 'medium' | 'low';
  isTextBased: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  isSafe: boolean;
  typeMismatch: boolean;
  detectedType: string | null;
  declaredType: string;
  securityFlags: string[];
  message: string;
}

@Injectable()
export class FileTypeDetectorService {
  private readonly logger = new Logger(FileTypeDetectorService.name);

  // Dangerous file types that should always be rejected
  private readonly DANGEROUS_TYPES = [
    'application/x-msdownload', // .exe
    'application/x-msdos-program',
    'application/x-executable',
    'application/x-sharedlib',
    'application/x-sh',
    'application/x-shellscript',
    'application/javascript',
    'text/javascript',
    'application/vnd.microsoft.portable-executable',
  ];

  // Allowed document types for this system
  private readonly ALLOWED_TYPES = [
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.oasis.opendocument.text', // .odt
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
  ];

  /**
   * Detect file type from buffer using magic numbers
   */
  async detectFileType(buffer: Buffer): Promise<FileTypeResult> {
    try {
      // Use dynamic import for ESM-only package
      const { fileTypeFromBuffer } = await import('file-type');
      const fileType = await fileTypeFromBuffer(buffer);

      if (fileType) {
        this.logger.log(
          `Detected file type: ${fileType.mime} (${fileType.ext})`,
        );

        return {
          detectedMimeType: fileType.mime,
          detectedExtension: fileType.ext,
          confidence: 'high',
          isTextBased: this.isTextBasedType(fileType.mime),
        };
      }

      // If file-type can't detect it, it might be a text-based file
      const isText = this.isLikelyTextFile(buffer);

      return {
        detectedMimeType: isText ? 'text/plain' : null,
        detectedExtension: isText ? 'txt' : null,
        confidence: isText ? 'medium' : 'low',
        isTextBased: isText,
      };
    } catch (error) {
      this.logger.error(`File type detection failed: ${error.message}`);
      return {
        detectedMimeType: null,
        detectedExtension: null,
        confidence: 'low',
        isTextBased: false,
      };
    }
  }

  /**
   * Validate uploaded file against security rules
   */
  async validateFileType(
    file: Express.Multer.File,
  ): Promise<ValidationResult> {
    const declaredType = file.mimetype;
    const detection = await this.detectFileType(file.buffer);
    const detectedType = detection.detectedMimeType;

    const securityFlags: string[] = [];
    let isSafe = true;
    let message = 'File validation successful';

    // Check if detected type is dangerous
    if (detectedType && this.DANGEROUS_TYPES.includes(detectedType)) {
      securityFlags.push('DANGEROUS_FILE_TYPE');
      isSafe = false;
      message = `Dangerous file type detected: ${detectedType}`;
      this.logger.warn(
        `Rejected dangerous file: ${file.originalname} (${detectedType})`,
      );
    }

    // Check if detected type is not in allowed list
    if (
      detectedType &&
      !this.ALLOWED_TYPES.includes(detectedType) &&
      !detection.isTextBased
    ) {
      securityFlags.push('UNSUPPORTED_FILE_TYPE');
      isSafe = false;
      message = `File type not allowed: ${detectedType}`;
      this.logger.warn(
        `Rejected unsupported file: ${file.originalname} (${detectedType})`,
      );
    }

    // Check for type mismatch (file extension doesn't match content)
    const typeMismatch = this.checkTypeMismatch(
      detectedType,
      declaredType,
      file.originalname,
    );

    if (typeMismatch) {
      securityFlags.push('TYPE_MISMATCH');
      message = `File type mismatch: declared as ${declaredType}, detected as ${detectedType}`;
      this.logger.warn(
        `Type mismatch detected: ${file.originalname} - declared: ${declaredType}, detected: ${detectedType}`,
      );

      // If mismatch involves a dangerous type, reject
      if (
        detectedType &&
        this.DANGEROUS_TYPES.includes(detectedType)
      ) {
        isSafe = false;
      }
    }

    // Check file extension spoofing
    if (this.checkExtensionSpoofing(file.originalname, detectedType)) {
      securityFlags.push('EXTENSION_SPOOFING');
      isSafe = false;
      message = 'Possible file extension spoofing detected';
      this.logger.warn(
        `Extension spoofing detected: ${file.originalname}`,
      );
    }

    return {
      isValid: detection.confidence !== 'low',
      isSafe,
      typeMismatch,
      detectedType,
      declaredType,
      securityFlags,
      message,
    };
  }

  /**
   * Check if detected type mismatches declared type
   */
  private checkTypeMismatch(
    detectedType: string | null,
    declaredType: string,
    filename: string,
  ): boolean {
    if (!detectedType) return false;

    // Normalize types for comparison
    const detected = detectedType.toLowerCase();
    const declared = declaredType.toLowerCase();

    // Exact match
    if (detected === declared) return false;

    // Check for known type aliases
    const typeAliases = {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['application/msword'],
      'image/jpeg': ['image/jpg'],
    };

    for (const [mainType, aliases] of Object.entries(typeAliases)) {
      if (detected === mainType && aliases.includes(declared)) return false;
      if (declared === mainType && aliases.includes(detected)) return false;
    }

    // Type mismatch detected
    return true;
  }

  /**
   * Check for file extension spoofing
   */
  private checkExtensionSpoofing(
    filename: string,
    detectedType: string | null,
  ): boolean {
    if (!detectedType) return false;

    const extension = filename.split('.').pop()?.toLowerCase();
    if (!extension) return false;

    // Map of extensions to expected MIME types
    const extensionMap: Record<string, string[]> = {
      pdf: ['application/pdf'],
      doc: ['application/msword'],
      docx: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      jpg: ['image/jpeg'],
      jpeg: ['image/jpeg'],
      png: ['image/png'],
      txt: ['text/plain'],
    };

    const expectedTypes = extensionMap[extension];
    if (!expectedTypes) return false;

    // Check if detected type matches expected type for this extension
    return !expectedTypes.includes(detectedType);
  }

  /**
   * Check if MIME type is text-based
   */
  private isTextBasedType(mimeType: string): boolean {
    return (
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'application/xml'
    );
  }

  /**
   * Heuristic check if buffer contains text
   */
  private isLikelyTextFile(buffer: Buffer): boolean {
    // Check first 512 bytes for printable characters
    const sample = buffer.slice(0, Math.min(512, buffer.length));
    let printableCount = 0;

    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];
      // Printable ASCII + common whitespace
      if (
        (byte >= 32 && byte <= 126) ||
        byte === 9 || // tab
        byte === 10 || // newline
        byte === 13 // carriage return
      ) {
        printableCount++;
      }
    }

    // If >90% printable characters, likely text
    return printableCount / sample.length > 0.9;
  }

  /**
   * Get detailed file analysis report
   */
  async getFileAnalysis(file: Express.Multer.File): Promise<{
    detection: FileTypeResult;
    validation: ValidationResult;
    recommendation: string;
  }> {
    const detection = await this.detectFileType(file.buffer);
    const validation = await this.validateFileType(file);

    let recommendation: string;

    if (!validation.isSafe) {
      recommendation = 'REJECT - File poses security risk';
    } else if (validation.typeMismatch) {
      recommendation = 'REVIEW - Type mismatch detected, manual review recommended';
    } else if (validation.isValid) {
      recommendation = 'ACCEPT - File is safe and valid';
    } else {
      recommendation = 'REVIEW - Unable to determine file type';
    }

    return {
      detection,
      validation,
      recommendation,
    };
  }
}
