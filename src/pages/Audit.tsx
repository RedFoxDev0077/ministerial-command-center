import { useState } from 'react';
import { useAuditLogs, useAuditStats } from '@/hooks/useAudit';
import { getActionLabel, getResourceTypeLabel, AUDIT_ACTIONS } from '@/lib/api/audit.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Search,
  User,
  FileText,
  FolderOpen,
  PenTool,
  Shield,
  Activity,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ScrollToTop } from '@/components/ui/scroll-to-top';

const actionIcons: Record<string, any> = {
  document: FileText,
  expediente: FolderOpen,
  signature: PenTool,
  user: User,
  auth: Shield,
  system: Activity,
};

// Helper function to format audit log values
function formatAuditValue(key: string, value: any): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return 'N/A';
  }

  // Handle dates
  if (key.includes('Date') || key.includes('At')) {
    try {
      return format(new Date(value as string), 'dd/MM/yyyy HH:mm', { locale: es });
    } catch {
      return String(value);
    }
  }

  // Handle objects
  if (typeof value === 'object' && value !== null) {
    // If it's a user object
    if (value.firstName && value.lastName) {
      return `${value.firstName} ${value.lastName}`;
    }

    // If it's a file object
    if (value.originalName) {
      return value.originalName;
    }

    // If it's a document object
    if (value.title) {
      return value.title;
    }

    // If it has a name property
    if (value.name) {
      return value.name;
    }

    // For other objects, try to extract useful info
    if (value.id) {
      return `ID: ${value.id.substring(0, 8)}...`;
    }

    // Last resort: show key-value pairs
    try {
      const entries = Object.entries(value)
        .filter(([k, v]) => v !== null && v !== undefined && k !== 'id')
        .slice(0, 3)
        .map(([k, v]) => `${k}: ${String(v).substring(0, 20)}`)
        .join(', ');
      return entries || 'Objeto vacío';
    } catch {
      return 'Objeto complejo';
    }
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return 'Lista vacía';
    if (value.length === 1) return String(value[0]);
    return `${value.length} elementos`;
  }

  // For specific ID fields, show a cleaner format
  if ((key.includes('Id') || key.includes('To')) && typeof value === 'string' && value.length > 20) {
    return `ID: ${value.substring(0, 8)}...`;
  }

  // Default: convert to string
  return String(value);
}

// Helper function to get friendly label for keys
function getKeyLabel(key: string): string {
  const labels: Record<string, string> = {
    signatureType: 'Tipo de firma',
    signatureDate: 'Fecha de firma',
    sealDate: 'Fecha de sello',
    appliedBy: 'Aplicado por',
    signedAt: 'Firmado el',
    sealAppliedAt: 'Sello aplicado el',
    oldStage: 'Estado anterior',
    newStage: 'Estado nuevo',
    oldValue: 'Valor anterior',
    newValue: 'Valor nuevo',
    oldStatus: 'Estado anterior',
    newStatus: 'Estado nuevo',
    comment: 'Comentario',
    assignedTo: 'Asignado a',
    responsibleId: 'Responsable',
    entityId: 'Entidad',
    title: 'Título',
    fileName: 'Archivo',
    documentData: 'Datos del documento',
  };

  return labels[key] || `${key}:`;
}

