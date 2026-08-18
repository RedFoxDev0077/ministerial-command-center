import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  X,
  File,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Download,
  Eye,
  FileCheck,
  Shield,
  AlertCircle,
  History,
  RefreshCw,
  Replace,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { documentsApi } from '@/lib/api/documents.api';
import { FileConversionDialog } from './FileConversionDialog';
import { FileVersionHistory } from './FileVersionHistory';
import { FileReplaceDialog } from './FileReplaceDialog';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  file?: File;
  progress?: number;
  extractedText?: string;
}

interface FileUploadProps {
  documentId?: string;
  existingFiles?: UploadedFile[];
  onFilesChange?: (files: UploadedFile[]) => void;
  onTextExtracted?: (text: string) => void;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  uploadImmediately?: boolean; // If true, uploads to backend when documentId is provided
}

export function FileUpload({
  documentId,
  existingFiles = [],
  onFilesChange,
  onTextExtracted,
  maxSize = 10,
  acceptedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'text/plain',
  ],
  uploadImmediately = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog states for file operations
  const [conversionDialogOpen, setConversionDialogOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return ImageIcon;
    if (fileType.includes('pdf')) return FileText;
    if (fileType.includes('sheet') || fileType.includes('excel')) return FileSpreadsheet;
    return File;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const validateFile = (file: File): boolean => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      toast.error(`Tipo de archivo no permitido: ${file.type}`);
      return false;
    }

    // Check file size
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxSize) {
      toast.error(`El archivo es demasiado grande. Máximo: ${maxSize}MB`);
      return false;
    }

    return true;
  };

  const handleFiles = async (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;

    const validFiles: File[] = [];
    const validFileObjs: UploadedFile[] = [];

    Array.from(newFiles).forEach((file) => {
      if (validateFile(file)) {
        validFiles.push(file);
        validFileObjs.push({
          id: Math.random().toString(36).substring(7),
          name: file.name,
          size: file.size,
          type: file.type,
          file: file,
          progress: 0,
        });
      }
    });

    if (validFiles.length === 0) return;

    // Add files to state immediately with 0% progress
    const updatedFiles = [...files, ...validFileObjs];
    setFiles(updatedFiles);

    // If uploadImmediately is true and documentId exists, upload to backend
    if (uploadImmediately && documentId) {
      setIsUploading(true);
      try {
        const result = await documentsApi.uploadFiles(
          documentId,
          validFiles,
          (progress) => {
            // Update progress for all uploading files
            setFiles((prev) =>
              prev.map((f) => {
                const isNewFile = validFileObjs.find((vf) => vf.id === f.id);
                return isNewFile ? { ...f, progress } : f;
              })
            );
          }
        );

        // Update files with backend response
        setFiles((prev) => {
          const updated = prev.map((f) => {
            const uploadedFile = result.files?.find(
              (rf: any) => rf.fileName === f.name
            );
            if (uploadedFile) {
              return {
                ...f,
                id: uploadedFile.id,
                url: uploadedFile.storageUrl,
                progress: 100,
                extractedText: undefined, // Will be in document content
              };
            }
            return f;
          });
          onFilesChange?.(updated);
          return updated;
        });

        // Notify parent about extracted text
        if (result.extractedText && onTextExtracted) {
          onTextExtracted(result.extractedText);
        }

        toast.success(
          `${validFiles.length} archivo(s) subido(s) con OCR exitosamente`
        );
      } catch (error: any) {
        console.error('Error uploading files:', error);

        const errorMessage = error.response?.data?.message || 'Error al subir archivos';

        // Check if it's a security rejection
        if (errorMessage.includes('security') || errorMessage.includes('seguridad') || errorMessage.includes('rejected')) {
          toast.error(errorMessage, {
            description: 'Este tipo de archivo no está permitido por razones de seguridad.',
            duration: 5000,
            icon: <AlertCircle className="h-5 w-5 text-red-600" />,
          });
        } else {
          toast.error(errorMessage);
        }

        // Remove failed files
        setFiles((prev) =>
          prev.filter((f) => !validFileObjs.find((vf) => vf.id === f.id))
        );
      } finally {
        setIsUploading(false);
      }
    } else {
      // Simulate upload progress for local-only mode
      validFileObjs.forEach((uploadedFile) => {
        const interval = setInterval(() => {
          setFiles((prev) => {
            const updated = prev.map((f) =>
              f.id === uploadedFile.id &&
              f.progress !== undefined &&
              f.progress < 100
                ? { ...f, progress: Math.min(f.progress + 20, 100) }
                : f
            );
            return updated;
          });
        }, 200);

        setTimeout(() => {
          clearInterval(interval);
          setFiles((prev) => {
            const updated = prev.map((f) =>
              f.id === uploadedFile.id ? { ...f, progress: 100 } : f
            );
            onFilesChange?.(updated);
            return updated;
          });
        }, 1000);
      });

      toast.success(`${validFiles.length} archivo(s) agregado(s)`);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    handleFiles(droppedFiles);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleRemoveFile = async (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    // If file has a URL, it's been uploaded to backend - delete from server
    if (file.url && documentId) {
      try {
        await documentsApi.deleteFile(documentId, fileId);
        toast.success('Archivo eliminado del servidor');
      } catch (error: any) {
        console.error('Error deleting file:', error);
        toast.error(error.response?.data?.message || 'Error al eliminar archivo');
        return;
      }
    }

    const updatedFiles = files.filter((f) => f.id !== fileId);
    setFiles(updatedFiles);
    onFilesChange?.(updatedFiles);

    if (!file.url) {
      toast.success('Archivo removido');
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Security Notice */}
      {uploadImmediately && (
        <Alert className="border-blue-200 bg-blue-50/50">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            <strong>Protección de seguridad activa:</strong> Todos los archivos son
            escaneados automáticamente. Los tipos peligrosos (.exe, scripts) serán
            rechazados para proteger el sistema.
          </AlertDescription>
        </Alert>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isUploading
            ? 'border-muted-foreground/25 cursor-not-allowed opacity-60'
            : 'cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
        )}
        onClick={!isUploading ? handleBrowseClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading}
        />

        <Upload
          className={cn(
            'h-12 w-12 mx-auto text-muted-foreground mb-4',
            isUploading && 'animate-pulse'
          )}
        />
        <p className="text-sm font-medium mb-1">
          {isUploading
            ? 'Subiendo archivos con OCR...'
            : 'Arrastra archivos aquí o haz clic para seleccionar'}
        </p>
        <p className="text-xs text-muted-foreground">
          {uploadImmediately && documentId
            ? 'PDF, Word, Excel, Imágenes con extracción de texto automática'
            : `Tipos permitidos: PDF, Word, Excel, Imágenes (Máx. ${maxSize}MB)`}
        </p>
      </div>

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Archivos ({files.length})
          </p>
          <div className="space-y-2">
            {files.map((file) => {
              const Icon = getFileIcon(file.type);
              const isUploading = file.progress !== undefined && file.progress < 100;

              return (
                <Card key={file.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {/* File Icon */}
                      <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {file.name}
                          </p>
                          {file.progress === 100 && file.url && (
                            <FileCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                          {file.progress === 100 &&
                            file.url &&
                            ' • OCR procesado'}
                        </p>

                        {/* Progress Bar */}
                        {isUploading && (
                          <Progress value={file.progress} className="h-1 mt-2" />
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {file.url && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={async () => {
                                try {
                                  const blob = await documentsApi.downloadFile(file.id);
                                  if (blob) {
                                    const url = window.URL.createObjectURL(blob);
                                    window.open(url, '_blank');
                                    setTimeout(() => window.URL.revokeObjectURL(url), 100);
                                  } else {
                                    toast.error('Error al abrir archivo');
                                  }
                                } catch (error) {
                                  console.error('Error opening file:', error);
                                  toast.error('Error al abrir archivo');
                                }
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={async () => {
                                try {
                                  const blob = await documentsApi.downloadFile(file.id);
                                  if (blob) {
                                    const blobUrl = window.URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = blobUrl;
                                    link.download = file.fileName || file.name || 'download';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(blobUrl);
                                    toast.success('Archivo descargado correctamente');
                                  } else {
                                    toast.error('Error al descargar archivo');
                                  }
                                } catch (error) {
                                  console.error('Error downloading file:', error);
                                  toast.error('Error al descargar archivo');
                                }
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedFile(file);
                                setConversionDialogOpen(true);
                              }}
                              title="Convertir archivo"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedFile(file);
                                setVersionHistoryOpen(true);
                              }}
                              title="Historial de versiones"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            {documentId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setSelectedFile(file);
                                  setReplaceDialogOpen(true);
                                }}
                                title="Reemplazar archivo"
                              >
                                <Replace className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => handleRemoveFile(file.id)}
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* File Conversion Dialog */}
      {selectedFile && (
        <FileConversionDialog
          open={conversionDialogOpen}
          onOpenChange={setConversionDialogOpen}
          fileId={selectedFile.id}
          fileName={selectedFile.name}
          mimeType={selectedFile.type}
        />
      )}

      {/* File Version History Dialog */}
      {selectedFile && (
        <FileVersionHistory
          open={versionHistoryOpen}
          onOpenChange={setVersionHistoryOpen}
          fileId={selectedFile.id}
          fileName={selectedFile.name}
          onVersionRestored={() => {
            // Refresh file list or show notification
            toast.success('Versión restaurada. Recarga la página para ver los cambios.');
          }}
        />
      )}

      {/* File Replace Dialog */}
      {selectedFile && documentId && (
        <FileReplaceDialog
          open={replaceDialogOpen}
          onOpenChange={setReplaceDialogOpen}
          documentId={documentId}
          fileId={selectedFile.id}
          fileName={selectedFile.name}
          onReplaced={() => {
            // Reload page to show updated file
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
