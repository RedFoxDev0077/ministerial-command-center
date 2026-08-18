import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QrService {
  private readonly logger = new Logger(QrService.name);
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    // Use frontend URL or fallback to backend URL
    this.baseUrl = this.configService.get<string>(
      'FRONTEND_URL',
      this.configService.get<string>('APP_URL', 'http://157.230.178.118'),
    );
  }

  /**
   * Generate QR code for a document
   * Returns base64 data URL that can be embedded in PDFs or stored
   */
  async generateDocumentQR(documentId: string): Promise<string> {
    try {
      // Create URL that points to public document viewer page
      const documentUrl = `${this.baseUrl}/document/${documentId}`;

      // Generate QR code as data URL (base64)
      const qrCodeDataUrl = await QRCode.toDataURL(documentUrl, {
        errorCorrectionLevel: 'H', // High error correction
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      this.logger.log(`QR code generated for document ${documentId}`);

      return qrCodeDataUrl;
    } catch (error) {
      this.logger.error(`Failed to generate QR code: ${error.message}`);
      throw new Error(`QR code generation failed: ${error.message}`);
    }
  }

  /**
   * Generate enhanced QR code with document details
   *
   * Client requirement: QR must contain number + recipients + date
   * Format: Structured JSON data for verification
   */
  async generateEnhancedDocumentQR(data: {
    documentId: string;
    documentNumber: string;
    recipients: string[];
    date: Date;
    title?: string;
  }): Promise<string> {
    try {
      // Create structured data for QR code
      const qrData = {
        id: data.documentId,
        number: data.documentNumber,
        recipients: data.recipients,
        date: data.date.toISOString().split('T')[0], // YYYY-MM-DD
        title: data.title,
        verifyUrl: `${this.baseUrl}/verify/${data.documentId}`,
      };

      // Convert to JSON string
      const qrContent = JSON.stringify(qrData);

      // Generate QR code with enhanced data
      const qrCodeDataUrl = await QRCode.toDataURL(qrContent, {
        errorCorrectionLevel: 'H', // High error correction (important for official documents)
        type: 'image/png',
        width: 400, // Larger for better scanning
        margin: 3,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      this.logger.log(
        `Enhanced QR code generated for document ${data.documentNumber}`,
      );

      return qrCodeDataUrl;
    } catch (error) {
      this.logger.error(`Failed to generate enhanced QR code: ${error.message}`);
      throw new Error(`Enhanced QR code generation failed: ${error.message}`);
    }
  }

  /**
   * Generate QR code as buffer (for file upload)
   */
  async generateDocumentQRBuffer(documentId: string): Promise<Buffer> {
    try {
      const documentUrl = `${this.baseUrl}/document/${documentId}`;

      const qrBuffer = await QRCode.toBuffer(documentUrl, {
        errorCorrectionLevel: 'H',
        type: 'png',
        width: 300,
        margin: 2,
      });

      return qrBuffer;
    } catch (error) {
      this.logger.error(`Failed to generate QR buffer: ${error.message}`);
      throw new Error(`QR buffer generation failed: ${error.message}`);
    }
  }

  /**
   * Generate verification QR code with additional data
   * Includes: document number, date, hash for verification
   */
  async generateVerificationQR(
    documentId: string,
    correlativeNumber: string,
    hash?: string,
  ): Promise<string> {
    try {
      // Create verification payload
      const verificationData = {
        id: documentId,
        number: correlativeNumber,
        url: `${this.baseUrl}/document/${documentId}`,
        hash: hash ? hash.substring(0, 16) : undefined, // First 16 chars of hash
        verified: new Date().toISOString(),
      };

      // Generate QR with JSON payload
      const qrCodeDataUrl = await QRCode.toDataURL(
        JSON.stringify(verificationData),
        {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          width: 300,
          margin: 2,
        },
      );

      this.logger.log(
        `Verification QR code generated for ${correlativeNumber}`,
      );

      return qrCodeDataUrl;
    } catch (error) {
      this.logger.error(
        `Failed to generate verification QR: ${error.message}`,
      );
      throw new Error(`Verification QR generation failed: ${error.message}`);
    }
  }

  /**
   * Parse QR code data (for verification)
   */
  parseQRData(qrText: string): any {
    try {
      // Try to parse as JSON
      return JSON.parse(qrText);
    } catch {
      // If not JSON, return as plain URL
      return { url: qrText };
    }
  }
}
