import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api/documents.api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Stamp } from 'lucide-react';

interface ManualEntryStampDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: any;
}

export function ManualEntryStampDialog({
  open,
  onOpenChange,
  document
}: ManualEntryStampDialogProps) {
  const queryClient = useQueryClient();
  const [stampImage, setStampImage] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    entryTime: new Date().toTimeString().slice(0, 5),
    notes: '',
  });

  const applyStampMutation = useMutation({
    mutationFn: async () => {
      return documentsApi.applyManualEntryStamp(document.id, {
        entryDate: new Date(formData.entryDate),
        entryTime: formData.entryTime,
        stampImage: stampImage || undefined,
        notes: formData.notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Sello de entrada manual aplicado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', document.id] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al aplicar el sello de entrada');
    },
  });

  const resetForm = () => {
    setStampImage(null);
    setFormData({
      entryDate: new Date().toISOString().split('T')[0],
      entryTime: new Date().toTimeString().slice(0, 5),
      notes: '',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate image file
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor seleccione un archivo de imagen válido');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El archivo no debe superar los 5MB');
        return;
      }
      setStampImage(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.entryDate) {
      toast.error('Por favor ingrese la fecha de entrada');
      return;
    }

    if (!formData.entryTime) {
      toast.error('Por favor ingrese la hora de entrada');
      return;
    }

    applyStampMutation.mutate();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !applyStampMutation.isPending) {
      resetForm();
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => {
          if (applyStampMutation.isPending) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stamp className="h-5 w-5" />
            Aplicar Sello de Entrada Manual
          </DialogTitle>
          <DialogDescription>
            Registre la entrada física del documento #{document.correlativeNumber}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Entry Date */}
          <div className="space-y-2">
            <Label htmlFor="entryDate">Fecha de Entrada *</Label>
            <Input
              id="entryDate"
              type="date"
              value={formData.entryDate}
              onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
              required
            />
          </div>

          {/* Entry Time */}
          <div className="space-y-2">
            <Label htmlFor="entryTime">Hora de Entrada *</Label>
            <Input
              id="entryTime"
              type="time"
              value={formData.entryTime}
              onChange={(e) => setFormData({ ...formData, entryTime: e.target.value })}
              required
            />
          </div>

          {/* Stamp Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="stampImage">Imagen del Sello (Opcional)</Label>
            <Input
              id="stampImage"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={applyStampMutation.isPending}
            />
            {stampImage && (
              <p className="text-sm text-muted-foreground">
                Archivo seleccionado: {stampImage.name}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Observaciones adicionales..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={applyStampMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={applyStampMutation.isPending}>
              {applyStampMutation.isPending ? 'Aplicando...' : 'Aplicar Sello'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
