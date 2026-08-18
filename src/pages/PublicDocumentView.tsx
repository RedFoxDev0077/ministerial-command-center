import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  Calendar,
  Building2,
  User,
  ArrowLeft,
  Eye,
  FileCheck,
  AlertCircle,
  Lock,
  History,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { FileConversionDialog } from '@/components/documents/FileConversionDialog';
import { FileVersionHistory } from '@/components/documents/FileVersionHistory';

interface Document {
  id: string;
  title: string;
  correlativeNumber: string;
  type: string;
  direction: string;
  classification: string;
  status: string;
  content?: string;
  createdAt: string;
  entity?: {
    id: string;
    name: string;
    color?: string;
    shortName?: string;
  };
  responsible?: {
    firstName: string;
    lastName: string;
  };
  files?: Array<{
    id: string;
    fileName: string;
    storageUrl: string;
    size: number;
    mimeType: string;
  }>;
  tags?: Array<{
    documentId: string;
    tagId: string;
    createdAt: string;
    tag: {
      id: string;
      name: string;
      color?: string;
      description?: string;
    };
  }>;
}

export default function PublicDocumentView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [documentData, setDocumentData] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states for file operations
  const [conversionDialogOpen, setConversionDialogOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    id: string;
    fileName: string;
    mimeType: string;
  } | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!id) {
        setError('ID de documento no proporcionado');
        setLoading(false);
        return;
      }

      try {
        const API_URL = import.meta.env.VITE_API_URL || '/api';
        const response = await fetch(`${API_URL}/documents/public/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Documento no encontrado');
          } else if (response.status === 401 || response.status === 403) {
            setError('No tiene permisos para ver este documento');
          } else {
            setError('Error al cargar el documento');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setDocumentData(data);
      } catch (err) {
        console.error('Error fetching document:', err);
        setError('Error de conexión. Por favor, intente de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id]);

  const handleViewFile = useCallback(async (fileId: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${API_URL}/documents/files/${fileId}/download`);

      if (!response.ok) {
        throw new Error('Failed to get file URL');
      }

      const data = await response.json();
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error viewing file:', error);
      toast.error('Error al abrir archivo');
    }
  }, []);

  const handleOpenConversion = useCallback((file: { id: string; fileName: string; mimeType: string }) => {
    setSelectedFile(file);
    setConversionDialogOpen(true);
  }, []);

  const handleOpenHistory = useCallback((file: { id: string; fileName: string; mimeType: string }) => {
    setSelectedFile(file);
    setVersionHistoryOpen(true);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const statusLabels: Record<string, string> = {
    DRAFT: 'Borrador',
    PENDING: 'Pendiente',
    IN_PROGRESS: 'En proceso',
    COMPLETED: 'Completado',
    ARCHIVED: 'Archivado',
    REJECTED: 'Rechazado',
  };

  const statusVariants: Record<string, 'warning' | 'info' | 'success' | 'muted' | 'destructive'> = {
    DRAFT: 'muted',
    PENDING: 'warning',
    IN_PROGRESS: 'info',
    COMPLETED: 'success',
    ARCHIVED: 'muted',
    REJECTED: 'destructive',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-48 mb-6" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !documentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Error al cargar documento</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Reintentar
                </Button>
                <Button onClick={() => navigate('/login', { state: { returnTo: id ? `/documents/${id}` : '/' } })}>
                  Ir a inicio de sesión
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold">Vista Pública de Documento</h1>
                <p className="text-sm text-muted-foreground">Acceso vía código QR</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/login', { state: { returnTo: `/documents/${id}` } })}
            >
              <Lock className="h-4 w-4 mr-2" />
              Iniciar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={statusVariants[documentData.status]}>
                    {statusLabels[documentData.status]}
                  </Badge>
                  <Badge variant="outline">{documentData.classification === 'INTERNAL' ? 'Interno' : 'Externo'}</Badge>
                </div>
                <CardTitle className="text-2xl mb-2">{documentData.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  No. Correlativo: <span className="font-mono font-medium">{documentData.correlativeNumber}</span>
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Información</TabsTrigger>
                <TabsTrigger value="content">Contenido</TabsTrigger>
                <TabsTrigger value="files">Archivos ({documentData.files?.length || 0})</TabsTrigger>
              </TabsList>

              {/* Information Tab */}
              <TabsContent value="info" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Entity */}
                  {documentData.entity && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span className="font-medium">Entidad/Departamento</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: documentData.entity.color || '#6366f1' }}
                        >
                          {documentData.entity.shortName || documentData.entity.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium">{documentData.entity.name}</span>
                      </div>
                    </div>
                  )}

                  {/* Responsible */}
                  {documentData.responsible && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span className="font-medium">Responsable</span>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <span className="font-medium">
                          {documentData.responsible.firstName} {documentData.responsible.lastName}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Created Date */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">Fecha de Creación</span>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <span className="font-medium">
                        {format(new Date(documentData.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                      </span>
                    </div>
                  </div>

                  {/* Document Type */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">Tipo de Documento</span>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <span className="font-medium capitalize">{documentData.type}</span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {documentData.tags && documentData.tags.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground font-medium">Etiquetas</div>
                    <div className="flex flex-wrap gap-2">
                      {documentData.tags.map((tagItem) => (
                        <Badge key={tagItem.tagId} variant="secondary">
                          {tagItem.tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Content Tab */}
              <TabsContent value="content" className="mt-6">
                <div className="prose prose-sm max-w-none">
                  {documentData.content ? (
                    <div className="p-4 rounded-lg bg-muted/30 whitespace-pre-wrap">
                      {documentData.content}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">No hay contenido disponible para este documento</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Files Tab */}
              <TabsContent value="files" className="mt-6">
                {documentData.files && documentData.files.length > 0 ? (
                  <div className="space-y-3">
                    {documentData.files.map((file) => (
                      <Card key={file.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <FileCheck className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{file.fileName}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatFileSize(file.size)} • {file.mimeType}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewFile(file.id)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenConversion({
                                  id: file.id,
                                  fileName: file.fileName,
                                  mimeType: file.mimeType,
                                })}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Convertir
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenHistory({
                                  id: file.id,
                                  fileName: file.fileName,
                                  mimeType: file.mimeType,
                                })}
                              >
                                <History className="h-4 w-4 mr-1" />
                                Historial
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileCheck className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No hay archivos adjuntos</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Este documento es de carácter oficial. Para acceso completo,{' '}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => navigate('/login', { state: { returnTo: `/documents/${id}` } })}
            >
              inicie sesión en el sistema
            </Button>
            .
          </p>
        </div>

        {/* File Conversion Dialog */}
        {selectedFile && (
          <FileConversionDialog
            open={conversionDialogOpen}
            onOpenChange={setConversionDialogOpen}
            fileId={selectedFile.id}
            fileName={selectedFile.fileName}
            mimeType={selectedFile.mimeType}
          />
        )}

        {/* File Version History Dialog */}
        {selectedFile && (
          <FileVersionHistory
            open={versionHistoryOpen}
            onOpenChange={setVersionHistoryOpen}
            fileId={selectedFile.id}
            fileName={selectedFile.fileName}
            onVersionRestored={() => {
              // Reload document to show updated file
              window.location.reload();
            }}
          />
        )}
      </div>
    </div>
  );
}
