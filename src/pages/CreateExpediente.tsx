import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FolderOpen, ArrowLeft, FileText, Info, AlertTriangle } from 'lucide-react';
import { createExpediente, Priority } from '@/lib/api/expedientes.api';
import { documentsApi } from '@/lib/api/documents.api';
import { toast } from 'sonner';

export default function CreateExpediente() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);

  // Check if we're creating expediente from a document
  const sourceDocument = location.state as { documentId?: string; documentTitle?: string } | null;

  // Pre-fill title if coming from a document
  useEffect(() => {
    if (sourceDocument?.documentTitle && !title) {
      setTitle(`Expediente: ${sourceDocument.documentTitle}`);
    }
  }, [sourceDocument]);

  const createMutation = useMutation({
    mutationFn: createExpediente,
    onSuccess: async (data) => {
      // If created from a document, link the document to the expediente
      if (sourceDocument?.documentId) {
        try {
          await documentsApi.update(sourceDocument.documentId, {
            expedienteId: data.id,
          });
          toast.success(`Expediente ${data.code} creado y documento vinculado exitosamente`);
        } catch (error) {
          console.error('Error linking document:', error);
          toast.success(`Expediente ${data.code} creado`);
          toast.error('No se pudo vincular el documento automáticamente');
        }
      } else {
        toast.success(`Expediente ${data.code} creado exitosamente`);
      }

      queryClient.invalidateQueries({ queryKey: ['expedientes'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });

      // Navigate to the new expediente detail page
      navigate(`/cases/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear expediente');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('El título es requerido');
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <PageHeader
        title="Nuevo Expediente"
        description="Crear un nuevo expediente institucional"
        icon={FolderOpen}
        action={
          <Button
            variant="outline"
            onClick={() => navigate('/cases')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="mt-6">
        {/* Document Source Alert */}
        {sourceDocument && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <FileText className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <p className="font-medium mb-1">Creando expediente desde documento</p>
              <p className="text-sm">
                El documento <span className="font-semibold">"{sourceDocument.documentTitle}"</span> será vinculado automáticamente a este expediente.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Información del Expediente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Ej: Renovación concesión Terminal Norte"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                Título descriptivo del expediente
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <RichTextEditor
                value={description}
                onChange={(value) => setDescription(value)}
                placeholder="Descripción detallada del expediente..."
                minHeight="200px"
              />
              <p className="text-xs text-muted-foreground">
                Opcional. Proporcione detalles adicionales sobre el expediente.
              </p>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">
                Prioridad <span className="text-destructive">*</span>
              </Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Priority.LOW}>
                    <div className="flex items-center gap-2">
                      <span>Baja</span>
                    </div>
                  </SelectItem>
                  <SelectItem value={Priority.MEDIUM}>
                    <div className="flex items-center gap-2">
                      <span>Media</span>
                    </div>
                  </SelectItem>
                  <SelectItem value={Priority.HIGH}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span>Alta</span>
                    </div>
                  </SelectItem>
                  <SelectItem value={Priority.URGENT}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="font-semibold">Urgente</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Nivel de prioridad del expediente
              </p>
            </div>

            {/* Info box */}
            <div className="bg-muted/50 p-4 rounded-lg border">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Información
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• El código del expediente se generará automáticamente (EXP-2026-XXXX)</li>
                {sourceDocument ? (
                  <li>• El documento de origen será vinculado automáticamente</li>
                ) : (
                  <li>• Podrá agregar documentos al expediente una vez creado</li>
                )}
                <li>• El expediente se creará en estado "Abierto"</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/cases')}
                disabled={createMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !title.trim()}
              >
                {createMutation.isPending ? 'Creando...' : 'Crear Expediente'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
