import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import { documentsApi } from '../../lib/api/documents.api';
import { toast } from 'sonner';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface FileReplaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  fileId: string;
  fileName: string;
  onReplaced?: () => void;
}

export function FileReplaceDialog({
  open,
  onOpenChange,
  documentId,
  fileId,
  fileName,
  onReplaced,
}: FileReplaceDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  // Handle file replacement
  const handleReplace = async () => {
    if (!selectedFile) {
      setError('Por favor selecciona un archivo');
      return;
    }

    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      await documentsApi.replaceFile(
        documentId,
        fileId,
        selectedFile,
        comment || undefined,
        setProgress
      );

      setSuccess(true);
      toast.success('Archivo reemplazado exitosamente. Versión anterior archivada.');

      // Wait a moment to show success state
      setTimeout(() => {
        onOpenChange(false);
        if (onReplaced) {
          onReplaced();
        }
        // Reset state
        setSelectedFile(null);
        setComment('');
        setProgress(0);
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      console.error('Failed to replace file:', err);
      setError(err.response?.data?.message || 'Error al reemplazar archivo');
      toast.error('Error al reemplazar archivo');
    } finally {
      setUploading(false);
    }
  };

  // Reset state when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open && !uploading) {
      setSelectedFile(null);
      setComment('');
      setProgress(0);
      setSuccess(false);
      setError(null);
    }
    onOpenChange(open);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reemplazar Archivo</DialogTitle>
          <DialogDescription>
            Selecciona un nuevo archivo para reemplazar el actual. La versión anterior será archivada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current file info */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Archivo actual:</p>
                <p className="text-sm text-muted-foreground truncate">{fileName}</p>
              </div>
            </div>
          </div>

          {/* File selection */}
          <div className="space-y-2">
            <Label htmlFor="file-input">Nuevo archivo</Label>
            <div className="flex gap-2">
              <Input
                id="file-input"
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                disabled={uploading}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
              />
            </div>
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Seleccionado: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>

          {/* Comment/Note */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comentario (opcional)</Label>
            <Textarea
              id="comment"
              placeholder="Ej: Actualización del documento con correcciones..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={uploading}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Este comentario aparecerá en el historial de versiones
            </p>
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Subiendo...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700">¡Reemplazo exitoso!</p>
                <p className="text-xs text-green-600">
                  La versión anterior ha sido archivada
                </p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Info box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Nota:</strong> El archivo actual será archivado como una versión
              anterior. Podrás restaurarlo desde el historial de versiones.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleReplace}
              disabled={!selectedFile || uploading || success}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Completado
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Reemplazar Archivo
                </>
              )}
            </Button>

            <Button
              onClick={() => handleOpenChange(false)}
              variant="outline"
              disabled={uploading}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
