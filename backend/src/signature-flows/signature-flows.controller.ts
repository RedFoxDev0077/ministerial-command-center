import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SignatureFlowsService } from './signature-flows.service';
import { CreateSignatureFlowDto } from './dto/create-signature-flow.dto';
import { SignDocumentDto } from './dto/sign-document.dto';
import { RejectDocumentDto } from './dto/reject-document.dto';
import { SignatureStatus } from '@prisma/client';

@ApiTags('Signature Flows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('signature-flows')
export class SignatureFlowsController {
  constructor(private readonly signatureFlowsService: SignatureFlowsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new signature flow and send to participants' })
  @ApiResponse({ status: 201, description: 'Signature flow created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Document or participant not found' })
  async createSignatureFlow(@Request() req, @Body() dto: CreateSignatureFlowDto) {
    return this.signatureFlowsService.createSignatureFlow(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all signature flows with optional filters' })
  @ApiQuery({ name: 'status', enum: SignatureStatus, required: false })
  @ApiQuery({ name: 'participantId', type: String, required: false })
  @ApiResponse({ status: 200, description: 'List of signature flows' })
  async getSignatureFlows(
    @Request() req,
    @Query('status') status?: SignatureStatus,
    @Query('participantId') participantId?: string,
  ) {
    return this.signatureFlowsService.getSignatureFlows(req.user.id, {
      status,
      participantId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get signature flow by ID' })
  @ApiResponse({ status: 200, description: 'Signature flow details' })
  @ApiResponse({ status: 404, description: 'Signature flow not found' })
  async getSignatureFlowById(@Param('id') id: string, @Request() req) {
    return this.signatureFlowsService.getSignatureFlowById(id, req.user.id);
  }

  @Get(':id/verify')
  @ApiOperation({ summary: 'Verify document integrity via hash' })
  async verifyIntegrity(@Param('id') id: string, @Request() req) {
    return this.signatureFlowsService.verifyIntegrity(id, req.user.id);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Sign a document in a signature flow' })
  @ApiResponse({ status: 200, description: 'Document signed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Not a participant in this flow' })
  @ApiResponse({ status: 404, description: 'Signature flow not found' })
  async signDocument(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: SignDocumentDto,
  ) {
    return this.signatureFlowsService.signDocument(id, req.user.id, dto);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a document in a signature flow' })
  @ApiResponse({ status: 200, description: 'Document rejected successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Not a participant in this flow' })
  @ApiResponse({ status: 404, description: 'Signature flow not found' })
  async rejectDocument(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: RejectDocumentDto,
  ) {
    return this.signatureFlowsService.rejectDocument(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a signature flow (creator only)' })
  @ApiResponse({ status: 200, description: 'Signature flow cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Only creator can cancel' })
  @ApiResponse({ status: 404, description: 'Signature flow not found' })
  async cancelSignatureFlow(@Param('id') id: string, @Request() req) {
    return this.signatureFlowsService.cancelSignatureFlow(id, req.user.id);
  }
}
