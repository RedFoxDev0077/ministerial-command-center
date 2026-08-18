import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plane,
  Building,
  Users,
  Mail,
  Mic,
  Award,
  Plus,
  Calendar,
  MapPin,
  Clock,
  Trash2,
  Edit,
} from 'lucide-react';
import { agendaApi, type AgendaEvent, type CreateAgendaEventDto } from '@/lib/api/agenda.api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const typeIcons: Record<string, any> = {
  TRIP: Plane,
  VISIT: Building,
  MEETING: Users,
  INVITATION: Mail,
  CONFERENCE: Mic,
  CEREMONY: Award,
};

const typeLabels: Record<string, string> = {
  TRIP: 'Viaje',
  VISIT: 'Visita',
  MEETING: 'Reunión',
  INVITATION: 'Invitación',
  CONFERENCE: 'Conferencia',
  CEREMONY: 'Ceremonia',
};

const statusLabels: Record<string, string> = {
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  POSTPONED: 'Aplazado',
};

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  POSTPONED: 'bg-gray-100 text-gray-800',
};

const typeColors: Record<string, string> = {
  TRIP: 'bg-purple-100 text-purple-800',
  VISIT: 'bg-blue-100 text-blue-800',
  MEETING: 'bg-green-100 text-green-800',
  INVITATION: 'bg-orange-100 text-orange-800',
  CONFERENCE: 'bg-indigo-100 text-indigo-800',
  CEREMONY: 'bg-pink-100 text-pink-800',
};

