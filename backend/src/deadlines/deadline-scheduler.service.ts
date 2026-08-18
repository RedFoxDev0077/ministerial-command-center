import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DeadlineStatus, Priority } from '@prisma/client';
import { NotificationType } from '../notifications/dto/create-notification.dto';

@Injectable()
export class DeadlineSchedulerService {
  private readonly logger = new Logger(DeadlineSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Run every hour to check for overdue deadlines and send notifications.
   * Each deadline gets AT MOST one notification per type per 23 hours.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkDeadlines() {
    this.logger.log('Running deadline check cron job');

    try {
      await this.updateOverdueDeadlines();
      await this.sendUpcomingDeadlineNotifications();
      await this.sendOverdueDeadlineNotifications();
      this.logger.log('Deadline check completed successfully');
    } catch (error) {
      this.logger.error(`Error in deadline check: ${error.message}`, error.stack);
    }
  }

  /**
   * Update deadlines that have passed their due date to OVERDUE status.
   */
  private async updateOverdueDeadlines() {
    const now = new Date();

    const result = await this.prisma.deadline.updateMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: [DeadlineStatus.COMPLETED, DeadlineStatus.OVERDUE] },
      },
      data: { status: DeadlineStatus.OVERDUE },
    });

    if (result.count > 0) {
      this.logger.log(`Updated ${result.count} deadlines to OVERDUE status`);
    }

    return result;
  }

  /**
   * Send ONE notification per upcoming deadline per day.
   * A deadline is "upcoming" when it is due within 24 hours.
   * Guard: skip if a DEADLINE_REMINDER notification was already sent
   * for this deadline in the last 23 hours.
   */
  private async sendUpcomingDeadlineNotifications() {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twentyThreeHoursAgo = new Date(now.getTime() - 23 * 60 * 60 * 1000);

    const upcomingDeadlines = await this.prisma.deadline.findMany({
      where: {
        dueDate: { gte: now, lte: tomorrow },
        status: { notIn: [DeadlineStatus.COMPLETED, DeadlineStatus.OVERDUE] },
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            correlativeNumber: true,
            responsible: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        expediente: { select: { id: true, code: true, title: true } },
      },
    });

    let sent = 0;
    for (const deadline of upcomingDeadlines) {
      try {
        const userToNotify = deadline.document?.responsible?.id;
        if (!userToNotify) continue;

        // ── GUARD: skip if already notified in the last 23 h ──────────────
        const alreadySent = await this.prisma.notification.findFirst({
          where: {
            relatedId: deadline.id,
            relatedType: 'deadline',
            type: 'DEADLINE_REMINDER' as any,
            createdAt: { gte: twentyThreeHoursAgo },
          },
        });
        if (alreadySent) {
          this.logger.debug(
            `Upcoming reminder already sent for deadline ${deadline.id}, skipping`,
          );
          continue;
        }
        // ──────────────────────────────────────────────────────────────────

        const hoursUntilDue = Math.round(
          (deadline.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60),
        );
        const priorityEmoji = this.getPriorityEmoji(deadline.priority);
        const relatedName = deadline.document
          ? `Documento: ${deadline.document.correlativeNumber}`
          : deadline.expediente
          ? `Expediente: ${deadline.expediente.code}`
          : '';

        await this.notificationsService.create({
          userId: userToNotify,
          type: NotificationType.DEADLINE_REMINDER,
          title: `${priorityEmoji} Plazo próximo a vencer`,
          message: `${deadline.title}\n${relatedName}\nVence en ${hoursUntilDue} horas`,
          relatedId: deadline.id,
          relatedType: 'deadline',
        });

        sent++;
        this.logger.log(`Sent upcoming deadline notification for: ${deadline.title}`);
      } catch (error) {
        this.logger.error(
          `Failed to send notification for deadline ${deadline.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Sent ${sent} upcoming deadline notifications (${upcomingDeadlines.length - sent} skipped — already sent)`);
  }

  /**
   * Send ONE notification per overdue deadline per day.
   * Guard: skip if a DEADLINE_OVERDUE notification was already sent
   * for this deadline in the last 23 hours.
   */
  private async sendOverdueDeadlineNotifications() {
    const now = new Date();
    const twentyThreeHoursAgo = new Date(now.getTime() - 23 * 60 * 60 * 1000);

    const overdueDeadlines = await this.prisma.deadline.findMany({
      where: { status: DeadlineStatus.OVERDUE },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            correlativeNumber: true,
            responsible: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        expediente: { select: { id: true, code: true, title: true } },
      },
    });

    let sent = 0;
    for (const deadline of overdueDeadlines) {
      try {
        const userToNotify = deadline.document?.responsible?.id;
        if (!userToNotify) continue;

        // ── GUARD: skip if already notified in the last 23 h ──────────────
        const alreadySent = await this.prisma.notification.findFirst({
          where: {
            relatedId: deadline.id,
            relatedType: 'deadline',
            type: 'DEADLINE_OVERDUE' as any,
            createdAt: { gte: twentyThreeHoursAgo },
          },
        });
        if (alreadySent) {
          this.logger.debug(
            `Overdue notification already sent for deadline ${deadline.id}, skipping`,
          );
          continue;
        }
        // ──────────────────────────────────────────────────────────────────

        const daysOverdue = Math.floor(
          (now.getTime() - deadline.dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        const priorityEmoji = this.getPriorityEmoji(deadline.priority);
        const relatedName = deadline.document
          ? `Documento: ${deadline.document.correlativeNumber}`
          : deadline.expediente
          ? `Expediente: ${deadline.expediente.code}`
          : '';

        await this.notificationsService.create({
          userId: userToNotify,
          type: NotificationType.DEADLINE_OVERDUE,
          title: `🔴 ${priorityEmoji} Plazo vencido`,
          message: `${deadline.title}\n${relatedName}\nVencido hace ${daysOverdue} día${daysOverdue !== 1 ? 's' : ''}`,
          relatedId: deadline.id,
          relatedType: 'deadline',
        });

        sent++;
        this.logger.log(`Sent overdue notification for: ${deadline.title}`);
      } catch (error) {
        this.logger.error(
          `Failed to send overdue notification for deadline ${deadline.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Sent ${sent} overdue notifications (${overdueDeadlines.length - sent} skipped — already sent today)`);
  }

  /**
   * Get emoji for deadline priority.
   */
  private getPriorityEmoji(priority: Priority): string {
    const emojiMap = {
      [Priority.LOW]: '🟢',
      [Priority.MEDIUM]: '🟡',
      [Priority.HIGH]: '🟠',
      [Priority.URGENT]: '🔴',
    };
    return emojiMap[priority] || '⚪';
  }

  /**
   * Manual trigger for testing — callable via API endpoint.
   */
  async manualDeadlineCheck() {
    this.logger.log('Manual deadline check triggered');
    return this.checkDeadlines();
  }
}
