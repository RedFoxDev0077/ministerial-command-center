import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkflowStageService } from './workflow-stage.service';
import { DocumentWorkflowService } from './document-workflow.service';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { MinisterValidationService } from '../auth/minister-validation.service';
import {
  AdvanceStageDto,
  SkipStageDto,
  UpdateStageDto,
  CreateDecreeDto,
} from './dto';

/**
 * Workflow Controller
 *
 * Manages document workflow operations:
 * - Workflow initialization and status
 * - Stage transitions and updates
 * - Decree deadlines (configurable)
 * - Stage skipping (admin only)
 * - Reminder management
 */
@ApiTags('workflow')
@Controller('api/workflow')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowController {
  constructor(
    private workflowStageService: WorkflowStageService,
    private documentWorkflowService: DocumentWorkflowService,
    private reminderScheduler: ReminderSchedulerService,
    private ministerValidation: MinisterValidationService,
  ) {}

  // ==================== Workflow Status ====================

  @Get('documents/:documentId/status')
  @ApiOperation({ summary: 'Get workflow status for a document' })
  @ApiResponse({ status: 200, description: 'Workflow status retrieved' })
  async getWorkflowStatus(@Param('documentId') documentId: string) {
    return this.documentWorkflowService.getWorkflowStatus(documentId);
  }

  @Post('documents/:documentId/initialize')
  @ApiOperation({ summary: 'Initialize workflow for a document' })
  @ApiResponse({ status: 201, description: 'Workflow initialized' })
  async initializeWorkflow(@Param('documentId') documentId: string) {
    return this.documentWorkflowService.initializeWorkflow(documentId);
  }

  @Get('documents/:documentId/stages')
  @ApiOperation({ summary: 'Get all workflow stages for a document' })
  @ApiResponse({ status: 200, description: 'Stages retrieved' })
  async getDocumentStages(@Param('documentId') documentId: string) {
    return this.workflowStageService.getDocumentStages(documentId);
  }

  @Get('documents/:documentId/current-stage')
  @ApiOperation({ summary: 'Get current active stage for a document' })
  @ApiResponse({ status: 200, description: 'Current stage retrieved' })
  async getCurrentStage(@Param('documentId') documentId: string) {
    return this.workflowStageService.getCurrentStage(documentId);
  }

  // ==================== Stage Transitions ====================

  @Post('documents/:documentId/advance')
  @ApiOperation({ summary: 'Advance document to next workflow stage' })
  @ApiResponse({ status: 200, description: 'Document advanced to next stage' })
  async advanceToNextStage(
    @Param('documentId') documentId: string,
    @Request() req,
    @Body() advanceDto?: AdvanceStageDto,
  ) {
    return this.documentWorkflowService.advanceToNextStage(
      documentId,
      req.user.id,
      advanceDto,
    );
  }

  @Post('stages/:stageId/start')
  @ApiOperation({ summary: 'Mark stage as in progress' })
  @ApiResponse({ status: 200, description: 'Stage started' })
  async startStage(@Param('stageId') stageId: string) {
    return this.workflowStageService.startStage(stageId);
  }

  @Post('stages/:stageId/complete')
  @ApiOperation({ summary: 'Mark stage as completed' })
  @ApiResponse({ status: 200, description: 'Stage completed' })
  async completeStage(
    @Param('stageId') stageId: string,
    @Request() req,
    @Body() body?: { notes?: string; metadata?: any },
  ) {
    return this.workflowStageService.completeStage(
      stageId,
      req.user.id,
      body?.notes,
      body?.metadata,
    );
  }

  @Patch('stages/:stageId')
  @ApiOperation({ summary: 'Update stage properties' })
  @ApiResponse({ status: 200, description: 'Stage updated' })
  async updateStage(
    @Param('stageId') stageId: string,
    @Body() updateDto: UpdateStageDto,
  ) {
    return this.workflowStageService.updateStage(stageId, updateDto);
  }

  // ==================== Stage Skipping (Admin Only) ====================

  @Post('stages/:stageId/skip')
  @ApiOperation({
    summary: 'Skip a workflow stage (admin only)',
    description:
      'Client requirement: Admin approval required with reason to skip stages',
  })
  @ApiResponse({ status: 200, description: 'Stage skipped' })
  @ApiResponse({ status: 403, description: 'Only admin can skip stages' })
  async skipStage(
    @Param('stageId') stageId: string,
    @Request() req,
    @Body() skipDto: SkipStageDto,
  ) {
    return this.workflowStageService.skipStage(
      stageId,
      req.user.id,
      skipDto,
    );
  }

  @Delete('stages/:stageId')
  @ApiOperation({ summary: 'Delete a workflow stage (admin only)' })
  @ApiResponse({ status: 200, description: 'Stage deleted' })
  @ApiResponse({ status: 403, description: 'Only admin can delete stages' })
  async deleteStage(@Param('stageId') stageId: string, @Request() req) {
    return this.workflowStageService.deleteStage(stageId, req.user.id);
  }

  // ==================== Decree Deadlines (Configurable) ====================

  @Post('documents/:documentId/decree-deadline')
  @ApiOperation({
    summary: 'Set custom deadline for decree stage',
    description:
      'Client requirement: "Es a mi criterio" - Minister decides deadline',
  })
  @ApiResponse({ status: 200, description: 'Decree deadline set' })
  async setDecreeDeadline(
    @Param('documentId') documentId: string,
    @Body() body: { customDeadline?: string; deadlineHours?: number },
  ) {
    const customDeadline = body.customDeadline
      ? new Date(body.customDeadline)
      : undefined;

    return this.documentWorkflowService.setDecreeDeadline(
      documentId,
      customDeadline,
      body.deadlineHours,
    );
  }

  // ==================== Signature Validation ====================

  @Get('documents/:documentId/ready-for-signature')
  @ApiOperation({ summary: 'Check if document is ready for Minister signature' })
  @ApiResponse({ status: 200, description: 'Signature readiness checked' })
  async isReadyForSignature(@Param('documentId') documentId: string) {
    const ready =
      await this.documentWorkflowService.isReadyForSignature(documentId);
    return { ready };
  }

  @Get('minister/validate')
  @ApiOperation({ summary: 'Check if current user is the Minister' })
  @ApiResponse({ status: 200, description: 'Minister status checked' })
  async isMinister(@Request() req) {
    const isMinister = await this.ministerValidation.isMinister(req.user.id);
    return { isMinister };
  }

  @Get('minister/info')
  @ApiOperation({ summary: 'Get Minister user information' })
  @ApiResponse({ status: 200, description: 'Minister info retrieved' })
  async getMinister() {
    return this.ministerValidation.getMinister();
  }

  // ==================== Reminders ====================

  @Get('reminders/stats')
  @ApiOperation({ summary: 'Get reminder statistics' })
  @ApiResponse({ status: 200, description: 'Reminder stats retrieved' })
  async getReminderStats() {
    return this.reminderScheduler.getReminderStats();
  }

  @Post('reminders/trigger')
  @ApiOperation({
    summary: 'Manually trigger reminder check (admin only)',
    description: 'For testing purposes - normally runs on cron schedule',
  })
  @ApiResponse({ status: 200, description: 'Reminder check triggered' })
  async triggerReminderCheck() {
    return this.reminderScheduler.triggerReminderCheck();
  }

  // ==================== Query & Statistics ====================

  @Get('stages/overdue')
  @ApiOperation({ summary: 'Get all overdue workflow stages' })
  @ApiResponse({ status: 200, description: 'Overdue stages retrieved' })
  async getOverdueStages() {
    return this.workflowStageService.getOverdueStages();
  }

  @Get('stages/by-status/:status')
  @ApiOperation({ summary: 'Get stages by status' })
  @ApiResponse({ status: 200, description: 'Stages retrieved' })
  async getStagesByStatus(@Param('status') status: string) {
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'FAILED'];

    if (!validStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    return this.workflowStageService.getStagesByStatus(status as any);
  }

  @Get('configuration/:documentType')
  @ApiOperation({ summary: 'Get workflow configuration for document type' })
  @ApiResponse({ status: 200, description: 'Workflow configuration retrieved' })
  async getWorkflowConfiguration(
    @Param('documentType') documentType: string,
  ) {
    const validTypes = ['IN', 'OUT'];

    if (!validTypes.includes(documentType)) {
      throw new BadRequestException(
        'Invalid document type. Must be either "IN" or "OUT"',
      );
    }

    return this.documentWorkflowService.getWorkflowConfiguration(
      documentType as any,
    );
  }
}
