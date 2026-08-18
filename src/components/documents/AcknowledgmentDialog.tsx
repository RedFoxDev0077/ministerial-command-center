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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckCircle, FileText } from 'lucide-react';

interface AcknowledgmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: any;
}

export function AcknowledgmentDialog({
  open,
  onOpenChange,
  document
}: AcknowledgmentDialogProps) {
  const queryClient = useQueryClient();
  const [acknowledgmentFile, setAcknowledgmentFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    acknowledgmentType: 'MANUAL' as 'MANUAL' | 'STAMP' | 'DIGITAL',
    acknowledgmentDate: new Date().toISOString().split('T')[0],
    acknowledgedBy: '',
    notes: '',
  });

  const recordAcknowledgmentMutation = useMutation({
    mutationFn: async () => {
      return documentsApi.recordAcknowledgment(document.id, {
        acknowledgmentType: formData.acknowledgmentType,
        acknowledgmentDate: new Date(formData.acknowledgmentDate),
        acknowledgedBy: formData.acknowledgedBy,
        acknowledgmentFile: acknowledgmentFile || undefined,
        notes: formData.notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Acuse de recibo generado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', document.id] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al generar el acuse');
    },
  });

  const resetForm = () => {
    setAcknowledgmentFile(null);
    setFormData({
      acknowledgmentType: 'MANUAL',
      acknowledgmentDate: new Date().toISOString().split('T')[0],
      acknowledgedBy: '',
      notes: '',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate PDF file
      if (file.type !== 'application/pdf') {
        toast.error('Por favor seleccione un archivo PDF');
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('El archivo no debe superar los 10MB');
        return;
      }
      setAcknowledgmentFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.acknowledgmentDate) {
      toast.error('Por favor ingrese la fecha del acuse');
      return;
    }

    if (!formData.acknowledgedBy || formData.acknowledgedBy.trim() === '') {
      toast.error('Por favor ingrese quién recibió el documento');
      return;
    }

    recordAcknowledgmentMutation.mutate();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !recordAcknowledgmentMutation.isPending) {
      resetForm();
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => {
          if (recordAcknowledgmentMutation.isPending) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Generar Acuse de Recibo
          </DialogTitle>
          <DialogDescription>
            Genere el acuse de recibo para el documento #{document.correlativeNumber}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Acknowledgment Type */}
          <div className="space-y-2">
            <Label htmlFor="acknowledgmentType">Tipo de Acuse *</Label>
            <Select
              value={formData.acknowledgmentType}
              onValueChange={(value) =>
                setFormData({ ...formData, acknowledgmentType: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                <SelectItem value="MANUAL">Acuse Manual Firmado</SelectItem>
                <SelectItem value="STAMP">Acuse con Sello</SelectItem>
                <SelectItem value="DIGITAL">Acuse Digital con QR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Acknowledgment Date */}
          <div className="space-y-2">
            <Label htmlFor="acknowledgmentDate">Fecha del Acuse *</Label>
            <Input
              id="acknowledgmentDate"
              type="date"
              value={formData.acknowledgmentDate}
              onChange={(e) =>
                setFormData({ ...formData, acknowledgmentDate: e.target.value })
              }
              required
            />
          </div>

          {/* Acknowledged By */}
          <div className="space-y-2">
            <Label htmlFor="acknowledgedBy">Recibido por *</Label>
            <Input
              id="acknowledgedBy"
              placeholder="Nombre completo del receptor..."
              value={formData.acknowledgedBy}
              onChange={(e) =>
                setFormData({ ...formData, acknowledgedBy: e.target.value })
              }
              required
            />
          </div>

          {/* Acknowledgment File Upload */}
          <div className="space-y-2">
            <Label htmlFor="acknowledgmentFile">
              Archivo Escaneado (PDF - Opcional)
            </Label>
            <Input
              id="acknowledgmentFile"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              disabled={recordAcknowledgmentMutation.isPending}
            />
            {acknowledgmentFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{acknowledgmentFile.name}</span>
              </div>
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
              disabled={recordAcknowledgmentMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={recordAcknowledgmentMutation.isPending}>
              {recordAcknowledgmentMutation.isPending ? 'Generando...' : 'Generar Acuse'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
