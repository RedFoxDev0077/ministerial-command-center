import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { FilesService } from './files.service';
import { FileConverterService } from './services/file-converter.service';
import { FileVersioningService } from './services/file-versioning.service';
import { ConvertFileDto } from './dto/convert-file.dto';
import { RestoreFileVersionDto } from './dto/file-version.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly converterService: FileConverterService,
    private readonly versioningService: FileVersioningService,
  ) {}

  @Get('security/flagged')
  @Roles('ADMIN', 'GABINETE')
  @ApiOperation({ summary: 'Get files with security flags (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of flagged files',
  })
  async getFlaggedFiles(@Request() req) {
    return this.filesService.getFlaggedFiles();
  }

  @Get('security/stats')
  @Roles('ADMIN', 'GABINETE')
  @ApiOperation({ summary: 'Get file security statistics (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns security statistics',
  })
  async getSecurityStats() {
    return this.filesService.getSecurityStats();
  }

  @Get(':id/security/details')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @ApiOperation({ summary: 'Get detailed security information for a file' })
  @ApiParam({ name: 'id', description: 'File UUID' })
  @ApiResponse({
    status: 200,
    description: 'Returns detailed security information',
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFileSecurityDetails(@Param('id') id: string) {
    return this.filesService.getFileSecurityDetails(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download file directly' })
  @ApiParam({ name: 'id', description: 'File UUID' })
  @ApiResponse({
    status: 200,
    description: 'File downloaded successfully',
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    console.log('=== FILES CONTROLLER - DOWNLOAD ENDPOINT HIT ===');
    console.log('File ID:', id);
    console.log('Timestamp:', new Date().toISOString());

    const { buffer, fileName, mimeType } = await this.filesService.downloadFileBuffer(id);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length,
    });

    return new StreamableFile(buffer);
  }

  @Post(':id/security/review')
  @Roles('ADMIN', 'GABINETE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Review and approve/reject file security flag' })
  @ApiParam({ name: 'id', description: 'File UUID' })
  @ApiResponse({
    status: 200,
    description: 'File security status updated',
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async reviewFile(
    @Param('id') id: string,
    @Body() body: { approved: boolean },
    @Request() req,
  ) {
    return this.filesService.markFileAsReviewed(
      id,
      req.user.id,
      body.approved,
    );
  }

  // Phase 2: File Conversion Endpoints

  @Post(':id/convert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert file to target format (DOCX→PDF, XLSX→PDF)' })
  @ApiParam({ name: 'id', description: 'File UUID to convert' })
  @ApiResponse({
    status: 200,
    description: 'File converted successfully',
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async convertFile(
    @Param('id') id: string,
    @Body() dto: ConvertFileDto,
    @Request() req,
  ) {
    return this.converterService.convertFile(id, dto.targetFormat, req.user.id);
  }

  @Get(':id/conversions')
  @ApiOperation({ summary: 'Get supported conversion formats for a file' })
  @ApiParam({ name: 'id', description: 'File UUID' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of supported target formats',
  })
  async getSupportedConversions(@Param('id') id: string) {
    const formats = await this.converterService.getSupportedConversions(id);
    return {
      fileId: id,
      supportedFormats: formats,
    };
  }

  // Phase 3: File Versioning Endpoints

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get version history for a file' })
  @ApiParam({ name: 'id', description: 'File UUID' })
  @ApiResponse({
    status: 200,
    description: 'Returns version history',
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getVersionHistory(@Param('id') id: string) {
    return this.versioningService.getFileVersionHistory(id);
  }

  @Post(':id/versions/:versionNumber/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a previous version of a file' })
  @ApiParam({ name: 'id', description: 'File UUID' })
  @ApiParam({ name: 'versionNumber', description: 'Version number to restore' })
  @ApiResponse({
    status: 200,
    description: 'Version restored successfully',
  })
  @ApiResponse({ status: 404, description: 'File or version not found' })
  async restoreVersion(
    @Param('id') id: string,
    @Param('versionNumber') versionNumber: string,
    @Body() dto: RestoreFileVersionDto,
    @Request() req,
  ) {
    return this.versioningService.restoreVersion(
      id,
      parseInt(versionNumber, 10),
      req.user.id,
      dto.comment,
    );
  }

  @Get(':id/versions/:versionNumber/download')
  @ApiOperation({ summary: 'Download a specific version of a file' })
  @ApiParam({ name: 'id', description: 'File UUID' })
  @ApiParam({ name: 'versionNumber', description: 'Version number to download' })
  @ApiResponse({
    status: 200,
    description: 'File version downloaded',
  })
  @ApiResponse({ status: 404, description: 'File or version not found' })
  async downloadVersion(
    @Param('id') id: string,
    @Param('versionNumber') versionNumber: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, fileName, mimeType } =
      await this.versioningService.downloadVersion(
        id,
        parseInt(versionNumber, 10),
      );

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length,
    });

    return new StreamableFile(buffer);
  }

  @Post(':id/versions/cleanup')
  @Roles('ADMIN', 'GABINETE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clean up old versions (admin only, keeps last 5)',
  })
  @ApiParam({ name: 'id', description: 'File UUID' })
  @ApiResponse({
    status: 200,
    description: 'Old versions cleaned up',
  })
  async cleanupVersions(@Param('id') id: string) {
    const deletedCount = await this.versioningService.cleanupOldVersions(id, 5);
    return {
      fileId: id,
      deletedVersions: deletedCount,
    };
  }

  /**
   * Serve uploaded files from storage
   * This endpoint handles URLs like /api/files/serve/documents/id/file.pdf
   * Uses wildcard to handle nested directory structures
   */
  @Public()
  @Get('serve/*')
  @ApiOperation({ summary: 'Serve uploaded files from storage' })
  @ApiResponse({
    status: 200,
    description: 'File served successfully',
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async serveFile(
    @Param('0') filepath: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    console.log('=== FILES CONTROLLER - SERVE ENDPOINT HIT ===');
    console.log('File path:', filepath);
    console.log('Timestamp:', new Date().toISOString());

    // Construct full path
    const fullPath = join(process.cwd(), 'uploads', filepath);

    // Check if file exists
    if (!existsSync(fullPath)) {
      throw new NotFoundException(`File not found: ${filepath}`);
    }

    // Get filename for Content-Disposition header
    const filename = filepath.split('/').pop() || 'download';

    // Create read stream
    const fileStream = createReadStream(fullPath);

    // Set response headers
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    return new StreamableFile(fileStream);
  }
}
