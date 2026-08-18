import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessHoursService } from '../common/utils/business-hours.util';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/create-notification.dto';
import { addHours, subHours } from 'date-fns';

/**
 * Reminder Scheduler Service
 *
 * Client Requirements:
 * - "Solo en horario laboral" (Only during business hours)
 * - "Un solo recordatorio 24 horas después de la fecha límite" (Single reminder 24h after deadline)
 * - Business hours: 8 AM - 6 PM, Monday-Friday
 * - No reminders on weekends or holidays
 */
@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private businessHours: BusinessHoursService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Check for documents needing reminders
   * Runs every hour during business hours (8 AM - 6 PM, Mon-Fri)
   *
   * Cron pattern: '0 8-18 * * 1-5'
   * - 0: At minute 0 (top of the hour)
   * - 8-18: Hours 8 through 18 (8 AM to 6 PM)
   * - *: Every day of month
   * - *: Every month
   * - 1-5: Monday through Friday
   */
  @Cron('0 8-18 * * 1-5', {
    name: 'check-document-reminders',
    timeZone: 'Africa/Malabo', // Guinea Ecuatorial timezone
  })
  async checkDeadlineReminders() {
    // Double-check business hours (safety check)
    if (!this.businessHours.shouldSendReminderNow()) {
      this.logger.log('Outside business hours, skipping reminder check');
      return {
        message: 'Not business hours, reminders not sent',
        sent: 0,
      };
    }

    this.logger.log('Starting deadline reminder check...');

    const now = new Date();
    const twentyFourHoursAgo = subHours(now, 24);
    const twentyFiveHoursAgo = subHours(now, 25);

    // Find documents with deadline expired 24h ago (within 1-hour window)
    // Single reminder only (remindersSent = 0)
    const documentsNeedingReminders = await this.prisma.document.findMany({
      where: {
        responseDeadline: {
          gte: twentyFiveHoursAgo,
          lt: twentyFourHoursAgo,
        },
        remindersSent: 0, // Only one reminder per document
        responseReceived: false,
        requiresResponse: true,
      },
      include: {
        responsible: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        entity: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(
      `Found ${documentsNeedingReminders.length} documents needing reminders`,
    );

    const remindersSent = [];
    const remindersFailed = [];

    for (const doc of documentsNeedingReminders) {
      try {
        await this.sendDocumentReminder(doc);
        remindersSent.push(doc.id);

        // Update document reminder count
        await this.prisma.document.update({
          where: { id: doc.id },
          data: {
            remindersSent: 1,
            lastReminderSentAt: new Date(),
          },
        });

        this.logger.log(
          `Reminder sent for document ${doc.correlativeNumber} (${doc.id})`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send reminder for document ${doc.id}: ${error.message}`,
        );
        remindersFailed.push({
          documentId: doc.id,
          error: error.message,
        });
      }
    }

    const result = {
      message: `Reminder check completed`,
      total: documentsNeedingReminders.length,
      sent: remindersSent.length,
      failed: remindersFailed.length,
      documentIds: remindersSent,
      errors: remindersFailed,
    };

    this.logger.log(
      `Reminder check complete: ${remindersSent.length} sent, ${remindersFailed.length} failed`,
    );

    return result;
  }

  /**
   * Send reminder for a specific document
   */
  private async sendDocumentReminder(document: any) {
    // Determine recipients
    const recipients: string[] = [];

    // Add responsible user
    if (document.responsible?.email) {
      recipients.push(document.responsible.email);
    }

    if (recipients.length === 0) {
      throw new Error('No recipients found for reminder');
    }

    // Create reminder log
    const recipientIds = [];
    if (document.responsibleId) recipientIds.push(document.responsibleId);

    await this.prisma.reminderLog.create({
      data: {
        documentId: document.id,
        reminderType: 'RESPONSE',
        recipientIds,
        method: 'EMAIL',
      },
    });

    // Send email notifications
    const subject = `Recordatorio: Respuesta Pendiente - ${document.correlativeNumber}`;
    const message = this.buildReminderMessage(document);

    for (const email of recipients) {
      try{
        await this.notifications.sendEmailNotification(
          email,
          subject,
          message,
        );
      } catch (error) {
        this.logger.error(`Failed to send email to ${email}: ${error.message}`);
        // Continue sending to other recipients
      }
    }

    // Create in-app notifications
    for (const recipientId of recipientIds) {
      await this.notifications.create({
        userId: recipientId,
        type: NotificationType.DEADLINE_REMINDER,
        title: 'Recordatorio: Respuesta Pendiente',
        message: `El documento ${document.correlativeNumber} requiere su respuesta. La fecha límite ha pasado.`,
        relatedId: document.id,
        relatedType: 'document',
      });
    }
  }

  /**
   * Build reminder email message (plain text)
   */
  private buildReminderMessage(document: any): string {
    const deadline = new Date(document.responseDeadline).toLocaleDateString(
      'es-ES',
    );

    return `
Estimado/a,

Este es un recordatorio de que el siguiente documento requiere su respuesta:

Documento: ${document.correlativeNumber}
Título: ${document.title}
Fecha límite: ${deadline}
Estado: Respuesta pendiente

Por favor, revise y responda a este documento lo antes posible.

---
Sistema de Gestión Documental
Ministerio de Transporte, Tecnología, Correos y Telecomunicaciones
República de Guinea Ecuatorial
    `.trim();
  }

  /**
   * Build reminder email HTML
   */
  private buildReminderHtml(document: any): string {
    const deadline = new Date(document.responseDeadline).toLocaleDateString(
      'es-ES',
    );

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #1a56db; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9fafb; padding: 20px; margin: 20px 0; }
    .document-info { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #1a56db; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; padding: 20px; }
    .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Recordatorio de Respuesta Pendiente</h1>
    </div>

    <div class="content">
      <p>Estimado/a,</p>

      <p>Este es un recordatorio de que el siguiente documento requiere su respuesta:</p>

      <div class="document-info">
        <p><strong>Documento:</strong> ${document.correlativeNumber}</p>
        <p><strong>Título:</strong> ${document.title}</p>
        <p><strong>Fecha límite:</strong> ${deadline}</p>
        <p><strong>Estado:</strong> ⚠️ Respuesta pendiente</p>
      </div>

      <div class="warning">
        <strong>⚠️ Atención:</strong> La fecha límite para responder a este documento ha pasado.
        Por favor, revise y responda lo antes posible.
      </div>

      <p>Puede acceder al documento en el sistema de gestión documental.</p>
    </div>

    <div class="footer">
      <p>Sistema de Gestión Documental</p>
      <p>Ministerio de Transporte, Tecnología, Correos y Telecomunicaciones</p>
      <p>República de Guinea Ecuatorial</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Manual trigger for testing (can be called via API endpoint)
   */
  async triggerReminderCheck() {
    this.logger.log('Manual reminder check triggered');
    return this.checkDeadlineReminders();
  }

  /**
   * Get reminder statistics
   */
  async getReminderStats() {
    const totalReminders = await this.prisma.reminderLog.count();
    const remindersToday = await this.prisma.reminderLog.count({
      where: {
        sentAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    const documentsWithReminders = await this.prisma.document.count({
      where: {
        remindersSent: {
          gt: 0,
        },
      },
    });

    const documentsNeedingReminder = await this.prisma.document.count({
      where: {
        responseDeadline: {
          lt: new Date(),
        },
        remindersSent: 0,
        responseReceived: false,
        requiresResponse: true,
      },
    });

    return {
      totalReminders,
      remindersToday,
      documentsWithReminders,
      documentsNeedingReminder,
    };
  }
}
