import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PdfService } from './pdf.service';
import { FileUploadService } from './file-upload.service';
import { QrService } from './qr.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { OcrModule } from '../ocr/ocr.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FilesModule } from '../files/files.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { CorrelativeNumberService } from './utils/correlative-number.util';
import { DocumentNumberingService } from './document-numbering.service';
import { OfficialPdfTemplateService } from './official-pdf-template.service';
import { DecreeAnnotationsService } from './decree-annotations.service';
import { ManualEntryStampService } from './manual-entry-stamp.service';
import { AcknowledgmentService } from './acknowledgment.service';
import { SignatureProtocolService } from './signature-protocol.service';
import { AIDocumentGeneratorService } from './ai-document-generator.service';
import { OfficialWordTemplateService } from './official-word-template.service';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    OcrModule,
    AuditModule,
    NotificationsModule,
    FilesModule,
    WorkflowModule,
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    PdfService,
    FileUploadService,
    QrService,
    CorrelativeNumberService,
    DocumentNumberingService,
    OfficialPdfTemplateService,
    DecreeAnnotationsService,
    ManualEntryStampService,
    AcknowledgmentService,
    SignatureProtocolService,
    AIDocumentGeneratorService,
    OfficialWordTemplateService,
  ],
  exports: [
    DocumentsService,
    FileUploadService,
    DocumentNumberingService,
    OfficialPdfTemplateService,
    DecreeAnnotationsService,
    ManualEntryStampService,
    AcknowledgmentService,
    SignatureProtocolService,
  ],
})
export class DocumentsModule {}
