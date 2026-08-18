import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto, NotificationType } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { createPaginatedResponse, calculateSkip } from '../documents/utils/pagination.util';
import { Prisma } from '@prisma/client';
import { WebSocketService } from '../websocket/websocket.service';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor(
    private prisma: PrismaService,
    private websocketService: WebSocketService,
    private configService: ConfigService,
  ) {
    this.initializeEmailTransporter();
  }

  /**
   * Initialize email transporter based on environment configuration
   */
  private initializeEmailTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const sendgridKey = this.configService.get<string>('SENDGRID_API_KEY');

    if (sendgridKey) {
      // Use SendGrid
      this.emailTransporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: sendgridKey,
        },
      });
      this.logger.log('Email transporter initialized with SendGrid');
    } else if (smtpHost) {
      // Use custom SMTP
      this.emailTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(this.configService.get<string>('SMTP_PORT', '587')),
        secure: this.configService.get<string>('SMTP_SECURE') === 'true',
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
      this.logger.log('Email transporter initialized with custom SMTP');
    } else {
      this.logger.warn('Email transporter not configured - emails will be logged only');
    }
  }

  /**
   * Create a notification
   */
  async create(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type as any,
        title: dto.title,
        message: dto.message,
        relatedId: dto.relatedId,
        relatedType: dto.relatedType,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Send real-time WebSocket notification
    this.websocketService.sendNotificationToUser(dto.userId, {
      type: this.mapNotificationTypeToWebSocket(dto.type),
      documentId: dto.relatedId || null,
      title: dto.title,
      message: dto.message,
      timestamp: notification.createdAt,
      metadata: {
        notificationId: notification.id,
        relatedType: dto.relatedType,
      },
    });

    return notification;
  }

  /**
   * Create bulk notifications (for decree operations)
   */
  async createBulk(dtos: CreateNotificationDto[]) {
    const notifications = await this.prisma.notification.createMany({
      data: dtos.map((dto) => ({
        userId: dto.userId,
        type: dto.type as any,
        title: dto.title,
        message: dto.message,
        relatedId: dto.relatedId,
        relatedType: dto.relatedType,
      })),
    });

    return notifications;
  }

  /**
   * Get all notifications for a user with pagination
   */
  async findAll(userId: string, queryDto: QueryNotificationDto) {
    const { page = 1, limit = 20, ...filters } = queryDto;

    const where: Prisma.NotificationWhereInput = {
      userId,
    };

    if (filters.type) {
      where.type = filters.type as any;
    }

    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    const skip = calculateSkip(page, limit);

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return createPaginatedResponse(notifications, { total, page, limit });
  }

  /**
   * Get unread notification count for a user (excluding muted)
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
        isMuted: false, // Exclude muted notifications from count
      },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mute a notification
   */
  async muteNotification(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isMuted: true,
        mutedAt: new Date(),
      },
    });
  }

  /**
   * Unmute a notification
   */
  async unmuteNotification(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isMuted: false,
        mutedAt: null,
      },
    });
  }

  /**
   * Mute all notifications for a user
   */
  async muteAllNotifications(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isMuted: false,
      },
      data: {
        isMuted: true,
        mutedAt: new Date(),
      },
    });
  }

  /**
   * Delete a notification
   */
  async remove(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    return { message: 'Notification deleted successfully' };
  }

  /**
   * Delete all read notifications for a user
   */
  async removeAllRead(userId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: {
        userId,
        isRead: true,
      },
    });

    return { message: `${result.count} read notifications deleted` };
  }

  /**
   * Send email notification (placeholder for actual email service)
   */
  async sendEmailNotification(email: string, subject: string, message: string) {
    const emailFrom = this.configService.get<string>('EMAIL_FROM', 'noreply@mttsia.gob.gq');

    if (this.emailTransporter) {
      try {
        const info = await this.emailTransporter.sendMail({
          from: emailFrom,
          to: email,
          subject: subject,
          text: message,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #3B82F6; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">Ministerio de Transporte</h1>
              </div>
              <div style="padding: 20px; background-color: #f9f9f9;">
                <h2 style="color: #333;">${subject}</h2>
                <p style="color: #666; line-height: 1.6;">${message}</p>
              </div>
              <div style="padding: 10px; text-align: center; color: #999; font-size: 12px;">
                <p>Este es un mensaje automático del Sistema de Gestión Ministerial</p>
              </div>
            </div>
          `,
        });
        this.logger.log(`Email sent successfully to ${email}: ${info.messageId}`);
        return { sent: true, method: 'email', messageId: info.messageId };
      } catch (error) {
        this.logger.error(`Failed to send email to ${email}:`, error.message);
        return { sent: false, method: 'email', error: error.message };
      }
    } else {
      // Fallback to console logging if not configured
      this.logger.log(`[EMAIL - NOT CONFIGURED] To: ${email}, Subject: ${subject}, Message: ${message}`);
      return { sent: false, method: 'email', error: 'Email service not configured' };
    }
  }

  /**
   * Send email with a PDF attachment (used for external decree delivery)
   */
  async sendEmailWithPdfAttachment(
    to: string,
    subject: string,
    htmlBody: string,
    pdfBuffer: Buffer,
    pdfFilename: string,
  ): Promise<{ sent: boolean; error?: string }> {
    const emailFrom = this.configService.get<string>('EMAIL_FROM', 'noreply@mttsia.gob.gq');
    if (!this.emailTransporter) {
      this.logger.warn(`[EMAIL - NOT CONFIGURED] Would send "${subject}" with PDF to ${to}`);
      return { sent: false, error: 'Email service not configured' };
    }
    try {
      const info = await this.emailTransporter.sendMail({
        from: emailFrom,
        to,
        subject,
        html: htmlBody,
        attachments: [{ filename: pdfFilename, content: pdfBuffer, contentType: 'application/pdf' }],
      });
      this.logger.log(`Email with PDF sent to ${to}: ${info.messageId}`);
      return { sent: true };
    } catch (error) {
      this.logger.error(`Failed to send email with PDF to ${to}: ${error.message}`);
      return { sent: false, error: error.message };
    }
  }

  /**
   * Send WhatsApp notification via Twilio
   * NOTE: WhatsApp integration requires installing twilio package separately:
   *       cd backend && npm install twilio
   * Then uncomment the implementation below.
   */
  async sendWhatsAppNotification(phone: string, message: string) {
    // WhatsApp implementation commented out - install twilio package to enable
    // Uncomment the code below after running: npm install twilio
    /*
    const twilioSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const twilioToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const twilioWhatsappFrom = this.configService.get<string>('TWILIO_WHATSAPP_FROM');

    if (twilioSid && twilioToken && twilioWhatsappFrom) {
      try {
        const twilio = await import('twilio');
        const client = twilio.default(twilioSid, twilioToken);

        const whatsappMessage = await client.messages.create({
          body: message,
          from: `whatsapp:${twilioWhatsappFrom}`,
          to: `whatsapp:${phone}`,
        });

        this.logger.log(`WhatsApp message sent successfully to ${phone}: ${whatsappMessage.sid}`);
        return { sent: true, method: 'whatsapp', messageId: whatsappMessage.sid };
      } catch (error) {
        this.logger.error(`Failed to send WhatsApp message to ${phone}:`, error.message);
        return { sent: false, method: 'whatsapp', error: error.message };
      }
    }
    */

    // Fallback to console logging (WhatsApp not implemented)
    this.logger.log(`[WHATSAPP - NOT IMPLEMENTED] To: ${phone}, Message: ${message}`);
    this.logger.warn('To enable WhatsApp: Install twilio package and uncomment code in notifications.service.ts');
    return { sent: false, method: 'whatsapp', error: 'WhatsApp service not implemented' };
  }

  /**
   * Helper: Notify document decree
   */
  async notifyDocumentDecree(
    documentId: string,
    documentTitle: string,
    departmentUserIds: string[],
    sendMethod: 'EMAIL' | 'WHATSAPP' | 'BOTH' = 'EMAIL',
  ) {
    const notifications: CreateNotificationDto[] = departmentUserIds.map((userId) => ({
      userId,
      type: NotificationType.DOCUMENT_DECREED,
      title: 'Documento Decretado',
      message: `Se ha decretado el documento: ${documentTitle}`,
      relatedId: documentId,
      relatedType: 'document',
    }));

    // Create in-app notifications
    await this.createBulk(notifications);

    // Send real-time WebSocket notifications
    departmentUserIds.forEach((userId) => {
      this.websocketService.sendNotificationToUser(userId, {
        type: 'DOCUMENT_DECREED',
        documentId: documentId,
        title: 'Documento Decretado',
        message: `Se ha decretado el documento: ${documentTitle}`,
        timestamp: new Date(),
        metadata: {
          relatedType: 'document',
        },
      });
    });

    // Send external notifications if requested
    if (sendMethod === 'EMAIL' || sendMethod === 'BOTH') {
      const users = await this.prisma.user.findMany({
        where: { id: { in: departmentUserIds } },
        select: { email: true, firstName: true },
      });

      for (const user of users) {
        await this.sendEmailNotification(
          user.email,
          'Documento Decretado',
          `Hola ${user.firstName}, se ha decretado un nuevo documento: ${documentTitle}`,
        );
      }
    }

    if (sendMethod === 'WHATSAPP' || sendMethod === 'BOTH') {
      const users = await this.prisma.user.findMany({
        where: { id: { in: departmentUserIds } },
        select: { phone: true, firstName: true },
      });

      for (const user of users) {
        if (user.phone) {
          await this.sendWhatsAppNotification(
            user.phone,
            `Hola ${user.firstName}, se ha decretado un nuevo documento: ${documentTitle}`,
          );
        }
      }
    }

    return { notificationsSent: departmentUserIds.length };
  }

  /**
   * Map NotificationType to WebSocket notification type
   */
  private mapNotificationTypeToWebSocket(type: NotificationType): any {
    const mapping = {
      [NotificationType.DOCUMENT_DECREED]: 'DOCUMENT_DECREED',
      [NotificationType.DOCUMENT_ASSIGNED]: 'DOCUMENT_ASSIGNED',
      [NotificationType.STATUS_CHANGED]: 'STATUS_CHANGED',
      [NotificationType.COMMENT_ADDED]: 'COMMENT_ADDED',
      [NotificationType.SIGNATURE_REQUIRED]: 'SIGNATURE_REQUIRED',
      [NotificationType.DEADLINE_REMINDER]: 'DEADLINE_REMINDER',
    };
    return mapping[type] || 'DOCUMENT_DECREED';
  }
}
