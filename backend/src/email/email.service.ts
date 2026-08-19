import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

export interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly appUrl: string;
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    this.fromEmail =
      this.configService.get<string>('EMAIL_FROM') ||
      this.configService.get<string>('FROM_EMAIL') ||
      'noreply@patologias.micasaverde.es';
    this.fromName =
      this.configService.get<string>('FROM_NAME') ||
      'Centro de Comando Ministerial';
    this.appUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:8080';

    this.initTransporter();
  }

  private initTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(this.configService.get<string>('SMTP_PORT', '587')),
        secure: this.configService.get<string>('SMTP_SECURE') === 'true',
        auth: { user, pass },
      });
      this.logger.log(`Email service initialized (SMTP: ${host})`);
    } else {
      this.logger.warn('Email service not configured — emails will be logged only');
    }
  }

  private loadTemplate(templateName: string, context: Record<string, any>): string {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);
    try {
      let template = fs.readFileSync(templatePath, 'utf-8');
      Object.keys(context).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        template = template.replace(regex, context[key] || '');
      });
      return template;
    } catch {
      return this.getPlainTextFallback(context);
    }
  }

  private getPlainTextFallback(context: Record<string, any>): string {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1e3a5f;color:white;padding:20px;text-align:center;">
          <h2 style="margin:0;">Centro de Comando Ministerial</h2>
        </div>
        <div style="padding:20px;">
          <p>${context.message || context.title || JSON.stringify(context)}</p>
          <p><a href="${this.appUrl}">Acceder al sistema</a></p>
        </div>
      </div>
    `;
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const html = this.loadTemplate(options.template, options.context);
    if (!this.transporter) {
      this.logger.log(`[EMAIL NOT CONFIGURED] To: ${options.to} | Subject: ${options.subject}`);
      return;
    }
    try {
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html,
        text: options.context.message || options.context.title || options.subject,
      });
      this.logger.log(`Email sent to ${options.to}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}: ${error.message}`);
      throw error;
    }
  }

  async sendDocumentDecreeDEmail(data: {
    to: string; userName: string; correlativeNumber: string;
    documentTitle: string; entityName: string; priority: string; documentUrl: string;
  }): Promise<void> {
    await this.sendEmail({
      to: data.to,
      subject: `Documento Decretado - ${data.correlativeNumber}`,
      template: 'document-decreed',
      context: { ...data, appUrl: this.appUrl },
    });
  }

  async sendDocumentAssignedEmail(data: {
    to: string; userName: string; correlativeNumber: string;
    documentTitle: string; assignedBy: string; priority: string; documentUrl: string;
  }): Promise<void> {
    await this.sendEmail({
      to: data.to,
      subject: `Documento Asignado - ${data.correlativeNumber}`,
      template: 'document-assigned',
      context: data,
    });
  }

  async sendStatusChangedEmail(data: {
    to: string; userName: string; correlativeNumber: string;
    documentTitle: string; oldStatus: string; newStatus: string; documentUrl: string;
  }): Promise<void> {
    await this.sendEmail({
      to: data.to,
      subject: `Estado del Documento Actualizado - ${data.correlativeNumber}`,
      template: 'status-changed',
      context: data,
    });
  }

  async sendCommentAddedEmail(data: {
    to: string; userName: string; correlativeNumber: string;
    documentTitle: string; commenterName: string; comment: string; documentUrl: string;
  }): Promise<void> {
    await this.sendEmail({
      to: data.to,
      subject: `Nuevo Comentario - ${data.correlativeNumber}`,
      template: 'comment-added',
      context: data,
    });
  }

  async sendSignatureRequiredEmail(data: {
    to: string; userName: string; correlativeNumber: string;
    documentTitle: string; deadline: string; documentUrl: string;
  }): Promise<void> {
    await this.sendEmail({
      to: data.to,
      subject: `Firma Requerida - ${data.correlativeNumber}`,
      template: 'signature-required',
      context: data,
    });
  }

  async sendDeadlineReminderEmail(data: {
    to: string; userName: string; correlativeNumber: string;
    documentTitle: string; deadline: string; hoursRemaining: number; documentUrl: string;
  }): Promise<void> {
    await this.sendEmail({
      to: data.to,
      subject: `Recordatorio de Plazo - ${data.correlativeNumber}`,
      template: 'deadline-reminder',
      context: data,
    });
  }

  async sendWelcomeEmail(data: {
    to: string; userName: string; email: string;
    temporaryPassword?: string; loginUrl: string;
  }): Promise<void> {
    await this.sendEmail({
      to: data.to,
      subject: 'Bienvenido al Centro de Comando Ministerial',
      template: 'welcome',
      context: data,
    });
  }
}
