import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  HttpException,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { FilesInterceptor, AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { PdfService } from './pdf.service';
import { FileUploadService } from './file-upload.service';
import { FileVersioningService } from '../files/services/file-versioning.service';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';
import { CreateDocumentDto, DocumentStatus } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';
import { DecreeDocumentDto } from './dto/decree-document.dto';
import { AssignDocumentDto } from './dto/assign-document.dto';
import { SearchDocumentDto } from './dto/search-document.dto';
import { CreateDocumentFromTemplateDto } from './dto/create-document-from-template.dto';
import { GenerateAIDto } from './dto/generate-ai.dto';
import { GenerateDocumentFromPromptDto } from './dto/generate-document-from-prompt.dto';
import { AnalyzeDocumentDto } from './dto/analyze-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ManualEntryStampService } from './manual-entry-stamp.service';
import { AcknowledgmentService } from './acknowledgment.service';
import { SignatureProtocolService } from './signature-protocol.service';
import { AIDocumentGeneratorService } from './ai-document-generator.service';
import { OfficialPdfTemplateService } from './official-pdf-template.service';
import { OfficialWordTemplateService } from './official-word-template.service';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly pdfService: PdfService,
    private readonly fileUploadService: FileUploadService,
    private readonly fileVersioningService: FileVersioningService,
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
    private readonly manualEntryStampService: ManualEntryStampService,
    private readonly acknowledgmentService: AcknowledgmentService,
    private readonly signatureProtocolService: SignatureProtocolService,
    private readonly aiDocumentGeneratorService: AIDocumentGeneratorService,
    private readonly officialPdfTemplateService: OfficialPdfTemplateService,
    private readonly officialWordTemplateService: OfficialWordTemplateService,
  ) {}

  @Post()
  @Roles('ADMIN', 'GABINETE')
  @ApiOperation({ summary: 'Create a new document' })
  @ApiResponse({ status: 201, description: 'Document created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Entity or user not found' })
  create(@Body() createDocumentDto: CreateDocumentDto, @Request() req) {
    return this.documentsService.create(createDocumentDto, req.user.id);
  }

  @Get()
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  @ApiOperation({ summary: 'Get all documents with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  findAll(@Query() queryDto: QueryDocumentDto) {
    return this.documentsService.findAll(queryDto);
  }

  @Get('stats')
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStats() {
    return this.documentsService.getStats();
  }

  @Get('workflow-stats')
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  @ApiOperation({ summary: 'Get workflow statistics for the statistics card' })
  @ApiResponse({ status: 200, description: 'Workflow statistics retrieved successfully' })
  getWorkflowStats() {
    return this.documentsService.getWorkflowStats();
  }

  @Post(':id/translate')
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  @ApiOperation({ summary: 'Translate document content to target language' })
  translateDocument(@Param('id') id: string, @Body() body: { targetLanguage: string }) {
    return this.documentsService.translateDocument(id, body.targetLanguage);
  }

  @Get('inbox')
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  @ApiOperation({ summary: 'Get inbox documents (direction=IN)' })
  @ApiResponse({ status: 200, description: 'Inbox documents retrieved successfully' })
  getInbox(@Query() queryDto: QueryDocumentDto) {
    return this.documentsService.getInbox(queryDto);
  }

  @Get('outbox')
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  @ApiOperation({ summary: 'Get outbox documents (direction=OUT)' })
  @ApiResponse({ status: 200, description: 'Outbox documents retrieved successfully' })
  getOutbox(@Query() queryDto: QueryDocumentDto) {
    return this.documentsService.getOutbox(queryDto);
  }

  @Get('my')
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  @ApiOperation({ summary: 'Get documents assigned to current user' })
  @ApiResponse({ status: 200, description: 'User documents retrieved successfully' })
  getMyDocuments(@Request() req, @Query() queryDto: QueryDocumentDto) {
    return this.documentsService.getMyDocuments(req.user.id, queryDto);
  }

  @Get('search')
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  @ApiOperation({ summary: 'Full-text search documents' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid search query' })
  search(@Query() searchDto: SearchDocumentDto) {
    return this.documentsService.search(searchDto);
  }

  @Get('pending')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @ApiOperation({ summary: 'Get pending documents' })
  @ApiResponse({ status: 200, description: 'Pending documents retrieved successfully' })
  getPending(@Query() queryDto: QueryDocumentDto) {
    return this.documentsService.getPending(queryDto);
  }

  @Get('by-entity/:entityId')
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  @ApiOperation({ summary: 'Get documents by entity' })
  @ApiParam({ name: 'entityId', description: 'Entity UUID' })
  @ApiResponse({ status: 200, description: 'Entity documents retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  getByEntity(@Param('entityId') entityId: string, @Query() queryDto: QueryDocumentDto) {
    return this.documentsService.getByEntity(entityId, queryDto);
  }

  @Get('public/:id')
  @Public()
  @ApiOperation({ summary: 'Get document by ID (public access for QR codes)' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Document retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  findOnePublic(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Get('files/:fileId/download')
  @Public()
  @ApiOperation({ summary: 'Get file download URL (public access)' })
  @ApiParam({ name: 'fileId', description: 'File UUID' })
  @ApiResponse({ status: 200, description: 'File URL generated successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFileUrl(@Param('fileId') fileId: string) {
    // Get file metadata from database
    const file = await this.prisma.documentFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    // Generate fresh signed URL (valid for 1 hour)
    const signedUrl = await this.storageService.getSignedUrl(file.storagePath);

    return {
      id: file.id,
      fileName: file.fileName,
      url: signedUrl,
      mimeType: file.mimeType,
      size: file.fileSize,
    };
  }

  @Get(':id')
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Document retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @ApiOperation({ summary: 'Update document' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Document updated successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  update(@Param('id') id: string, @Body() updateDocumentDto: UpdateDocumentDto) {
    return this.documentsService.update(id, updateDocumentDto);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @ApiOperation({ summary: 'Update document status' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Document status updated successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: DocumentStatus,
    @Body('comment') comment?: string,
    @Request() req?,
  ) {
    const userId = req?.user?.id;
    return this.documentsService.updateStatus(id, status, comment, userId);
  }

  @Patch(':id/stage')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @ApiOperation({ summary: 'Update document workflow stage' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Document stage updated successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 400, description: 'Invalid stage for document direction' })
  async updateStage(
    @Param('id') id: string,
    @Body('currentStage') currentStage: string,
    @Body('comment') comment?: string,
    @Request() req?,
  ) {
    const userId = req?.user?.id;
    return this.documentsService.updateStage(id, currentStage, comment, userId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'GABINETE')
  @ApiOperation({ summary: 'Archive document (soft delete)' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Document archived successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }

  @Delete(':id/permanent')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Permanently delete document (hard delete - cannot be recovered)' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Document permanently deleted' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  permanentDelete(@Param('id') id: string) {
    return this.documentsService.permanentDelete(id);
  }

  @Post(':id/decree')
  @Roles('ADMIN', 'GABINETE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decree document to departments' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Document decreed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid department IDs' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  decree(@Param('id') id: string, @Body() decreeDto: DecreeDocumentDto) {
    return this.documentsService.decree(id, decreeDto);
  }

  @Post(':id/assign')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign document to a user' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Document assigned successfully' })
  @ApiResponse({ status: 404, description: 'Document or user not found' })
  assign(@Param('id') id: string, @Body() assignDto: AssignDocumentDto) {
    return this.documentsService.assign(id, assignDto);
  }

  @Get(':id/pdf')
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  @ApiOperation({ summary: 'Generate and download official PDF of document' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Official PDF generated successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    try {
      // Use official template service for government-standard PDFs
      const pdfBuffer = await this.officialPdfTemplateService.generateOfficialPDF(id);

      const document = await this.documentsService.findOne(id);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Documento-Oficial-${document.correlativeNumber || document.id}.pdf"`,
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      // Send PDF buffer
      return res.send(pdfBuffer);
    } catch (error) {
      throw new HttpException(
        `Failed to generate PDF: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/word')
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  @ApiOperation({ summary: 'Generate and download official Word (DOCX) of document' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Official DOCX generated successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async downloadWord(@Param('id') id: string, @Res() res: Response) {
    try {
      const docxBuffer = await this.officialWordTemplateService.generateOfficialWord(id);
      const document = await this.documentsService.findOne(id);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Documento-Oficial-${document.correlativeNumber || document.id}.docx"`,
      );
      res.setHeader('Content-Length', docxBuffer.length);

      return res.send(docxBuffer);
    } catch (error) {
      throw new HttpException(
        `Failed to generate Word document: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/files')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  @ApiOperation({ summary: 'Upload files to document with OCR and AI processing' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully with OCR text extraction' })
  @ApiResponse({ status: 400, description: 'Invalid file or file validation failed' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async uploadFiles(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    return await this.fileUploadService.uploadDocumentFiles(
      id,
      files,
      req.user.id,
    );
  }

  @Delete(':id/files/:fileId')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @ApiOperation({ summary: 'Delete file from document and cloud storage' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiParam({ name: 'fileId', description: 'File UUID' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(@Param('id') id: string, @Param('fileId') fileId: string) {
    return await this.fileUploadService.deleteDocumentFile(id, fileId);
  }

  @Patch(':id/files/:fileId/replace')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @UseInterceptors(
    FilesInterceptor('file', 1, {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  @ApiOperation({ summary: 'Replace an existing file with a new version (creates version history)' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiParam({ name: 'fileId', description: 'File UUID to replace' })
  @ApiResponse({ status: 200, description: 'File replaced successfully, old version archived' })
  @ApiResponse({ status: 400, description: 'Invalid file or validation failed' })
  @ApiResponse({ status: 404, description: 'Document or file not found' })
  async replaceFile(
    @Param('id') documentId: string,
    @Param('fileId') fileId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
    @Body() body: { comment?: string },
  ) {
    if (!files || files.length === 0) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

    const file = files[0];
    const userId = req.user.id;
    const comment = body?.comment;

    // Get existing file
    const existingFile = await this.prisma.documentFile.findFirst({
      where: { id: fileId, documentId },
    });

    if (!existingFile) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    // Create version record for current file (archive it)
    await this.fileVersioningService.createVersion(
      fileId,
      userId,
      comment || `Replaced with ${file.originalname}`,
    );

    // Upload new file to storage
    const storageResult = await this.storageService.uploadFile(
      file,
      `documents/${documentId}`,
    );

    // Update file record with new data and increment version
    const updatedFile = await this.prisma.documentFile.update({
      where: { id: fileId },
      data: {
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        storagePath: storageResult.key,
        storageUrl: storageResult.url,
        hash: storageResult.hash,
        version: existingFile.version + 1,
        uploadedById: userId,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      file: updatedFile,
      previousVersion: existingFile.version,
      newVersion: updatedFile.version,
      message: 'File replaced successfully, previous version archived',
    };
  }

  @Post(':id/generate-ai')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate or regenerate AI summary, key points, and proposed response' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'AI content generated successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient text content for AI processing' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async generateAI(@Param('id') id: string, @Body() generateAIDto: GenerateAIDto) {
    return await this.fileUploadService.generateDocumentAI(id, generateAIDto.force);
  }

  @Post('generate-from-prompt')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate new document from AI prompt' })
  @ApiResponse({ status: 200, description: 'Document generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid prompt or parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateFromPrompt(
    @Body() dto: GenerateDocumentFromPromptDto,
    @Request() req,
  ) {
    return await this.aiDocumentGeneratorService.generateDocumentFromPrompt(
      dto.documentType,
      dto.prompt,
      dto.tone || 'formal',
      dto.linkedDocumentIds,
      dto.conversationHistory,
    );
  }

  @Post(':id/analyze')
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze document content with AI' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Document analyzed successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient content for analysis' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async analyzeDocument(
    @Param('id') id: string,
    @Body() dto: AnalyzeDocumentDto,
  ) {
    // Fetch document
    const document = await this.documentsService.findOne(id);

    if (!document) {
      throw new HttpException('Documento no encontrado', HttpStatus.NOT_FOUND);
    }

    // Check if document has content to analyze
    // Priority: 1) document.content, 2) aiSummary (from OCR), 3) aiProposedResponse
    const contentToAnalyze =
      document.content?.trim() ||
      document.aiSummary?.trim() ||
      document.aiProposedResponse?.trim() ||
      '';

    if (contentToAnalyze.length < 50) {
      throw new HttpException(
        'El documento no tiene suficiente contenido para analizar. Por favor, asegúrese de que el documento tenga contenido de texto o que se haya completado la extracción OCR.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Call AI analysis service
    return await this.aiDocumentGeneratorService.analyzeDocument(
      contentToAnalyze,
      dto.analysisType || 'executive_summary',
    );
  }

  // File Versioning Endpoints
  @Get('files/:fileId/versions')
  @Public()
  @ApiOperation({ summary: 'Get file version history' })
  @ApiParam({ name: 'fileId', description: 'File UUID' })
  @ApiResponse({ status: 200, description: 'Version history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFileVersions(@Param('fileId') fileId: string) {
    return this.documentsService.getFileVersions(fileId);
  }

  @Post('files/:fileId/versions/:versionNumber/restore')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @ApiOperation({ summary: 'Restore a previous file version' })
  @ApiParam({ name: 'fileId', description: 'File UUID' })
  @ApiParam({ name: 'versionNumber', description: 'Version number to restore' })
  @ApiResponse({ status: 200, description: 'Version restored successfully' })
  @ApiResponse({ status: 404, description: 'File or version not found' })
  async restoreFileVersion(
    @Param('fileId') fileId: string,
    @Param('versionNumber') versionNumber: string,
    @Body('comment') comment?: string,
  ) {
    return this.documentsService.restoreFileVersion(fileId, parseInt(versionNumber), comment);
  }

  @Get('files/:fileId/versions/:versionNumber/download')
  @Public()
  @ApiOperation({ summary: 'Download a specific file version' })
  @ApiParam({ name: 'fileId', description: 'File UUID' })
  @ApiParam({ name: 'versionNumber', description: 'Version number' })
  @ApiResponse({ status: 200, description: 'Version download URL generated successfully' })
  @ApiResponse({ status: 404, description: 'File or version not found' })
  async downloadFileVersion(
    @Param('fileId') fileId: string,
    @Param('versionNumber') versionNumber: string,
  ) {
    return this.documentsService.downloadFileVersion(fileId, parseInt(versionNumber));
  }

  // ============================================================================
  // Phase 3: Workflow Stage Endpoints
  // ============================================================================

  // Manual Entry Stamp Endpoints
  @Post(':id/manual-entry-stamp')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @UseInterceptors(FilesInterceptor('files', 1))
  @ApiOperation({ summary: 'Apply manual entry stamp to document' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Manual entry stamp applied successfully' })
  @ApiResponse({ status: 400, description: 'Bad request or document already has stamp' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async applyManualEntryStamp(
    @Param('id') documentId: string,
    @Request() req,
    @Body('entryDate') entryDate: string,
    @Body('entryTime') entryTime: string,
    @Body('notes') notes?: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const stampImageBuffer = files && files.length > 0 ? files[0].buffer : undefined;

    return this.manualEntryStampService.applyManualEntryStamp(
      documentId,
      req.user.id,
      {
        entryDate: new Date(entryDate),
        entryTime,
        stampImageBuffer,
        notes,
      },
    );
  }

  @Get(':id/manual-entry-stamp')
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  @ApiOperation({ summary: 'Get manual entry stamp information' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Manual entry stamp info retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getManualEntryStamp(@Param('id') documentId: string) {
    return this.manualEntryStampService.getManualEntryStamp(documentId);
  }

  @Get('manual-entry-stamp/stats')
  @Roles('ADMIN', 'GABINETE')
  @ApiOperation({ summary: 'Get manual entry stamp statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getManualEntryStats() {
    return this.manualEntryStampService.getManualEntryStats();
  }

  // Acknowledgment Endpoints
  @Post(':id/acknowledgment')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @UseInterceptors(FilesInterceptor('acknowledgmentFile', 1))
  @ApiOperation({ summary: 'Record document acknowledgment' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Acknowledgment recorded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request or document already acknowledged' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async recordAcknowledgment(
    @Param('id') documentId: string,
    @Request() req,
    @Body('acknowledgmentType') acknowledgmentType: 'MANUAL' | 'STAMP' | 'DIGITAL',
    @Body('acknowledgmentDate') acknowledgmentDate: string,
    @Body('acknowledgedBy') acknowledgedBy: string,
    @Body('notes') notes?: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const acknowledgmentFileBuffer = files && files.length > 0 ? files[0].buffer : undefined;

    return this.acknowledgmentService.recordAcknowledgment(
      documentId,
      req.user.id,
      {
        acknowledgmentType,
        acknowledgmentDate: new Date(acknowledgmentDate),
        acknowledgedBy,
        acknowledgmentFileBuffer,
        notes,
      },
    );
  }

  @Get(':id/acknowledgment')
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  @ApiOperation({ summary: 'Get acknowledgment information' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Acknowledgment info retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getAcknowledgment(@Param('id') documentId: string) {
    return this.acknowledgmentService.getAcknowledgment(documentId);
  }

  @Get('acknowledgment/stats')
  @Roles('ADMIN', 'GABINETE')
  @ApiOperation({ summary: 'Get acknowledgment statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getAcknowledgmentStats() {
    return this.acknowledgmentService.getAcknowledgmentStats();
  }

  // Signature Protocol Endpoints
  @Post(':id/sign')
  @Roles('ADMIN', 'GABINETE')
  @UseInterceptors(AnyFilesInterceptor())
  @ApiOperation({ summary: 'Sign document (Minister only)' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Document signed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request or document already signed' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Minister only' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async signDocument(
    @Param('id') documentId: string,
    @Request() req,
    @Body('signatureType') signatureType: 'DIGITAL' | 'PHYSICAL' | 'BOTH',
    @Body('signatureDate') signatureDate: string,
    @Body('notes') notes?: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const digitalSignatureFile = files?.find(f => f.fieldname === 'digitalSignature');
    const physicalSignatureFile = files?.find(f => f.fieldname === 'physicalSignatureScan');
    const digitalSignatureBuffer = digitalSignatureFile?.buffer;
    const physicalSignatureScanBuffer = physicalSignatureFile?.buffer;

    return this.signatureProtocolService.signDocument(
      documentId,
      req.user.id,
      {
        signatureType,
        signatureDate: new Date(signatureDate),
        digitalSignatureBuffer,
        physicalSignatureScanBuffer,
        notes,
      },
    );
  }

  @Post(':id/seal')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @UseInterceptors(FileInterceptor('sealScan'))
  @ApiOperation({ summary: 'Apply official seal to signed document' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Seal applied successfully' })
  @ApiResponse({ status: 400, description: 'Bad request or document not signed' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async applySeal(
    @Param('id') documentId: string,
    @Request() req,
    @Body('sealDate') sealDate: string,
    @Body('appliedBy') appliedBy: string,
    @Body('notes') notes?: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const sealScanBuffer = file?.buffer;

    return this.signatureProtocolService.applySeal(
      documentId,
      req.user.id,
      {
        sealDate: new Date(sealDate),
        appliedBy,
        sealScanBuffer,
        notes,
      },
    );
  }

  @Post(':id/signature-protocol/complete')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @ApiOperation({ summary: 'Complete signature protocol workflow' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Signature protocol completed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - signature or seal missing' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async completeSignatureProtocol(
    @Param('id') documentId: string,
    @Request() req,
  ) {
    return this.signatureProtocolService.completeSignatureProtocol(documentId, req.user.id);
  }

  @Get(':id/signature')
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  @ApiOperation({ summary: 'Get signature information' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Signature info retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getSignatureInfo(@Param('id') documentId: string) {
    return this.signatureProtocolService.getSignatureInfo(documentId);
  }

  @Get(':id/signature/ready')
  @Roles('ADMIN', 'GABINETE', 'REVISOR', 'LECTOR')
  @ApiOperation({ summary: 'Check if document is ready for signature' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Ready status retrieved successfully' })
  async isReadyForSignature(@Param('id') documentId: string) {
    const isReady = await this.signatureProtocolService.isReadyForSignature(documentId);
    return { isReady };
  }

  @Get('signature/stats')
  @Roles('ADMIN', 'GABINETE')
  @ApiOperation({ summary: 'Get signature statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getSignatureStats() {
    return this.signatureProtocolService.getSignatureStats();
  }

  @Post('from-template')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @ApiOperation({
    summary: 'Create document from template',
    description: 'Creates a new document by replacing template variables with provided values and generating a PDF',
  })
  @ApiResponse({ status: 201, description: 'Document created successfully from template' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 400, description: 'Invalid template or missing variables' })
  async createFromTemplate(
    @Body() dto: CreateDocumentFromTemplateDto,
    @Request() req,
  ) {
    return this.documentsService.createFromTemplate(dto, req.user.id);
  }
}