export default function AuditPage() {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  // Build query params
  const queryParams = {
    page,
    limit,
    ...(actionFilter !== 'ALL' && { action: actionFilter }),
    ...(resourceTypeFilter !== 'ALL' && { resourceType: resourceTypeFilter }),
  };

  // Fetch data
  const { data: logsData, isLoading, error } = useAuditLogs(queryParams);
  const { data: stats, error: statsError } = useAuditStats();

  // Filter logs by search query (client-side)
  const filteredLogs = logsData?.data?.filter((log) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const userName = log.user
      ? `${log.user.firstName} ${log.user.lastName}`.toLowerCase()
      : '';
    const actionLabel = getActionLabel(log.action).toLowerCase();
    const resourceType = getResourceTypeLabel(log.resourceType).toLowerCase();
    return (
      userName.includes(searchLower) ||
      actionLabel.includes(searchLower) ||
      resourceType.includes(searchLower) ||
      log.resourceId?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Pagination
  const totalPages = logsData?.totalPages || 1;
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  // Check for permission error (401 or 403)
  const errorStatus = (error as any)?.response?.status;
  const isUnauthorized = error && (errorStatus === 401 || errorStatus === 403);

  const handlePreviousPage = () => {
    if (canGoPrevious) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (canGoNext) {
      setPage(page + 1);
    }
  };

  // Export to CSV
  const handleExport = () => {
    if (!logsData?.data || logsData.data.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      // CSV headers
      const headers = ['Fecha', 'Hora', 'Usuario', 'Acción', 'Tipo de Recurso', 'ID de Recurso', 'IP'];

      // CSV rows
      const rows = logsData.data.map((log) => {
        const date = new Date(log.createdAt);
        return [
          format(date, 'dd/MM/yyyy', { locale: es }),
          format(date, 'HH:mm:ss', { locale: es }),
          log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Sistema',
          getActionLabel(log.action),
          getResourceTypeLabel(log.resourceType),
          log.resourceId || '-',
          log.ipAddress || '-',
        ];
      });

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Registro de auditoría exportado exitosamente');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error al exportar el registro de auditoría');
    }
  };

  // Get icon for resource type
  const getIcon = (resourceType: string | null) => {
    if (!resourceType) return Activity;
    return actionIcons[resourceType] || FileText;
  };

  // Get most common action
  const mostCommonAction = stats?.byAction?.reduce((prev, current) =>
    current.count > prev.count ? current : prev
  , stats.byAction[0]);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Auditoría y Registros</h1>
        <p className="text-muted-foreground">
          Historial completo de actividad del sistema
        </p>
      </div>

      {/* Stats Dashboard */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLogs}</div>
              <p className="text-xs text-muted-foreground">
                Eventos registrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Acción Más Común</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mostCommonAction ? mostCommonAction.count : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {mostCommonAction ? getActionLabel(mostCommonAction.action) : '-'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documentos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.byResourceType.find((r) => r.resourceType === 'document')?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Eventos de documentos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.byResourceType.find((r) => r.resourceType === 'user')?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Eventos de usuarios
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuario, acción, recurso..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Action Filter */}
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Todas las acciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las acciones</SelectItem>
                <SelectItem value={AUDIT_ACTIONS.LOGIN}>Inicio de sesión</SelectItem>
                <SelectItem value={AUDIT_ACTIONS.LOGOUT}>Cierre de sesión</SelectItem>
                <SelectItem value={AUDIT_ACTIONS.CREATE_DOCUMENT}>Documento creado</SelectItem>
                <SelectItem value={AUDIT_ACTIONS.UPDATE_DOCUMENT}>Documento actualizado</SelectItem>
                <SelectItem value={AUDIT_ACTIONS.DELETE_DOCUMENT}>Documento eliminado</SelectItem>
                <SelectItem value={AUDIT_ACTIONS.CREATE_USER}>Usuario creado</SelectItem>
                <SelectItem value={AUDIT_ACTIONS.UPDATE_USER}>Usuario actualizado</SelectItem>
                <SelectItem value={AUDIT_ACTIONS.DELETE_USER}>Usuario eliminado</SelectItem>
                <SelectItem value={AUDIT_ACTIONS.UPLOAD_FILE}>Archivo subido</SelectItem>
              </SelectContent>
            </Select>

            {/* Resource Type Filter */}
            <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Todos los recursos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los recursos</SelectItem>
                <SelectItem value="document">Documentos</SelectItem>
                <SelectItem value="user">Usuarios</SelectItem>
                <SelectItem value="file">Archivos</SelectItem>
                <SelectItem value="signature">Firmas</SelectItem>
                <SelectItem value="auth">Autenticación</SelectItem>
              </SelectContent>
            </Select>

            {/* Export Button */}
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State - Unauthorized */}
      {isUnauthorized && (
        <Card>
          <CardContent className="py-16 text-center">
            <Shield className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acceso Denegado</h3>
            <p className="text-muted-foreground mb-4">
              No tienes permisos para ver los registros de auditoría.
            </p>
            <p className="text-sm text-muted-foreground">
              Solo los usuarios con rol ADMIN o GABINETE pueden acceder a esta página.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Audit Logs List */}
      {!isUnauthorized && (
        <div className="space-y-3">
          {isLoading ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredLogs.length === 0 ? (
          // Empty state
          <Card>
            <CardContent className="py-16 text-center">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No se encontraron registros de auditoría
              </p>
            </CardContent>
          </Card>
        ) : (
          // Audit logs
          filteredLogs.map((log) => {
            const Icon = getIcon(log.resourceType);
            return (
              <Card key={log.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-medium text-sm">
                          {getActionLabel(log.action)}
                        </p>
                        {log.resourceType && (
                          <Badge variant="outline" className="text-xs">
                            {getResourceTypeLabel(log.resourceType)}
                          </Badge>
                        )}
                        {log.resourceId && (
                          <span className="text-xs text-muted-foreground">
                            #{log.resourceId.substring(0, 8)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.user
                            ? `${log.user.firstName} ${log.user.lastName}`
                            : 'Sistema'}
                        </span>
                        {log.ipAddress && (
                          <span>IP: {log.ipAddress}</span>
                        )}
                      </div>

                      {/* Changes/Details */}
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div className="mt-2 pt-2 border-t text-xs">
                          <p className="font-medium text-muted-foreground mb-1">Detalles:</p>
                          <div className="space-y-1">
                            {Object.entries(log.changes).map(([key, value]) => (
                              <div key={key} className="flex gap-2">
                                <span className="text-muted-foreground min-w-[120px]">
                                  {getKeyLabel(key)}
                                </span>
                                <span className="text-foreground font-medium break-words">
                                  {formatAuditValue(key, value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="text-right text-sm flex-shrink-0">
                      <p className="font-medium">
                        {format(new Date(log.createdAt), 'dd MMM yyyy', { locale: es })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.createdAt), 'HH:mm:ss', { locale: es })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
        </div>
      )}

      {/* Pagination */}
      {!isUnauthorized && logsData && logsData.totalPages && logsData.totalPages > 1 && (
        <Card className="mt-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Mostrando {(page - 1) * limit + 1} -{' '}
                {Math.min(page * limit, logsData.total)} de {logsData.total}{' '}
                registros
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={!canGoPrevious}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!canGoNext}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}
