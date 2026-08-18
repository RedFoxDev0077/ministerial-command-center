import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  RefreshCw,
  Stamp,
  ScanLine,
  Sparkles,
  Gavel,
  Printer,
  FileCheck,
  FileEdit,
  PenTool,
  CheckCircle,
  Archive,
  FileText,
  Clock,
  Send,
  Bell,
  MailCheck,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { axiosInstance } from '@/lib/api/axios';

interface StatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: any;
}

// Incoming document workflow stages (10 stages)
const incomingStages = [
  {
    value: 'MANUAL_ENTRY',
    label: 'Entrada Manual',
    description: 'Registro inicial del documento',
    icon: Stamp,
    color: 'text-blue-600',
  },
  {
    value: 'SCANNING_ASSIGNED',
    label: 'Escaneo Asignado',
    description: 'Documento asignado para escaneo',
    icon: ScanLine,
    color: 'text-indigo-600',
  },
  {
    value: 'AI_SUMMARY',
    label: 'Resumen IA',
    description: 'Generación de resumen con IA',
    icon: Sparkles,
    color: 'text-purple-600',
  },
  {
    value: 'DECREED',
    label: 'Decretado',
    description: 'Documento decretado',
    icon: Gavel,
    color: 'text-amber-600',
  },
  {
    value: 'DECREE_PRINTED',
    label: 'Decreto Impreso',
    description: 'Decreto físico impreso',
    icon: Printer,
    color: 'text-orange-600',
  },
  {
    value: 'REPORT_RECEIVED',
    label: 'Informe Recibido',
    description: 'Informe o respuesta recibida',
    icon: FileCheck,
    color: 'text-cyan-600',
  },
  {
    value: 'RESPONSE_PREPARED',
    label: 'Respuesta Preparada',
    description: 'Respuesta oficial preparada',
    icon: FileEdit,
    color: 'text-teal-600',
  },
  {
    value: 'SIGNATURE_PROTOCOL',
    label: 'Protocolo de Firma',
    description: 'En proceso de firma ministerial',
    icon: PenTool,
    color: 'text-green-600',
  },
  {
    value: 'ACKNOWLEDGMENT',
    label: 'Acuse de Recibo',
    description: 'Confirmación de entrega',
    icon: CheckCircle,
    color: 'text-blue-600',
  },
  {
    value: 'ARCHIVED',
    label: 'Archivado',
    description: 'Documento archivado',
    icon: Archive,
    color: 'text-gray-600',
  },
];

// Outgoing document workflow stages (5 stages)
const outgoingStages = [
  {
    value: 'DRAFT_CREATION',
    label: 'Creación de Borrador',
    description: 'Borrador en preparación',
    icon: FileText,
    color: 'text-gray-600',
  },
  {
    value: 'SIGNATURE_PROTOCOL',
    label: 'Protocolo de Firma',
    description: 'En proceso de firma ministerial',
    icon: PenTool,
    color: 'text-green-600',
  },
  {
    value: 'PRINTED_SENT',
    label: 'Impreso y Enviado',
    description: 'Documento físico enviado',
    icon: Send,
    color: 'text-blue-600',
  },
  {
    value: 'AWAITING_RESPONSE',
    label: 'Esperando Respuesta',
    description: 'Aguardando respuesta externa',
    icon: Clock,
    color: 'text-yellow-600',
  },
  {
    value: 'RESPONSE_RECEIVED',
    label: 'Respuesta Recibida',
    description: 'Respuesta externa recibida',
    icon: MailCheck,
    color: 'text-green-600',
  },
];

export function StatusChangeDialog({ open, onOpenChange, document }: StatusChangeDialogProps) {
  const [selectedStage, setSelectedStage] = useState<string>(document?.currentStage || '');
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();

  // Determine which stages to show based on document direction
  const availableStages = document?.direction === 'IN' ? incomingStages : outgoingStages;

  // Update stage mutation
  const stageMutation = useMutation({
    mutationFn: async (data: { currentStage: string; comment?: string }) => {
      const response = await axiosInstance.patch(`/documents/${document.id}/stage`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-documents'] });
      toast.success('Etapa actualizada exitosamente');
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar etapa');
    },
  });

  const handleClose = () => {
    setSelectedStage(document?.currentStage || '');
    setComment('');
    onOpenChange(false);
  };

  const handleUpdate = () => {
    if (!selectedStage) {
      toast.error('Por favor seleccione una etapa');
      return;
    }

    if (selectedStage === document?.currentStage) {
      toast.info('La etapa no ha cambiado');
      return;
    }

    stageMutation.mutate({
      currentStage: selectedStage,
      comment: comment.trim() || undefined,
    });
  };

  const currentStageInfo = availableStages.find((s) => s.value === (selectedStage || document?.currentStage));
  const CurrentIcon = currentStageInfo?.icon || RefreshCw;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Cambiar Estado del Documento
          </DialogTitle>
          <DialogDescription>
            Actualizar el estado del documento según su progreso
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Document Info */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">{document?.title}</p>
            <p className="text-xs text-muted-foreground">{document?.correlativeNumber}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Dirección: {document?.direction === 'IN' ? 'Bandeja de Entrada' : 'Bandeja de Salida'}
            </p>
          </div>

          {/* Current Stage Display */}
          <div className="p-3 rounded-lg border bg-card">
            <Label className="text-xs text-muted-foreground">Estado Actual</Label>
            <div className="flex items-center gap-2 mt-1">
              <CurrentIcon className={`h-5 w-5 ${currentStageInfo?.color || 'text-muted-foreground'}`} />
              <div>
                <p className="font-medium text-sm">{currentStageInfo?.label || 'Sin etapa'}</p>
                <p className="text-xs text-muted-foreground">{currentStageInfo?.description || 'No establecido'}</p>
              </div>
            </div>
          </div>

          {/* Stage Selection */}
          <div className="space-y-2">
            <Label htmlFor="stage">Nuevo Estado *</Label>
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione una etapa" />
              </SelectTrigger>
              <SelectContent className="max-h-[400px]">
                {availableStages.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-3 py-1">
                        <Icon className={`h-4 w-4 ${option.color}`} />
                        <div className="flex flex-col">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Comment Field */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comentario (opcional)</Label>
            <Textarea
              id="comment"
              placeholder="Ej: Documento procesado correctamente..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              El comentario se registrará en el historial del documento
            </p>
          </div>

          {/* Workflow Flow Info */}
          {document?.direction === 'IN' ? (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                📋 Flujo de documentos entrantes (10 etapas):
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                Entrada Manual → Escaneo → Resumen IA → Decretado → Decreto Impreso → Informe Recibido → Respuesta Preparada → Firma → Acuse → Archivado
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <p className="text-xs font-medium text-green-900 dark:text-green-100 mb-1">
                📤 Flujo de documentos salientes (5 etapas):
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 leading-relaxed">
                Borrador → Firma → Impreso y Enviado → Esperando Respuesta → Respuesta Recibida
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={stageMutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={stageMutation.isPending || selectedStage === document?.currentStage || !selectedStage}
          >
            {stageMutation.isPending ? 'Actualizando...' : 'Cambiar Estado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
