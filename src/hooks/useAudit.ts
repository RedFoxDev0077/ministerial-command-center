import { useQuery } from '@tanstack/react-query';
import { auditApi, type QueryAuditLogDto } from '@/lib/api';

// Query keys
export const auditKeys = {
  all: ['audit'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (filters: QueryAuditLogDto) => [...auditKeys.lists(), filters] as const,
  stats: (dateFrom?: string, dateTo?: string) =>
    [...auditKeys.all, 'stats', dateFrom, dateTo] as const,
  resource: (type: string, id: string) =>
    [...auditKeys.all, 'resource', type, id] as const,
  user: (userId: string, limit?: number) =>
    [...auditKeys.all, 'user', userId, limit] as const,
};

/**
 * Fetch audit logs with pagination and filters
 */
export const useAuditLogs = (params?: QueryAuditLogDto) => {
  return useQuery({
    queryKey: auditKeys.list(params || {}),
    queryFn: () => auditApi.findAll(params),
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Fetch audit statistics
 */
export const useAuditStats = (dateFrom?: string, dateTo?: string) => {
  return useQuery({
    queryKey: auditKeys.stats(dateFrom, dateTo),
    queryFn: () => auditApi.getStats(dateFrom, dateTo),
    staleTime: 60000, // 1 minute
  });
};

/**
 * Fetch audit history for a specific resource
 */
export const useResourceAudit = (
  resourceType: string,
  resourceId: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: auditKeys.resource(resourceType, resourceId),
    queryFn: () => auditApi.getResourceHistory(resourceType, resourceId),
    enabled: enabled && !!resourceType && !!resourceId,
  });
};

/**
 * Fetch user activity
 */
export const useUserActivity = (userId: string, limit?: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: auditKeys.user(userId, limit),
    queryFn: () => auditApi.getUserActivity(userId, limit),
    enabled: enabled && !!userId,
  });
};
