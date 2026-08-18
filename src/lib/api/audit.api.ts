import { axiosInstance } from './axios';

// TypeScript Interfaces
export interface AuditLogUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  user: AuditLogUser | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  changes: any | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface QueryAuditLogDto {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedAuditResponse {
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuditStats {
  totalLogs: number;
  byAction: Array<{
    action: string;
    count: number;
  }>;
  byResourceType: Array<{
    resourceType: string;
    count: number;
  }>;
}

// Common audit actions
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',

  // Documents
  CREATE_DOCUMENT: 'CREATE_DOCUMENT',
  UPDATE_DOCUMENT: 'UPDATE_DOCUMENT',
  DELETE_DOCUMENT: 'DELETE_DOCUMENT',
  DECREE_DOCUMENT: 'DECREE_DOCUMENT',
  ASSIGN_DOCUMENT: 'ASSIGN_DOCUMENT',
  ARCHIVE_DOCUMENT: 'ARCHIVE_DOCUMENT',

  // Users
  CREATE_USER: 'CREATE_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER',
  CHANGE_USER_ROLE: 'CHANGE_USER_ROLE',

  // Files
  UPLOAD_FILE: 'UPLOAD_FILE',
  DELETE_FILE: 'DELETE_FILE',

  // Signatures
  CREATE_SIGNATURE_FLOW: 'CREATE_SIGNATURE_FLOW',
  SIGN_DOCUMENT: 'SIGN_DOCUMENT',
  REJECT_SIGNATURE: 'REJECT_SIGNATURE',

  // System
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  SYSTEM_CONFIG_CHANGE: 'SYSTEM_CONFIG_CHANGE',
} as const;

export const auditApi = {
  /**
   * Get all audit logs with pagination and filters
   */
  findAll: async (params?: QueryAuditLogDto): Promise<PaginatedAuditResponse> => {
    const response = await axiosInstance.get('/audit', { params });
    return response.data;
  },

  /**
   * Get audit statistics
   */
  getStats: async (dateFrom?: string, dateTo?: string): Promise<AuditStats> => {
    const response = await axiosInstance.get('/audit/stats', {
      params: { dateFrom, dateTo },
    });
    return response.data;
  },

  /**
   * Get audit logs for a specific resource
   */
  getResourceHistory: async (
    resourceType: string,
    resourceId: string
  ): Promise<AuditLog[]> => {
    const response = await axiosInstance.get(
      `/audit/resource/${resourceType}/${resourceId}`
    );
    return response.data;
  },

  /**
   * Get recent activity for a user
   */
  getUserActivity: async (userId: string, limit?: number): Promise<AuditLog[]> => {
    const response = await axiosInstance.get(`/audit/user/${userId}`, {
      params: { limit },
    });
    return response.data;
  },
};

// Helper function to get action label in Spanish
export const getActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    LOGIN: 'Inicio de sesión',
    LOGOUT: 'Cierre de sesión',
    LOGIN_FAILED: 'Intento de inicio de sesión fallido',
    CREATE_DOCUMENT: 'Documento creado',
    UPDATE_DOCUMENT: 'Documento actualizado',
    DELETE_DOCUMENT: 'Documento eliminado',
    DECREE_DOCUMENT: 'Documento decretado',
    ASSIGN_DOCUMENT: 'Documento asignado',
    ARCHIVE_DOCUMENT: 'Documento archivado',
    CREATE_USER: 'Usuario creado',
    UPDATE_USER: 'Usuario actualizado',
    DELETE_USER: 'Usuario eliminado',
    CHANGE_USER_ROLE: 'Rol de usuario cambiado',
    UPLOAD_FILE: 'Archivo subido',
    DELETE_FILE: 'Archivo eliminado',
    CREATE_SIGNATURE_FLOW: 'Flujo de firma creado',
    SIGN_DOCUMENT: 'Documento firmado',
    REJECT_SIGNATURE: 'Firma rechazada',
    SYSTEM_ERROR: 'Error del sistema',
    SYSTEM_CONFIG_CHANGE: 'Configuración del sistema cambiada',
  };
  return labels[action] || action;
};

// Helper function to get resource type label in Spanish
export const getResourceTypeLabel = (resourceType: string | null): string => {
  if (!resourceType) return 'Sistema';

  const labels: Record<string, string> = {
    document: 'Documento',
    user: 'Usuario',
    file: 'Archivo',
    signature: 'Firma',
    auth: 'Autenticación',
    department: 'Departamento',
    entity: 'Entidad',
  };
  return labels[resourceType] || resourceType;
};
