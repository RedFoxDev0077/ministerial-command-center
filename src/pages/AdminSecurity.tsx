import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileWarning,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { documentsApi } from '@/lib/api/documents.api';

interface FlaggedFile {
  id: string;
  fileName: string;
  mimeType: string;
  detectedMimeType?: string;
  declaredMimeType?: string;
  typeMismatch: boolean;
  isSecure: boolean;
  securityFlags: string[];
  fileSize: number;
  uploadedAt: string;
  uploadedBy?: {
    firstName: string;
    lastName: string;
  };
  document?: {
    id: string;
    title: string;
    correlativeNumber: string;
  };
}

interface SecurityStats {
  totalFiles: number;
  secureFiles: number;
  flaggedFiles: number;
  typeMismatchFiles: number;
  reviewedFiles: number;
  pendingReview: number;
}

export function AdminSecurity() {
  const [flaggedFiles, setFlaggedFiles] = useState<FlaggedFile[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Load security data
  const loadSecurityData = async () => {
    try {
      setRefreshing(true);

      const [flaggedResponse, statsResponse] = await Promise.all([
        documentsApi.getFlaggedFiles(),
        documentsApi.getSecurityStats(),
      ]);

      setFlaggedFiles(flaggedResponse.files || []);
      setStats(statsResponse || null);
    } catch (error: any) {
      console.error('Failed to load security data:', error);
      toast.error('Error al cargar datos de seguridad');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Review file (approve or reject)
  const handleReview = async (fileId: string, approved: boolean) => {
    try {
      setReviewingId(fileId);

      await documentsApi.reviewFileSecurity(fileId, approved);

      toast.success(
        approved
          ? 'Archivo aprobado exitosamente'
          : 'Archivo rechazado exitosamente'
      );

      // Reload data
      await loadSecurityData();
    } catch (error: any) {
      console.error('Failed to review file:', error);
      toast.error('Error al revisar archivo');
    } finally {
      setReviewingId(null);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Get security flag badge color
  const getFlagColor = (flag: string): string => {
    if (flag.includes('TYPE_MISMATCH')) return 'destructive';
    if (flag.includes('SUSPICIOUS')) return 'destructive';
    if (flag.includes('UNKNOWN')) return 'secondary';
    return 'default';
  };

  // Load data on mount
  useEffect(() => {
    loadSecurityData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Seguridad de Archivos
          </h1>
          <p className="text-muted-foreground mt-1">
            Panel de administración para revisar archivos con alertas de seguridad
          </p>
        </div>

        <Button
          onClick={loadSecurityData}
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Archivos
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFiles}</div>
              <p className="text-xs text-muted-foreground">
                {stats.secureFiles} seguros ({((stats.secureFiles / stats.totalFiles) * 100).toFixed(1)}%)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Archivos Marcados
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.flaggedFiles}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.typeMismatchFiles} con discrepancia de tipo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pendientes de Revisión
              </CardTitle>
              <FileWarning className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.pendingReview}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.reviewedFiles} ya revisados
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Flagged Files List */}
      <Card>
        <CardHeader>
          <CardTitle>Archivos Marcados para Revisión</CardTitle>
          <CardDescription>
            Estos archivos tienen alertas de seguridad que requieren revisión manual
          </CardDescription>
        </CardHeader>
        <CardContent>
          {flaggedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mb-3" />
              <p className="text-lg font-medium">¡Todo en orden!</p>
              <p className="text-sm text-muted-foreground mt-1">
                No hay archivos marcados para revisión
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {flaggedFiles.map((file) => (
                <Card key={file.id} className="border-l-4 border-l-yellow-500">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {/* File Icon */}
                      <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <FileWarning className="h-6 w-6 text-yellow-600" />
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="font-medium truncate">{file.fileName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(file.fileSize)} • {file.mimeType}
                            </p>

                            {/* Document Info */}
                            {file.document && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Documento: {file.document.correlativeNumber} - {file.document.title}
                              </p>
                            )}

                            {/* Uploader Info */}
                            {file.uploadedBy && (
                              <p className="text-xs text-muted-foreground">
                                Subido por: {file.uploadedBy.firstName} {file.uploadedBy.lastName}
                              </p>
                            )}
                          </div>

                          {/* Security Status */}
                          <div className="flex items-center gap-2">
                            {!file.isSecure && (
                              <Badge variant="destructive">No Seguro</Badge>
                            )}
                            {file.typeMismatch && (
                              <Badge variant="destructive">Tipo Incorrecto</Badge>
                            )}
                          </div>
                        </div>

                        {/* Security Flags */}
                        {file.securityFlags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {file.securityFlags.map((flag, index) => (
                              <Badge
                                key={index}
                                variant={getFlagColor(flag) as any}
                                className="text-xs"
                              >
                                {flag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Type Mismatch Details */}
                        {file.typeMismatch && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-xs text-red-700">
                              <strong>Discrepancia de Tipo:</strong>
                            </p>
                            <p className="text-xs text-red-600 mt-1">
                              Declarado: {file.declaredMimeType || 'Desconocido'}
                            </p>
                            <p className="text-xs text-red-600">
                              Detectado: {file.detectedMimeType || 'Desconocido'}
                            </p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReview(file.id, true)}
                            disabled={reviewingId !== null}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Aprobar
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReview(file.id, false)}
                            disabled={reviewingId !== null}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rechazar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
