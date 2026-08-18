import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { documentsApi } from '../../lib/api/documents.api';
import { toast } from 'sonner';
import { History, Loader2, Download, RotateCcw, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface FileVersionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  fileName: string;
  onVersionRestored?: () => void;
}

interface FileVersion {
  id: string;
  versionNumber: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  comment?: string;
  uploadedBy?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
}

export function FileVersionHistory({
  open,
  onOpenChange,
  fileId,
  fileName,
  onVersionRestored,
}: FileVersionHistoryProps) {
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [totalVersions, setTotalVersions] = useState<number>(0);

  // Load version history
  const loadVersionHistory = async () => {
    try {
      setLoading(true);
      const response = await documentsApi.getVersionHistory(fileId);
      setVersions(response.versions || []);
      setCurrentVersion(response.currentVersion);
      setTotalVersions(response.totalVersions);
    } catch (error: any) {
      console.error('Failed to load version history:', error);
      toast.error('Error al cargar historial de versiones');
    } finally {
      setLoading(false);
    }
  };

  // Restore version
  const handleRestore = async (versionNumber: number) => {
    try {
      setRestoring(versionNumber);
      await documentsApi.restoreVersion(
        fileId,
        versionNumber,
        `Restaurando versión ${versionNumber}`
      );

      toast.success(`Versión ${versionNumber} restaurada exitosamente`);

      // Reload version history
      await loadVersionHistory();

      // Notify parent component
      if (onVersionRestored) {
        onVersionRestored();
      }
    } catch (error: any) {
      console.error('Failed to restore version:', error);
      toast.error(error.response?.data?.message || 'Error al restaurar versión');
    } finally {
      setRestoring(null);
    }
  };

  // Download version
  const handleDownload = async (versionNumber: number, fileName: string) => {
    try {
      const blob = await documentsApi.downloadVersion(fileId, versionNumber);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();

      window.URL.revokeObjectURL(url);

      toast.success('Descargando versión...');
    } catch (error: any) {
      console.error('Failed to download version:', error);
      toast.error('Error al descargar versión');
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Load version history when dialog opens
  useEffect(() => {
    if (open) {
      loadVersionHistory();
    }
  }, [open, fileId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Versiones
          </DialogTitle>
          <DialogDescription>
            Ver, descargar y restaurar versiones anteriores del archivo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium">{fileName}</p>
              <p className="text-xs text-muted-foreground">
                Versión actual: {currentVersion} • Total de versiones: {totalVersions}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No hay versiones anteriores disponibles
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Las versiones se crean automáticamente cuando reemplazas un archivo
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      v{version.versionNumber}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {version.fileName}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(version.createdAt), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </span>
                          {version.uploadedBy && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {version.uploadedBy.firstName} {version.uploadedBy.lastName}
                            </span>
                          )}
                          <span>{formatFileSize(version.fileSize)}</span>
                        </div>
                        {version.comment && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            {version.comment}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleDownload(version.versionNumber, version.fileName)
                          }
                          title="Descargar esta versión"
                        >
                          <Download className="h-4 w-4" />
                        </Button>

                        {version.versionNumber !== currentVersion && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore(version.versionNumber)}
                            disabled={restoring !== null}
                            title="Restaurar esta versión"
                          >
                            {restoring === version.versionNumber ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        {version.versionNumber === currentVersion && (
                          <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                            Actual
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