export default function AgendaPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['agenda'],
    queryFn: () => agendaApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateAgendaEventDto) => agendaApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
      toast.success('Evento creado exitosamente');
      setDialogOpen(false);
    },
    onError: () => toast.error('Error al crear evento'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => agendaApi.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
      toast.success('Evento actualizado');
      setDialogOpen(false);
      setEditingEvent(null);
    },
    onError: () => toast.error('Error al actualizar evento'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => agendaApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
      toast.success('Evento eliminado');
    },
    onError: () => toast.error('Error al eliminar evento'),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const dto: CreateAgendaEventDto = {
      title: form.get('title') as string,
      description: form.get('description') as string || undefined,
      type: form.get('type') as string,
      startDate: form.get('startDate') as string,
      endDate: (form.get('endDate') as string) || undefined,
      location: form.get('location') as string || undefined,
      organizer: form.get('organizer') as string || undefined,
      participants: form.get('participants') as string || undefined,
      priority: form.get('priority') as string || 'MEDIUM',
      notes: form.get('notes') as string || undefined,
    };

    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, dto: { ...dto, status: form.get('status') as string } });
    } else {
      createMutation.mutate(dto);
    }
  };

  const upcoming = events.filter(e => e.status === 'SCHEDULED' || e.status === 'IN_PROGRESS');
  const completed = events.filter(e => e.status === 'COMPLETED');
  const cancelled = events.filter(e => e.status === 'CANCELLED' || e.status === 'POSTPONED');

  const filterEvents = (list: AgendaEvent[]) =>
    filterType === 'ALL' ? list : list.filter(e => e.type === filterType);

  const renderEventCard = (event: AgendaEvent) => {
    const Icon = typeIcons[event.type] || Calendar;
    return (
      <Card key={event.id} className="hover:border-primary/30 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={`p-2 rounded-lg shrink-0 ${typeColors[event.type]}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-medium text-sm truncate">{event.title}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(event.startDate), 'dd MMM yyyy, HH:mm', { locale: es })}
                </div>
                {event.location && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {event.location}
                  </div>
                )}
                {event.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge className={`text-[10px] ${statusColors[event.status]}`}>
                {statusLabels[event.status]}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {typeLabels[event.type]}
              </Badge>
              <div className="flex gap-1 mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => { setEditingEvent(event); setDialogOpen(true); }}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive"
                  onClick={() => deleteMutation.mutate(event.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in safe-area-inset">
      <PageHeader
        title="Agenda Institucional"
        description="Viajes, visitas oficiales, reuniones e invitaciones del Ministerio"
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los tipos</SelectItem>
            <SelectItem value="TRIP">Viajes</SelectItem>
            <SelectItem value="VISIT">Visitas</SelectItem>
            <SelectItem value="MEETING">Reuniones</SelectItem>
            <SelectItem value="INVITATION">Invitaciones</SelectItem>
            <SelectItem value="CONFERENCE">Conferencias</SelectItem>
            <SelectItem value="CEREMONY">Ceremonias</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => { setEditingEvent(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Evento
        </Button>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming" className="gap-2">
            <Clock className="h-4 w-4" />
            Próximos
            <Badge variant="secondary" className="ml-1">{filterEvents(upcoming).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            Completados
            <Badge variant="secondary" className="ml-1">{filterEvents(completed).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="gap-2">
            Cancelados
            <Badge variant="secondary" className="ml-1">{filterEvents(cancelled).length}</Badge>
          </TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Cargando agenda...</div>
        ) : (
          <>
            <TabsContent value="upcoming" className="space-y-3">
              {filterEvents(upcoming).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No hay eventos próximos</p>
                </div>
              ) : filterEvents(upcoming).map(renderEventCard)}
            </TabsContent>
            <TabsContent value="completed" className="space-y-3">
              {filterEvents(completed).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No hay eventos completados</div>
              ) : filterEvents(completed).map(renderEventCard)}
            </TabsContent>
            <TabsContent value="cancelled" className="space-y-3">
              {filterEvents(cancelled).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No hay eventos cancelados</div>
              ) : filterEvents(cancelled).map(renderEventCard)}
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingEvent(null); }}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[600px] flex flex-col max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>{editingEvent ? 'Editar Evento' : 'Nuevo Evento'}</DialogTitle>
            <DialogDescription>
              {editingEvent ? 'Modificar los datos del evento' : 'Crear un nuevo evento en la agenda institucional'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="title">Título *</Label>
                <Input id="title" name="title" required defaultValue={editingEvent?.title} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="type">Tipo *</Label>
                  <Select name="type" defaultValue={editingEvent?.type || 'MEETING'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRIP">Viaje</SelectItem>
                      <SelectItem value="VISIT">Visita</SelectItem>
                      <SelectItem value="MEETING">Reunión</SelectItem>
                      <SelectItem value="INVITATION">Invitación</SelectItem>
                      <SelectItem value="CONFERENCE">Conferencia</SelectItem>
                      <SelectItem value="CEREMONY">Ceremonia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="priority">Prioridad</Label>
                  <Select name="priority" defaultValue={editingEvent?.priority || 'MEDIUM'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Baja</SelectItem>
                      <SelectItem value="MEDIUM">Media</SelectItem>
                      <SelectItem value="HIGH">Alta</SelectItem>
                      <SelectItem value="URGENT">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {editingEvent && (
                <div className="space-y-1.5">
                  <Label htmlFor="status">Estado</Label>
                  <Select name="status" defaultValue={editingEvent.status}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SCHEDULED">Programado</SelectItem>
                      <SelectItem value="IN_PROGRESS">En curso</SelectItem>
                      <SelectItem value="COMPLETED">Completado</SelectItem>
                      <SelectItem value="CANCELLED">Cancelado</SelectItem>
                      <SelectItem value="POSTPONED">Aplazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">Fecha inicio *</Label>
                  <Input id="startDate" name="startDate" type="datetime-local" required defaultValue={editingEvent ? editingEvent.startDate.slice(0, 16) : ''} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate">Fecha fin</Label>
                  <Input id="endDate" name="endDate" type="datetime-local" defaultValue={editingEvent?.endDate?.slice(0, 16) || ''} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Ubicación</Label>
                <Input id="location" name="location" placeholder="Lugar del evento..." defaultValue={editingEvent?.location || ''} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="organizer">Organizador</Label>
                  <Input id="organizer" name="organizer" defaultValue={editingEvent?.organizer || ''} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="participants">Participantes</Label>
                  <Input id="participants" name="participants" placeholder="Nombres separados por coma" defaultValue={editingEvent?.participants || ''} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" name="description" rows={2} defaultValue={editingEvent?.description || ''} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notas</Label>
                <Textarea id="notes" name="notes" rows={2} defaultValue={editingEvent?.notes || ''} />
              </div>
            </div>
            <DialogFooter className="px-6 pb-6 pt-2 shrink-0 border-t">
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditingEvent(null); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingEvent ? 'Guardar Cambios' : 'Crear Evento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
