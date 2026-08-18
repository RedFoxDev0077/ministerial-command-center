import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('ADMIN', 'GABINETE')
  @ApiOperation({ summary: 'Get all audit logs with filters' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or Gabinete role required' })
  findAll(@Query() queryDto: QueryAuditLogDto) {
    return this.auditService.findAll(queryDto);
  }

  @Get('stats')
  @Roles('ADMIN', 'GABINETE')
  @ApiOperation({ summary: 'Get audit statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStats(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.auditService.getStats(dateFrom, dateTo);
  }

  @Get('resource/:resourceType/:resourceId')
  @Roles('ADMIN', 'GABINETE', 'REVISOR')
  @ApiOperation({ summary: 'Get audit logs for a specific resource' })
  @ApiParam({ name: 'resourceType', description: 'Resource type (document, user, etc.)' })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiResponse({ status: 200, description: 'Resource audit logs retrieved successfully' })
  findByResource(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.auditService.findByResource(resourceType, resourceId);
  }

  @Get('user/:userId')
  @Roles('ADMIN', 'GABINETE')
  @ApiOperation({ summary: 'Get recent activity for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User activity retrieved successfully' })
  findByUser(@Param('userId') userId: string, @Query('limit') limit?: number) {
    return this.auditService.findByUser(userId, limit ? Number(limit) : 20);
  }
}
