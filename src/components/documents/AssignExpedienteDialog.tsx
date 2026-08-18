import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FolderOpen, X } from 'lucide-react';
import { getExpedientes } from '@/lib/api/expedientes.api';
import { documentsApi } from '@/lib/api/documents.api';
import { toast } from 'sonner';

interface AssignExpedienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    id: string;
    title: string;
    expedienteId?: string | null;
  };
}

export function AssignExpedienteDialog({
  open,
  onOpenChange,
  document,
}: AssignExpedienteDialogProps) {
  const queryClient = useQueryClient();
  const [selectedExpedienteId, setSelectedExpedienteId] = useState<string>(
    document.expedienteId || ''
  );

  // Fetch expedientes
  const { data: expedientesData, isLoading: loadingExpedientes } = useQuery({
    queryKey: ['expedientes'],
    queryFn: () => getExpedientes({ limit: 100 }),
    enabled: open,
  });

  const expedientes = expedientesData?.data || [];

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (expedienteId: string | undefined) => {
      return documentsApi.update(document.id, {
        expedienteId: expedienteId || undefined,
      });
    },
    onSuccess: (_, expedienteId) => {
      if (expedienteId) {
        const exp = expedientes.find((e: any) => e.id === expedienteId);
        toast.success(
          `Documento asignado a expediente ${exp?.code || ''} exitosamente`
        );
      } else {
        toast.success('Documento removido del expediente');
      }
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['expedientes'] });
      queryClient.invalidateQueries({ queryKey: ['expediente'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al asignar expediente'
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(selectedExpedienteId || undefined);
  };

  const handleClear = () => {
    setSelectedExpedienteId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Asignar a Expediente
            </DialogTitle>
            <DialogDescription>
              Asigne este documento a un expediente existente o remuévalo del
              expediente actual.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            {/* Document Info */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm font-medium">Documento:</p>
              <p className="text-sm text-muted-foreground truncate">
                {document.title}
              </p>
            </div>

            {/* Expediente Selector */}
            <div className="space-y-2">
              <Label htmlFor="expediente">Expediente</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedExpedienteId ? selectedExpedienteId : undefined}
                  onValueChange={setSelectedExpedienteId}
                  disabled={loadingExpedientes || updateMutation.isPending}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccionar expediente o dejar sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    {expedientes
                      .filter((exp: any) => exp.status !== 'ARCHIVED')
                      .map((exp: any) => (
                        <SelectItem key={exp.id} value={exp.id}>
                          <span className="font-mono text-xs text-muted-foreground mr-2">
                            {exp.code}
                          </span>
                          {exp.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {selectedExpedienteId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleClear}
                    title="Limpiar selección"
                    disabled={updateMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedExpedienteId
                  ? 'El documento será asignado al expediente seleccionado'
                  : 'Deje vacío para remover el documento de cualquier expediente'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
