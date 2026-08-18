import { useParams, useNavigate } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  FileText,
  Clock,
  Calendar,
  CheckCircle,
  FolderOpen,
  ExternalLink,
  Plus,
  Search,
} from 'lucide-react';
import { getExpediente, ExpStatus } from '@/lib/api/expedientes.api';
import { documentsApi } from '@/lib/api/documents.api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addDocDialogOpen, setAddDocDialogOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [docSearch, setDocSearch] = useState('');

  // Fetch expediente with React Query
  const { data: expediente, isLoading } = useQuery({
    queryKey: ['expediente', id],
    queryFn: () => getExpediente(id!),
    enabled: !!id,
  });

  // Fetch available documents for adding to expediente
  const { data: availableDocs } = useQuery({
    queryKey: ['documents', 'available'],
    queryFn: () => documentsApi.findAll({ limit: 100 }),
    enabled: addDocDialogOpen,
  });

  // Mutation to add document to expediente
  const addDocMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return documentsApi.update(documentId, {
        expedienteId: id,
      });
    },
    onSuccess: () => {
      toast.success('Documento agregado al expediente exitosamente');
      queryClient.invalidateQueries({ queryKey: ['expediente', id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setAddDocDialogOpen(false);
      setSelectedDocId('');
      setDocSearch('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al agregar documento');
    },
  });

  // Filter available documents (exclude those already in this expediente)
  const filteredDocs = (availableDocs?.data || []).filter((doc: any) => {
    const matchesSearch = !docSearch ||
      doc.title.toLowerCase().includes(docSearch.toLowerCase()) ||
      doc.correlativeNumber?.toLowerCase().includes(docSearch.toLowerCase());
    const notInExpediente = doc.expedienteId !== id;
    return matchesSearch && notInExpediente;
  });

  // Memoized navigation handlers to prevent React DOM errors
  const handleBack = useCallback(() => {
    navigate('/cases');
  }, [navigate]);

  const handleViewDocument = useCallback((documentId: string) => {
    navigate(`/document/${documentId}`); // Navigate to document detail page
  }, [navigate]);

  const handleAddDocument = useCallback(() => {
    if (!selectedDocId) {
      toast.error('Debe seleccionar un documento');
      return;
    }
    addDocMutation.mutate(selectedDocId);
  }, [selectedDocId, addDocMutation]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!expediente) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="mt-12 text-center text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p>Expediente no encontrado</p>
        </div>
      </div>
    );
  }

  const relatedDocs = expediente.documents || [];
  const relatedDeadlines = expediente.deadlines || [];

  const statusLabels: Record<string, string> = {
    [ExpStatus.OPEN]: 'Abierto',
    [ExpStatus.IN_PROGRESS]: 'En Progreso',
    [ExpStatus.CLOSED]: 'Cerrado',
    [ExpStatus.ARCHIVED]: 'Archivado',
  };

  const statusVariants: Record<string, 'success' | 'warning' | 'info' | 'muted'> = {
    [ExpStatus.OPEN]: 'info',
    [ExpStatus.IN_PROGRESS]: 'warning',
    pending_signature: 'warning',
    closed: 'success',
    archived: 'muted',
  };

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <Button variant="ghost" onClick={handleBack} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a expedientes
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{expediente.title}</h1>
            <StatusBadge variant={statusVariants[expediente.status]}>
              {statusLabels[expediente.status]}
            </StatusBadge>
          </div>
          <p className="text-muted-foreground font-mono mt-1">{expediente.code}</p>
        </div>
      </div>

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="documents">Documentos ({relatedDocs.length})</TabsTrigger>
          <TabsTrigger value="deadlines">Plazos ({relatedDeadlines.length})</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Información general</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <dt className="text-sm text-muted-foreground">Fecha de inicio</dt>
                      <dd className="font-medium">{format(new Date(expediente.startDate), "d 'de' MMMM 'de' yyyy", { locale: es })}</dd>
                    </div>
                  </div>
                  {expediente.closedDate && (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <dt className="text-sm text-muted-foreground">Fecha de cierre</dt>
                        <dd className="font-medium">{format(new Date(expediente.closedDate), "d 'de' MMMM 'de' yyyy", { locale: es })}</dd>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <dt className="text-sm text-muted-foreground">Fecha de creación</dt>
                      <dd className="font-medium">{format(new Date(expediente.createdAt), "d 'de' MMMM 'de' yyyy", { locale: es })}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <dt className="text-sm text-muted-foreground">Última actualización</dt>
                      <dd className="font-medium">{format(new Date(expediente.updatedAt), "d 'de' MMMM 'de' yyyy", { locale: es })}</dd>
                    </div>
                  </div>
                </dl>
                {expediente.description && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="text-sm font-medium mb-2">Descripción</h4>
                    <p className="text-sm text-muted-foreground">{expediente.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Estadísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Documentos</span>
                  <Badge variant="secondary">{expediente._count?.documents || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Plazos</span>
                  <Badge variant="secondary">{expediente._count?.deadlines || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estado</span>
                  <StatusBadge variant={statusVariants[expediente.status]}>
                    {statusLabels[expediente.status]}
                  </StatusBadge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Documentos asociados</CardTitle>
              <Button
                size="sm"
                onClick={() => setAddDocDialogOpen(true)}
                className="h-8"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Documento
              </Button>
            </CardHeader>
            <CardContent>
              {relatedDocs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay documentos asociados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {relatedDocs.map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                    >
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">{doc.correlativeNumber}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(doc.createdAt), 'dd MMM yyyy', { locale: es })}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleViewDocument(doc.id)}
                          title="Ver documento"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deadlines Tab */}
        <TabsContent value="deadlines">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plazos y alertas</CardTitle>
            </CardHeader>
            <CardContent>
              {relatedDeadlines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay plazos programados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {relatedDeadlines.map(deadline => {
                    const dueDate = new Date(deadline.dueDate);
                    const now = new Date();
                    const isOverdue = dueDate < now;
                    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const isUrgent = daysUntilDue <= 3 && daysUntilDue >= 0;

                    return (
                      <div key={deadline.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <div className={cn(
                          'h-8 w-8 rounded-lg flex items-center justify-center',
                          isOverdue ? 'bg-destructive/10 text-destructive' :
                          isUrgent ? 'bg-warning/10 text-warning' :
                          'bg-muted text-muted-foreground'
                        )}>
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{deadline.title}</p>
                          {deadline.description && (
                            <p className="text-xs text-muted-foreground">{deadline.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{format(dueDate, 'dd MMM yyyy', { locale: es })}</p>
                          <StatusBadge
                            variant={
                              isOverdue ? 'destructive' :
                              isUrgent ? 'warning' : 'muted'
                            }
                            className="text-xs"
                          >
                            {isOverdue ? 'Vencido' :
                             isUrgent ? 'Urgente' : 'Próximo'}
                          </StatusBadge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Document Dialog */}
      <Dialog open={addDocDialogOpen} onOpenChange={setAddDocDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Agregar Documento al Expediente
            </DialogTitle>
            <DialogDescription>
              Seleccione un documento existente para agregarlo a este expediente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Expediente Info */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm font-medium">Expediente:</p>
              <p className="text-sm text-muted-foreground">{expediente?.title}</p>
              <p className="text-xs text-muted-foreground font-mono">{expediente?.code}</p>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="doc-search">Buscar documento</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="doc-search"
                  placeholder="Buscar por título o número..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Document Selector */}
            <div className="space-y-2">
              <Label htmlFor="document">Documento *</Label>
              <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar documento..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {filteredDocs.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No hay documentos disponibles
                    </div>
                  ) : (
                    filteredDocs.map((doc: any) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        <div className="flex flex-col py-1">
                          <span className="font-medium">{doc.title}</span>
                          <span className="text-xs text-muted-foreground">{doc.correlativeNumber}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Solo se muestran documentos que no están en este expediente
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddDocDialogOpen(false);
                setSelectedDocId('');
                setDocSearch('');
              }}
              disabled={addDocMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddDocument}
              disabled={addDocMutation.isPending || !selectedDocId}
            >
              {addDocMutation.isPending ? 'Agregando...' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
