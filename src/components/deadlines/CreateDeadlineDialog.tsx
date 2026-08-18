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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createDeadline } from '@/lib/api/deadlines.api';

interface CreateDeadlineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateDeadlineDialog({ open, onOpenChange }: CreateDeadlineDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [priority, setPriority] = useState<string>('MEDIUM');
  const queryClient = useQueryClient();

  // Create deadline mutation
  const createDeadlineMutation = useMutation({
    mutationFn: createDeadline,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
      toast.success('Plazo creado exitosamente');
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear plazo');
    },
  });

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setDueDate(undefined);
    setPriority('MEDIUM');
    onOpenChange(false);
  };

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error('El título es requerido');
      return;
    }

    if (!dueDate) {
      toast.error('La fecha de vencimiento es requerida');
      return;
    }

    createDeadlineMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate.toISOString(),
      priority: priority as any,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Crear Plazo
          </DialogTitle>
          <DialogDescription>
            Crear un nuevo plazo o recordatorio
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título del Plazo *</Label>
            <Input
              id="title"
              placeholder="Ej: Revisión de documento, Aprobación final..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Due Date and Priority */}
          <div className="grid grid-cols-2 gap-4">
            {/* Due Date */}
            <div className="space-y-2">
              <Label>Fecha de Vencimiento *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">🟢 Baja</SelectItem>
                  <SelectItem value="MEDIUM">🟡 Media</SelectItem>
                  <SelectItem value="HIGH">🟠 Alta</SelectItem>
                  <SelectItem value="URGENT">🔴 Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Detalles adicionales sobre este plazo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={createDeadlineMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createDeadlineMutation.isPending || !title || !dueDate}
          >
            {createDeadlineMutation.isPending ? 'Creando...' : 'Crear Plazo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
