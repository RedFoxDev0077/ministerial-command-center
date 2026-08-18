import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkflowStageService } from './workflow-stage.service';
import { DocumentWorkflowService } from './document-workflow.service';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { WorkflowController } from './workflow.controller';
import { MinisterValidationService } from '../auth/minister-validation.service';
import { BusinessHoursService } from '../common/utils/business-hours.util';

/**
 * Workflow Module
 *
 * Provides workflow management services:
 * - WorkflowStageService: Individual stage operations
 * - DocumentWorkflowService: Overall workflow lifecycle
 * - ReminderSchedulerService: Automated reminder system (cron job)
 * - MinisterValidationService: Minister-only signature validation
 * - BusinessHoursService: Business hours calculations
 * - WorkflowController: API endpoints for workflow operations
 */
@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [WorkflowController],
  providers: [
    WorkflowStageService,
    DocumentWorkflowService,
    ReminderSchedulerService,
    MinisterValidationService,
    BusinessHoursService,
  ],
  exports: [
    WorkflowStageService,
    DocumentWorkflowService,
    ReminderSchedulerService,
    MinisterValidationService,
    BusinessHoursService,
  ],
})
export class WorkflowModule {}
