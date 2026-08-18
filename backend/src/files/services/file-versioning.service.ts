import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import {
  FileVersionHistoryResponseDto,
  FileVersionResponseDto,
} from '../dto/file-version.dto';

@Injectable()
export class FileVersioningService {
  private readonly logger = new Logger(FileVersioningService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  /**
   * Get version history for a file
   */
  async getFileVersionHistory(
    fileId: string,
  ): Promise<FileVersionHistoryResponseDto> {
    // Get current file
    const currentFile = await this.prisma.documentFile.findUnique({
      where: { id: fileId },
    });

    if (!currentFile) {
      throw new NotFoundException(`File ${fileId} not found`);
    }

    // Get all versions
    const versions = await this.prisma.fileVersion.findMany({
      where: { fileId },
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
      orderBy: { versionNumber: 'desc' },
    });

    return {
      fileId,
      currentVersion: currentFile.version,
      totalVersions: versions.length,
      versions: versions.map((v) => this.mapToVersionResponse(v)),
    };
  }

  /**
   * Create a new version (archive current file before update)
   * This is called internally when a file is being replaced
   */
  async createVersion(
    fileId: string,
    userId: string,
    comment?: string,
  ): Promise<FileVersionResponseDto> {
    const currentFile = await this.prisma.documentFile.findUnique({
      where: { id: fileId },
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
    });

    if (!currentFile) {
      throw new NotFoundException(`File ${fileId} not found`);
    }

    this.logger.log(
      `Creating version ${currentFile.version} for file ${currentFile.fileName}`,
    );

    // Create version record
    const version = await this.prisma.fileVersion.create({
      data: {
        fileId,
        versionNumber: currentFile.version,
        fileName: currentFile.fileName,
        fileSize: currentFile.fileSize,
        mimeType: currentFile.mimeType,
        hash: currentFile.hash,
        storagePath: currentFile.storagePath,
        storageUrl: currentFile.storageUrl,
        comment,
        uploadedById: userId,
      },
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
    });

    this.logger.log(`Version ${version.versionNumber} created successfully`);

    return this.mapToVersionResponse(version);
  }

  /**
   * Restore a previous version
   * This makes a historical version the current version
   */
  async restoreVersion(
    fileId: string,
    versionNumber: number,
    userId: string,
    comment?: string,
  ): Promise<FileVersionResponseDto> {
    // Get the version to restore
    const versionToRestore = await this.prisma.fileVersion.findFirst({
      where: {
        fileId,
        versionNumber,
      },
    });

    if (!versionToRestore) {
      throw new NotFoundException(
        `Version ${versionNumber} not found for file ${fileId}`,
      );
    }

    // Get current file
    const currentFile = await this.prisma.documentFile.findUnique({
      where: { id: fileId },
    });

    if (!currentFile) {
      throw new NotFoundException(`File ${fileId} not found`);
    }

    this.logger.log(
      `Restoring version ${versionNumber} for file ${currentFile.fileName}`,
    );

    // Archive current version before restoring
    await this.createVersion(
      fileId,
      userId,
      comment || `Archived before restoring version ${versionNumber}`,
    );

    // Download the old version from storage
    const versionBuffer = await this.storageService.downloadFile(
      versionToRestore.storagePath,
    );

    // Upload as new current version
    const uploadResult = await this.storageService.uploadFileBuffer(
      versionBuffer,
      versionToRestore.fileName,
      versionToRestore.mimeType,
      `documents/${currentFile.documentId}`,
    );

    // Update current file with restored content
    await this.prisma.documentFile.update({
      where: { id: fileId },
      data: {
        fileName: versionToRestore.fileName,
        fileSize: versionToRestore.fileSize,
        mimeType: versionToRestore.mimeType,
        hash: uploadResult.hash,
        storagePath: uploadResult.key,
        storageUrl: uploadResult.url,
        version: currentFile.version + 1, // Increment version
        uploadedById: userId,
      },
    });

    this.logger.log(`Version ${versionNumber} restored successfully`);

    // Return the restored version info
    const restoredVersion = await this.prisma.fileVersion.findFirst({
      where: { fileId, versionNumber },
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
    });

    return this.mapToVersionResponse(restoredVersion);
  }

  /**
   * Download a specific version
   */
  async downloadVersion(
    fileId: string,
    versionNumber: number,
  ): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const version = await this.prisma.fileVersion.findFirst({
      where: {
        fileId,
        versionNumber,
      },
    });

    if (!version) {
      throw new NotFoundException(
        `Version ${versionNumber} not found for file ${fileId}`,
      );
    }

    this.logger.log(
      `Downloading version ${versionNumber} of file ${version.fileName}`,
    );

    const buffer = await this.storageService.downloadFile(version.storagePath);

    return {
      buffer,
      fileName: version.fileName,
      mimeType: version.mimeType,
    };
  }

  /**
   * Delete old versions (for cleanup)
   * Keeps the last N versions
   */
  async cleanupOldVersions(
    fileId: string,
    keepLastN: number = 5,
  ): Promise<number> {
    const versions = await this.prisma.fileVersion.findMany({
      where: { fileId },
      orderBy: { versionNumber: 'desc' },
    });

    if (versions.length <= keepLastN) {
      return 0;
    }

    const versionsToDelete = versions.slice(keepLastN);

    this.logger.log(
      `Cleaning up ${versionsToDelete.length} old versions for file ${fileId}`,
    );

    // Delete from storage and database
    for (const version of versionsToDelete) {
      try {
        // Delete from S3/storage
        await this.storageService.deleteFile(version.storagePath);
      } catch (error) {
        this.logger.warn(
          `Failed to delete version ${version.versionNumber} from storage: ${error.message}`,
        );
      }
    }

    // Delete from database
    const deleted = await this.prisma.fileVersion.deleteMany({
      where: {
        fileId,
        versionNumber: {
          in: versionsToDelete.map((v) => v.versionNumber),
        },
      },
    });

    this.logger.log(`Cleaned up ${deleted.count} versions`);

    return deleted.count;
  }

  /**
   * Map database record to DTO
   */
  private mapToVersionResponse(version: any): FileVersionResponseDto {
    return {
      id: version.id,
      fileId: version.fileId,
      versionNumber: version.versionNumber,
      fileName: version.fileName,
      fileSize: version.fileSize,
      mimeType: version.mimeType,
      hash: version.hash,
      storagePath: version.storagePath,
      storageUrl: version.storageUrl,
      comment: version.comment,
      uploadedById: version.uploadedById,
      uploadedBy: version.uploadedBy,
      createdAt: version.createdAt,
    };
  }
}
