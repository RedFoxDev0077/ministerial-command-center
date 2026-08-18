import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  hash: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadPath: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    // Use local filesystem storage
    this.uploadPath = join(process.cwd(), 'uploads');
    this.baseUrl = this.configService.get<string>('API_URL', 'http://localhost:3000');

    // Ensure upload directory exists
    this.ensureUploadDirectory();

    this.logger.log('Local Storage Service initialized');
    this.logger.log(`Upload path: ${this.uploadPath}`);
  }

  private async ensureUploadDirectory() {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
      await fs.mkdir(join(this.uploadPath, 'documents'), { recursive: true });
      await fs.mkdir(join(this.uploadPath, 'temp'), { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create upload directories: ${error.message}`);
    }
  }

  /**
   * Upload file to local storage
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'documents',
  ): Promise<UploadResult> {
    try {
      // Generate hash for file integrity
      const hash = this.generateFileHash(file.buffer);

      // Generate unique key
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const extension = file.originalname.split('.').pop();
      const fileName = `${timestamp}-${randomString}.${extension}`;
      const key = `${folder}/${fileName}`;

      // Ensure folder exists
      const folderPath = join(this.uploadPath, folder);
      await fs.mkdir(folderPath, { recursive: true });

      // Write file to disk
      const filePath = join(this.uploadPath, key);
      await fs.writeFile(filePath, file.buffer);

      // Generate URL
      const url = `${this.baseUrl}/api/files/serve/${key}`;

      this.logger.log(`File uploaded successfully: ${key}`);

      return {
        key,
        url,
        size: file.size,
        mimeType: file.mimetype,
        hash,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Get file URL (for local storage, just return the API endpoint)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // For local storage, return public URL (no expiration needed for now)
    return `${this.baseUrl}/api/files/serve/${key}`;
  }

  /**
   * Delete file from local storage
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const filePath = join(this.uploadPath, key);
      await fs.unlink(filePath);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Generate SHA-256 hash of file for integrity checking
   */
  private generateFileHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Get file from local storage
   */
  async getFile(key: string): Promise<Buffer> {
    try {
      const filePath = join(this.uploadPath, key);
      const buffer = await fs.readFile(filePath);
      return buffer;
    } catch (error) {
      this.logger.error(`Failed to get file: ${error.message}`);
      throw new Error(`File retrieval failed: ${error.message}`);
    }
  }

  /**
   * Download file (alias for getFile)
   */
  async downloadFile(key: string): Promise<Buffer> {
    return this.getFile(key);
  }

  /**
   * Upload file from buffer
   */
  async uploadFileBuffer(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    folder: string = 'documents',
  ): Promise<UploadResult> {
    try {
      // Generate hash for file integrity
      const hash = this.generateFileHash(buffer);

      // Generate unique key
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const extension = fileName.split('.').pop();
      const uniqueFileName = `${timestamp}-${randomString}.${extension}`;
      const key = `${folder}/${uniqueFileName}`;

      // Ensure folder exists
      const folderPath = join(this.uploadPath, folder);
      await fs.mkdir(folderPath, { recursive: true });

      // Write file to disk
      const filePath = join(this.uploadPath, key);
      await fs.writeFile(filePath, buffer);

      // Generate URL
      const url = `${this.baseUrl}/api/files/serve/${key}`;

      this.logger.log(`File uploaded from buffer successfully: ${key}`);

      return {
        key,
        url,
        size: buffer.length,
        mimeType,
        hash,
      };
    } catch (error) {
      this.logger.error(`Failed to upload buffer: ${error.message}`, error.stack);
      throw new Error(`Buffer upload failed: ${error.message}`);
    }
  }
}
