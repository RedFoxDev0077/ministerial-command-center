import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { documentsApi } from '../../lib/api/documents.api';
import { toast } from 'sonner';
import { FileText, Loader2, Download, CheckCircle2 } from 'lucide-react';

interface FileConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  fileName: string;
  mimeType: string;
}

export function FileConversionDialog({
  open,
  onOpenChange,
  fileId,
  fileName,
  mimeType,
}: FileConversionDialogProps) {
  const [converting, setConverting] = useState(false);
  const [convertedFileId, setConvertedFileId] = useState<string | null>(null);
  const [supportedFormats, setSupportedFormats] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Load supported formats when dialog opens
  const loadSupportedFormats = async () => {
    try {
      setLoading(true);
      const response = await documentsApi.getConversionFormats(fileId);
      setSupportedFormats(response.supportedFormats || []);
    } catch (error: any) {
      console.error('Failed to load conversion formats:', error);
      toast.error('Error al cargar formatos disponibles');
    } finally {
      setLoading(false);
    }
  };

  // Convert file to PDF
  const handleConvert = async () => {
    try {
      setConverting(true);
      const response = await documentsApi.convertFile(fileId, 'pdf');

      if (response.success) {
        setConvertedFileId(response.convertedFileId);
        toast.success(
          `Archivo convertido exitosamente en ${(response.duration / 1000).toFixed(1)}s`
        );
      } else {
        toast.error(response.error || 'Error al convertir archivo');
      }
    } catch (error: any) {
      console.error('Conversion failed:', error);
      toast.error(error.response?.data?.message || 'Error al convertir archivo');
    } finally {
      setConverting(false);
    }
  };

  // Download converted file
  const handleDownload = async () => {
    if (!convertedFileId) return;

    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${API_URL}/documents/files/${convertedFileId}/download`);

      if (!response.ok) {
        throw new Error('Failed to get file URL');
      }

      const data = await response.json();

      const link = document.createElement('a');
      link.href = data.url;
      link.download = data.fileName;
      link.target = '_blank';
      link.click();

      toast.success('Descargando archivo convertido...');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Error al descargar archivo');
    }
  };

  // Load supported formats when dialog opens
  useEffect(() => {
    if (open && supportedFormats.length === 0 && !loading) {
      loadSupportedFormats();
    }
    // Reset state when dialog closes
    if (!open) {
      setConverting(false);
      setConvertedFileId(null);
      setSupportedFormats([]);
    }
  }, [open]);

  // Check if file can be converted
  const canConvert = () => {
    // Office documents that can be converted to PDF
    const convertibleTypes = [
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-powerpoint', // .ppt
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    ];

    return convertibleTypes.includes(mimeType);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convertir Archivo</DialogTitle>
          <DialogDescription>
            Convertir documentos de Office a formato PDF
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground">{mimeType}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !canConvert() ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                Este archivo no se puede convertir.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Solo se pueden convertir archivos de Word, Excel y PowerPoint.
              </p>
            </div>
          ) : supportedFormats.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                No hay formatos de conversión disponibles para este archivo.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Convertir a:</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled
                  >
                    PDF
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  El archivo se convertirá a formato PDF usando LibreOffice
                </p>
              </div>

              {convertedFileId && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-sm text-green-700">Conversión completada</p>
                </div>
              )}

              <div className="flex gap-2">
                {!convertedFileId ? (
                  <Button
                    onClick={handleConvert}
                    disabled={converting}
                    className="flex-1"
                  >
                    {converting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Convirtiendo...
                      </>
                    ) : (
                      'Convertir a PDF'
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleDownload}
                    className="flex-1"
                    variant="default"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar PDF
                  </Button>
                )}

                <Button
                  onClick={() => onOpenChange(false)}
                  variant="outline"
                >
                  Cerrar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
