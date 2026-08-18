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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, Calculator, CheckCircle, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { axiosInstance } from '@/lib/api/axios';
import { calculateDeadline, DeadlineType } from '@/lib/api/deadlines.api';

interface DeadlineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: any;
}

export function DeadlineDialog({ open, onOpenChange, document }: DeadlineDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadlineType, setDeadlineType] = useState<DeadlineType>('BUSINESS_HOURS');
  const [quantity, setQuantity] = useState<number>(48);
  const [calculatedDueDate, setCalculatedDueDate] = useState<string>('');
  const [manualDueDate, setManualDueDate] = useState<Date>();
  const [dateSelectionMode, setDateSelectionMode] = useState<'auto' | 'manual'>('auto');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const queryClient = useQueryClient();

  // Calculate deadline mutation
  const calculateMutation = useMutation({
    mutationFn: calculateDeadline,
    onSuccess: (data) => {
      setCalculatedDueDate(data.dueDate);
      toast.success('Fecha límite calculada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al calcular plazo');
    },
  });

  // Create deadline mutation
  const createDeadlineMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axiosInstance.post('/deadlines', {
        ...data,
        documentId: document.id,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
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
    setDeadlineType('BUSINESS_HOURS');
    setQuantity(48);
    setCalculatedDueDate('');
    setManualDueDate(undefined);
    setDateSelectionMode('auto');
    setPriority('MEDIUM');
    onOpenChange(false);
  };

  const handleCalculate = () => {
    if (quantity <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }

    calculateMutation.mutate({
      deadlineType,
      quantity,
    });
  };

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error('El título es requerido');
      return;
    }

    // Validate based on mode
    if (dateSelectionMode === 'auto' && !calculatedDueDate) {
      toast.error('Debe calcular la fecha límite primero');
      return;
    }

    if (dateSelectionMode === 'manual' && !manualDueDate) {
      toast.error('Debe seleccionar una fecha límite');
      return;
    }

    // Use the appropriate date based on mode
    const finalDueDate = dateSelectionMode === 'auto' ? calculatedDueDate : manualDueDate!.toISOString();

    createDeadlineMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: finalDueDate,
      priority,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Establecer Plazo
          </DialogTitle>
          <DialogDescription>
            Configure un plazo con cálculo automático de fecha límite
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Document Info */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">{document?.title}</p>
            <p className="text-xs text-muted-foreground">{document?.correlativeNumber}</p>
          </div>

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

          {/* Date Selection Tabs */}
          <Tabs value={dateSelectionMode} onValueChange={(value) => setDateSelectionMode(value as 'auto' | 'manual')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="auto" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Cálculo Automático
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Seleccionar Fecha
              </TabsTrigger>
            </TabsList>

            {/* Automatic Calculation Tab */}
            <TabsContent value="auto" className="space-y-4 mt-4">
              {/* Deadline Type and Quantity */}
              <div className="grid grid-cols-2 gap-4">
                {/* Deadline Type */}
                <div className="space-y-2">
                  <Label htmlFor="deadlineType">Tipo *</Label>
                  <Select value={deadlineType} onValueChange={(value) => setDeadlineType(value as DeadlineType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUSINESS_HOURS">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Horas Hábiles</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="CALENDAR_DAYS">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Días Calendario</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="quantity">Cantidad *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max="1000"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    placeholder={deadlineType === 'BUSINESS_HOURS' ? 'Horas' : 'Días'}
                  />
                </div>
              </div>

              {/* Helper text */}
              <div className="text-xs text-muted-foreground space-y-1">
                {deadlineType === 'BUSINESS_HOURS' ? (
                  <>
                    <p>🕐 <strong>Horas Hábiles:</strong> Lunes a Viernes, 8:00 AM - 6:00 PM</p>
                    <p>🏝️ Excluye fines de semana y festivos de Guinea Ecuatorial</p>
                  </>
                ) : (
                  <>
                    <p>📅 <strong>Días Calendario:</strong> Incluye todos los días</p>
                    <p>🌍 No excluye fines de semana ni festivos</p>
                  </>
                )}
              </div>

              {/* Calculate Button */}
              <Button
                onClick={handleCalculate}
                disabled={calculateMutation.isPending || quantity <= 0}
                className="w-full"
                variant="outline"
              >
                <Calculator className="h-4 w-4 mr-2" />
                {calculateMutation.isPending ? 'Calculando...' : 'Calcular Fecha Límite'}
              </Button>

              {/* Calculated Due Date - Read Only */}
              {calculatedDueDate && (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">Fecha Límite Calculada</span>
                  </div>
                  <p className="text-xl font-bold text-green-900 dark:text-green-100">
                    {format(new Date(calculatedDueDate), "d 'de' MMMM 'de' yyyy, h:mm a", { locale: es })}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {deadlineType === 'BUSINESS_HOURS'
                      ? `${quantity} horas hábiles a partir de ahora`
                      : `${quantity} días calendario a partir de ahora`}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Manual Date Selection Tab */}
            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Fecha de Vencimiento *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !manualDueDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {manualDueDate ? format(manualDueDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                    <Calendar
                      mode="single"
                      selected={manualDueDate}
                      onSelect={setManualDueDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Manual Date Preview */}
              {manualDueDate && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">Fecha Seleccionada</span>
                  </div>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                    {format(manualDueDate, "d 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

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
            disabled={
              createDeadlineMutation.isPending ||
              !title ||
              (dateSelectionMode === 'auto' && !calculatedDueDate) ||
              (dateSelectionMode === 'manual' && !manualDueDate)
            }
          >
            {createDeadlineMutation.isPending ? 'Creando...' : 'Crear Plazo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
