import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DataTableSkeleton } from '@/components/ui/data-table-skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  PenTool,
  User,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Eye,
} from 'lucide-react';
import {
  getSignatureFlows,
  signDocument,
  rejectDocument,
  SignatureFlow,
  SignatureStatus,
  ParticipantStatus,
} from '@/lib/api/signature-flows.api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function SignaturePage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedFlow, setSelectedFlow] = useState<SignatureFlow | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch all signature flows
  const { data: flows = [], isLoading } = useQuery({
    queryKey: ['signature-flows'],
    queryFn: () => getSignatureFlows(),
  });

  // Sign mutation
  const signMutation = useMutation({
    mutationFn: (flowId: string) => signDocument(flowId, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-flows'] });
      toast.success('Documento firmado exitosamente');
      setSelectedFlow(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al firmar documento');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ flowId, reason }: { flowId: string; reason: string }) =>
      rejectDocument(flowId, { rejectionReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-flows'] });
      toast.success('Documento rechazado');
      setSelectedFlow(null);
      setRejectDialogOpen(false);
      setRejectionReason('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al rechazar documento');
    },
  });

  const handleSign = () => {
    if (!selectedFlow) return;
    signMutation.mutate(selectedFlow.id);
  };

  const handleReject = () => {
    if (!selectedFlow || !rejectionReason.trim()) {
      toast.error('Por favor ingrese un motivo de rechazo');
      return;
    }
    rejectMutation.mutate({ flowId: selectedFlow.id, reason: rejectionReason });
  };

  const handleViewDocument = (documentId: string) => {
    const correlativeNumber = selectedFlow?.document?.correlativeNumber || '';
    const isOutgoing = correlativeNumber.startsWith('SAL');
    navigate(isOutgoing ? '/outbox' : '/inbox', { state: { openDocumentId: documentId } });
  };

  // Filter flows by status
  const pendingFlows = flows.filter(f => f.status === SignatureStatus.PENDING || f.status === SignatureStatus.IN_PROGRESS);
  const signedFlows = flows.filter(f => f.status === SignatureStatus.SIGNED);
  const rejectedFlows = flows.filter(f => f.status === SignatureStatus.REJECTED || f.status === SignatureStatus.CANCELLED);

  const statusVariants: Record<SignatureStatus, 'warning' | 'success' | 'destructive' | 'info' | 'muted'> = {
    [SignatureStatus.PENDING]: 'warning',
    [SignatureStatus.IN_PROGRESS]: 'info',
    [SignatureStatus.SIGNED]: 'success',
    [SignatureStatus.REJECTED]: 'destructive',
    [SignatureStatus.CANCELLED]: 'muted',
  };

  const statusLabels: Record<SignatureStatus, string> = {
    [SignatureStatus.PENDING]: 'Pendiente',
    [SignatureStatus.IN_PROGRESS]: 'En Progreso',
    [SignatureStatus.SIGNED]: 'Firmado',
    [SignatureStatus.REJECTED]: 'Rechazado',
    [SignatureStatus.CANCELLED]: 'Cancelado',
  };

  const participantStatusLabels: Record<ParticipantStatus, string> = {
    [ParticipantStatus.PENDING]: 'Pendiente',
    [ParticipantStatus.SIGNED]: 'Firmado',
    [ParticipantStatus.REJECTED]: 'Rechazado',
  };

  // Check if current user can sign
  const canUserSign = (flow: SignatureFlow): boolean => {
    if (!user) return false;
    const participant = flow.participants.find(p => p.userId === user.id);
    return participant?.status === ParticipantStatus.PENDING;
  };

  const renderFlowCard = (flow: SignatureFlow) => {
    const userParticipant = flow.participants.find(p => p.userId === user?.id);
    const signedCount = flow.participants.filter(p => p.status === ParticipantStatus.SIGNED).length;
    const totalCount = flow.participants.length;

    return (
      <Card
        key={flow.id}
        className={cn(
          'cursor-pointer transition-colors',
          selectedFlow?.id === flow.id ? 'border-primary' : 'hover:border-primary/20'
        )}
        onClick={() => setSelectedFlow(flow)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <StatusBadge variant={statusVariants[flow.status]}>
              {flow.status === SignatureStatus.PENDING && <Clock className="h-3 w-3" />}
              {flow.status === SignatureStatus.IN_PROGRESS && <Clock className="h-3 w-3" />}
              {flow.status === SignatureStatus.SIGNED && <CheckCircle className="h-3 w-3" />}
              {(flow.status === SignatureStatus.REJECTED || flow.status === SignatureStatus.CANCELLED) && (
                <XCircle className="h-3 w-3" />
              )}
              <span className="ml-1">{statusLabels[flow.status]}</span>
            </StatusBadge>
            <Badge variant="outline" className="text-[10px]">
              {signedCount}/{totalCount}
            </Badge>
          </div>
          <h3 className="font-medium text-sm mb-1">{flow.title}</h3>
          <p className="text-xs text-muted-foreground mb-2">{flow.document?.correlativeNumber}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>
              {flow.createdBy.firstName} {flow.createdBy.lastName}
            </span>
          </div>
          {userParticipant && (
            <div className="mt-2 pt-2 border-t">
              <Badge variant={userParticipant.status === ParticipantStatus.SIGNED ? 'success' : 'warning'} className="text-[10px]">
                {participantStatusLabels[userParticipant.status]}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in safe-area-inset">
      <PageHeader
        title={t('signature.title')}
        description={t('signature.description')}
      />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Flows List */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="pending">
            <TabsList className="mb-4 w-full justify-start overflow-x-auto">
              <TabsTrigger value="pending" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Pendiente</span>
                <Badge variant="secondary" className="ml-1 text-[10px] sm:text-xs">
                  {pendingFlows.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="signed" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Firmado</span>
                <Badge variant="secondary" className="ml-1 text-[10px] sm:text-xs">
                  {signedFlows.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Rechazado</span>
                <Badge variant="secondary" className="ml-1 text-[10px] sm:text-xs">
                  {rejectedFlows.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {isLoading ? (
              <DataTableSkeleton columns={3} rows={3} />
            ) : (
              <>
                <TabsContent value="pending" className="grid gap-3 sm:grid-cols-2">
                  {pendingFlows.length === 0 ? (
                    <p className="text-muted-foreground col-span-2 text-center py-8">
                      No hay documentos pendientes de firma
                    </p>
                  ) : (
                    pendingFlows.map(renderFlowCard)
                  )}
                </TabsContent>
                <TabsContent value="signed" className="grid gap-3 sm:grid-cols-2">
                  {signedFlows.length === 0 ? (
                    <p className="text-muted-foreground col-span-2 text-center py-8">No hay documentos firmados</p>
                  ) : (
                    signedFlows.map(renderFlowCard)
                  )}
                </TabsContent>
                <TabsContent value="rejected" className="grid gap-3 sm:grid-cols-2">
                  {rejectedFlows.length === 0 ? (
                    <p className="text-muted-foreground col-span-2 text-center py-8">No hay documentos rechazados</p>
                  ) : (
                    rejectedFlows.map(renderFlowCard)
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>

        {/* Detail Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalles del flujo</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedFlow ? (
              <div className="space-y-6">
                {/* Document Info */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Documento</h4>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium">{selectedFlow.document?.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {selectedFlow.document?.correlativeNumber}
                    </p>
                    {selectedFlow.document?.expediente && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Exp: {selectedFlow.document.expediente.code}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selectedFlow.description && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Instrucciones</h4>
                    <p className="text-sm text-muted-foreground">{selectedFlow.description}</p>
                  </div>
                )}

                {/* Participants */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Participantes ({selectedFlow.participants.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedFlow.participants.map((participant) => (
                      <div
                        key={participant.id}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-lg',
                          participant.status === ParticipantStatus.SIGNED
                            ? 'bg-success/10 border border-success/20'
                            : participant.status === ParticipantStatus.REJECTED
                            ? 'bg-destructive/10 border border-destructive/20'
                            : 'bg-muted/50'
                        )}
                      >
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {participant.user.firstName} {participant.user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{participant.user.email}</p>
                          {participant.signedAt && (
                            <p className="text-xs text-muted-foreground">
                              Firmado: {format(new Date(participant.signedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </p>
                          )}
                          {participant.rejectedAt && (
                            <p className="text-xs text-destructive">
                              Rechazado: {format(new Date(participant.rejectedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </p>
                          )}
                        </div>
                        {participant.status === ParticipantStatus.SIGNED && (
                          <CheckCircle className="h-4 w-4 text-success shrink-0" />
                        )}
                        {participant.status === ParticipantStatus.REJECTED && (
                          <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        )}
                        {participant.status === ParticipantStatus.PENDING && (
                          <Clock className="h-4 w-4 text-warning shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rejection Reason */}
                {selectedFlow.participants.some(p => p.rejectionReason) && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-destructive">Motivo de Rechazo</h4>
                    {selectedFlow.participants
                      .filter(p => p.rejectionReason)
                      .map(p => (
                        <div key={p.id} className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                          <p className="text-sm font-medium mb-1">
                            {p.user.firstName} {p.user.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{p.rejectionReason}</p>
                        </div>
                      ))}
                  </div>
                )}

                {/* Metadata */}
                <div className="space-y-2 pt-3 border-t">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Creado por:</span>
                    <span className="font-medium">
                      {selectedFlow.createdBy.firstName} {selectedFlow.createdBy.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Fecha de creación:</span>
                    <span>{format(new Date(selectedFlow.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
                  </div>
                  {selectedFlow.completedAt && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Completado:</span>
                      <span>{format(new Date(selectedFlow.completedAt), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDocument(selectedFlow.documentId)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Documento
                  </Button>

                  {canUserSign(selectedFlow) && (
                    <>
                      <Button
                        size="sm"
                        onClick={handleSign}
                        disabled={signMutation.isPending}
                      >
                        <PenTool className="h-4 w-4 mr-2" />
                        {signMutation.isPending ? 'Firmando...' : 'Firmar Documento'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setRejectDialogOpen(true)}
                        disabled={rejectMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rechazar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <PenTool className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Selecciona un flujo para ver los detalles</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Rechazar Documento</DialogTitle>
            <DialogDescription>
              Por favor indique el motivo por el cual rechaza este documento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Motivo de Rechazo *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Ejemplo: El documento contiene información incorrecta..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason('');
              }}
              disabled={rejectMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rechazando...' : 'Confirmar Rechazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
