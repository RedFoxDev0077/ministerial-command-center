import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { createPaginatedResponse, calculateSkip } from '../documents/utils/pagination.util';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create an audit log entry
   */
  async log(
    userId: string | null,
    dto: CreateAuditLogDto,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: dto.action,
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          changes: dto.changes ? (dto.changes as any) : undefined,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
        },
      });
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Helper method to log document operations
   */
  async logDocumentAction(
    userId: string,
    action: string,
    documentId: string,
    changes?: any,
    req?: any,
  ): Promise<void> {
    await this.log(userId, {
      action,
      resourceType: 'document',
      resourceId: documentId,
      changes,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get?.('user-agent'),
    });
  }

  /**
   * Helper method to log user operations
   */
  async logUserAction(
    userId: string,
    action: string,
    targetUserId: string,
    changes?: any,
    req?: any,
  ): Promise<void> {
    await this.log(userId, {
      action,
      resourceType: 'user',
      resourceId: targetUserId,
      changes,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get?.('user-agent'),
    });
  }

  /**
   * Helper method to log authentication events
   */
  async logAuthAction(
    userId: string | null,
    action: string,
    req?: any,
  ): Promise<void> {
    await this.log(userId, {
      action,
      resourceType: 'auth',
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get?.('user-agent'),
    });
  }

  /**
   * Get audit logs with pagination and filters
   */
  async findAll(queryDto: QueryAuditLogDto) {
    const { page = 1, limit = 50, dateFrom, dateTo, ...filters } = queryDto;

    const where: Prisma.AuditLogWhereInput = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    const skip = calculateSkip(page, limit);

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return createPaginatedResponse(logs, { total, page, limit });
  }

  /**
   * Get audit logs for a specific resource
   */
  async findByResource(resourceType: string, resourceId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        resourceType,
        resourceId,
      },
      orderBy: { createdAt: 'desc' },
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
  }

  /**
   * Get recent activity for a user
   */
  async findByUser(userId: string, limit: number = 20) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get audit statistics
   */
  async getStats(dateFrom?: string, dateTo?: string) {
    const where: Prisma.AuditLogWhereInput = {};

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    const [totalLogs, actionCounts, resourceCounts] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
      }),
      this.prisma.auditLog.groupBy({
        by: ['resourceType'],
        where,
        _count: true,
      }),
    ]);

    return {
      totalLogs,
      byAction: actionCounts.map((item) => ({
        action: item.action,
        count: item._count,
      })),
      byResourceType: resourceCounts
        .filter((item) => item.resourceType)
        .map((item) => ({
          resourceType: item.resourceType,
          count: item._count,
        })),
    };
  }
}
