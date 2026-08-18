import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EmailModule } from './email/email.module';
import { WebSocketModule } from './websocket/websocket.module';
import { StorageModule } from './storage/storage.module';
import { OcrModule } from './ocr/ocr.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { EntitiesModule } from './entities/entities.module';
import { DocumentsModule } from './documents/documents.module';
import { FilesModule } from './files/files.module';
import { DeadlinesModule } from './deadlines/deadlines.module';
import { ExpedientesModule } from './expedientes/expedientes.module';
import { WorkflowModule } from './workflow/workflow.module';
import { AssistantModule } from './assistant/assistant.module';
import { SignatureFlowsModule } from './signature-flows/signature-flows.module';
import { TemplatesModule } from './templates/templates.module';
import { ArticlesModule } from './articles/articles.module';
import { AgendaModule } from './agenda/agenda.module';
import { MultimediaModule } from './multimedia/multimedia.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AppController } from './app.controller';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Task scheduling for cron jobs
    ScheduleModule.forRoot(),
    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    // Database
    PrismaModule,
    // Audit (Global)
    AuditModule,
    // Notifications (Global)
    NotificationsModule,
    // Email Service (Global)
    EmailModule,
    // WebSocket (Global)
    WebSocketModule,
    // Storage Service (Global - R2/S3)
    StorageModule,
    // OCR Service (Global - Text extraction + AI)
    OcrModule,
    // Feature modules
    AuthModule,
    UsersModule,
    DepartmentsModule,
    EntitiesModule,
    DocumentsModule,
    FilesModule,
    DeadlinesModule,
    ExpedientesModule,
    // Workflow System (Global)
    WorkflowModule,
    // Virtual Assistant (Global)
    AssistantModule,
    // Signature Flows
    SignatureFlowsModule,
    // Document Templates
    TemplatesModule,
    // Content Articles
    ArticlesModule,
    // Institutional Agenda
    AgendaModule,
    // Multimedia Processing
    MultimediaModule,
    // WhatsApp Chatbot
    WhatsappModule,
  ],
  controllers: [AppController],
  providers: [
    // Authenticate by default. Controllers keep their own @UseGuards for role
    // checks, but this makes a newly added controller protected unless it
    // explicitly opts out with @Public() — rather than open by default.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [],
})
export class AppModule {}
