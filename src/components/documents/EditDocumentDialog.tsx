import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UpdateDocumentDto,
} from '@/lib/api/documents.api';
import { entitiesApi } from '@/lib/api/entities.api';
import { usersApi } from '@/lib/api/users.api';
import { useUpdateDocument } from '@/hooks/useDocuments';
import { useAuth } from '@/contexts/AuthContext';
import { Archive, Gavel, Loader2 } from 'lucide-react';
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
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { axiosInstance } from '@/lib/api/axios';

interface EditDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: any;
}

export function EditDocumentDialog({ open, onOpenChange, document }: EditDocumentDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const updateDocument = useUpdateDocument();

  // Decree state
  const [decretoOpen, setDecretoOpen] = useState(false);
  const [decretoText, setDecretoText] = useState('');

  const isMinister = user?.role === 'GABINETE' && (user as any)?.isMinister;

  const createDecreeMutation = useMutation({
    mutationFn: async (text: string) => {
      const decreeHtml = `${document.content || ''}<hr style="margin:24px 0"/><p><strong>DECRETO DEL MINISTRO:</strong></p>${text.split('\n').map((l: string) => `<p>${l}</p>`).join('')}`;
      return axiosInstance.post('/documents', {
        title: `[DECRETO] ${document.title}`,
        type: 'Decreto',
        direction: 'OUT',
        classification: document.classification || 'INTERNAL',
        content: decreeHtml,
        entityId: document.entityId,
        responsibleId: document.responsibleId,
        signerTitle: 'El Ministro',
        priority: document.priority || 'HIGH',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Decreto creado', {
        description: 'Se generó un nuevo documento de salida con el decreto adjunto. El documento original no fue modificado.',
      });
      setDecretoOpen(false);
      setDecretoText('');
    },
    onError: (e: any) => {
      toast.error('Error al crear decreto: ' + (e.response?.data?.message || e.message));
    },
  });

  const [formData, setFormData] = useState<UpdateDocumentDto>({
    title: document.title,
    type: document.type,
    priority: document.priority,
    status: document.status,
    content: document.content || '',
    entityId: document.entityId,
    responsibleId: document.responsibleId,
    subDepartment: document.subDepartment || '',
    referenceCode: document.referenceCode || '',
    signerTitle: document.signerTitle || '',
    recipientTitle: document.recipientTitle || '',
  });

  // Fetch entities for dropdown
  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: entitiesApi.getAll,
  });

  // Fetch users for responsible dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

  // Update form when document changes
  useEffect(() => {
    setFormData({
      title: document.title,
      type: document.type,
      priority: document.priority,
      status: document.status,
      content: document.content || '',
      entityId: document.entityId,
      responsibleId: document.responsibleId,
    });
  }, [document]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if document is archived
    if (document.status === 'ARCHIVED') {
      toast.error('No se pueden editar documentos archivados. Los documentos archivados son de solo lectura.');
      return;
    }

    // Validation
    if (!formData.title) {
      toast.error('Por favor ingrese el título del documento');
      return;
    }

    if (!formData.type) {
      toast.error('Por favor seleccione el tipo de documento');
      return;
    }

    console.log('[EditDocumentDialog] 📝 Submitting document update:', { id: document.id, formData });

    updateDocument.mutate(
      { id: document.id, data: formData },
      {
        onSuccess: () => {
          console.log('[EditDocumentDialog] ✅ Update successful, closing dialog');
          onOpenChange(false);
        },
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !updateDocument.isPending) {
      onOpenChange(newOpen);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:w-[95vw] sm:max-w-[1400px] sm:h-[92vh] sm:max-h-[92vh] sm:p-0 flex flex-col gap-0"
        onInteractOutside={(e) => {
          if (updateDocument.isPending) e.preventDefault();
        }}
      >
        {/* ── Fixed header ── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b shrink-0">
          <div>
            <DialogTitle className="text-lg font-semibold">Editar Documento</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-0.5">
              #{document.correlativeNumber}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            {isMinister && document.status !== 'ARCHIVED' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                onClick={() => setDecretoOpen(true)}
              >
                <Gavel className="h-4 w-4" />
                Decretar
              </Button>
            )}
            {document.status === 'ARCHIVED' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-200">
                <Archive className="h-4 w-4 shrink-0" />
                Documento Archivado — Solo Lectura
              </div>
            )}
          </div>
        </div>

        {/* ── Scrollable two-column body ── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex flex-1 min-h-0 overflow-hidden">

            {/* LEFT COLUMN — metadata (fixed width, scrollable) */}
            <div className="w-72 shrink-0 border-r overflow-y-auto px-5 py-4 space-y-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Metadatos
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Asunto del documento"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    <SelectItem value="OFICIO">Oficio</SelectItem>
                    <SelectItem value="MEMO">Memorando</SelectItem>
                    <SelectItem value="CIRCULAR">Circular</SelectItem>
                    <SelectItem value="CARTA">Carta</SelectItem>
                    <SelectItem value="INFORME">Informe</SelectItem>
                    <SelectItem value="DECRETO">Decreto</SelectItem>
                    <SelectItem value="RESOLUCION">Resolución</SelectItem>
                    <SelectItem value="OTRO">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <Label>Prioridad</Label>
                <Select
                  value={formData.priority || 'MEDIUM'}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    <SelectItem value="LOW">Baja</SelectItem>
                    <SelectItem value="MEDIUM">Media</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                    <SelectItem value="URGENT">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    <SelectItem value="DRAFT">Borrador</SelectItem>
                    <SelectItem value="PENDING">Pendiente</SelectItem>
                    <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
                    <SelectItem value="COMPLETED">Completado</SelectItem>
                    <SelectItem value="ARCHIVED">Archivado</SelectItem>
                    <SelectItem value="REJECTED">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Entity */}
              <div className="space-y-1.5">
                <Label>Entidad</Label>
                <Select
                  value={formData.entityId}
                  onValueChange={(value) => setFormData({ ...formData, entityId: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    {entities.filter((e: any) => e.isActive).map((entity: any) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {entity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Responsible */}
              <div className="space-y-1.5">
                <Label>Responsable</Label>
                <Select
                  value={formData.responsibleId}
                  onValueChange={(value) => setFormData({ ...formData, responsibleId: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    {users.filter((u: any) => u.isActive).map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* PDF Header Fields separator */}
              <div className="pt-2 border-t">
                <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-3">
                  Datos del PDF Oficial
                </div>

                {/* Sub-Department */}
                <div className="space-y-1.5">
                  <Label htmlFor="subDepartment">Sub-Departamento</Label>
                  <Input
                    id="subDepartment"
                    placeholder="Ej: Dirección General de Puertos"
                    value={formData.subDepartment || ''}
                    onChange={(e) => setFormData({ ...formData, subDepartment: e.target.value })}
                  />
                </div>

                {/* Reference Code */}
                <div className="space-y-1.5 mt-3">
                  <Label htmlFor="referenceCode">Código de Referencia (Recc-)</Label>
                  <Input
                    id="referenceCode"
                    placeholder="Ej: Puertos Privados"
                    value={formData.referenceCode || ''}
                    onChange={(e) => setFormData({ ...formData, referenceCode: e.target.value })}
                  />
                </div>

                {/* Signer Title */}
                <div className="space-y-1.5 mt-3">
                  <Label>Título del Firmante</Label>
                  <Select
                    value={formData.signerTitle || ''}
                    onValueChange={(value) => setFormData({ ...formData, signerTitle: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar título..." />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      <SelectItem value="El Ministro">El Ministro</SelectItem>
                      <SelectItem value="La Ministra">La Ministra</SelectItem>
                      <SelectItem value="El Director General">El Director General</SelectItem>
                      <SelectItem value="La Directora General">La Directora General</SelectItem>
                      <SelectItem value="El Secretario General">El Secretario General</SelectItem>
                      <SelectItem value="El Director">El Director</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Recipient Title */}
                <div className="space-y-1.5 mt-3">
                  <Label htmlFor="recipientTitle">Destinatario (pie de página)</Label>
                  <textarea
                    id="recipientTitle"
                    placeholder="Ej: Excmo. Señor Ministro de Transportes..."
                    value={formData.recipientTitle || ''}
                    onChange={(e) => setFormData({ ...formData, recipientTitle: e.target.value })}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN — full-height CKEditor */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <div className="px-5 py-3 border-b shrink-0">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Contenido del Documento
                </Label>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <RichTextEditor
                  value={formData.content || ''}
                  onChange={(value) => setFormData({ ...formData, content: value })}
                  placeholder="Escriba el contenido del documento aquí..."
                  minHeight="calc(92vh - 200px)"
                  disabled={document.status === 'ARCHIVED'}
                />
              </div>
            </div>
          </div>

          {/* ── Fixed footer ── */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={updateDocument.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateDocument.isPending || document.status === 'ARCHIVED'}
              className="min-w-[140px]"
            >
              {updateDocument.isPending
                ? 'Guardando...'
                : document.status === 'ARCHIVED'
                ? 'Solo Lectura'
                : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* ── Decreto sub-dialog ── */}
    <Dialog open={decretoOpen} onOpenChange={setDecretoOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-700">
            <Gavel className="h-5 w-5" />
            Decretar documento
          </DialogTitle>
          <DialogDescription>
            Escriba el texto del decreto. Se creará un <strong>nuevo documento de salida</strong> con el decreto adjunto al contenido original. El documento original no se modificará.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground border">
            <span className="font-medium text-foreground">Documento base:</span> {document.title}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="decretoText">Texto del Decreto <span className="text-destructive">*</span></Label>
            <Textarea
              id="decretoText"
              placeholder="Escriba aquí el decreto ministerial..."
              rows={6}
              value={decretoText}
              onChange={(e) => setDecretoText(e.target.value)}
              className="resize-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            El nuevo documento tendrá el título: <strong>[DECRETO] {document.title}</strong>
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setDecretoOpen(false); setDecretoText(''); }} disabled={createDecreeMutation.isPending}>
            Cancelar
          </Button>
          <Button
            className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
            onClick={() => {
              if (!decretoText.trim()) { toast.error('Escriba el texto del decreto'); return; }
              createDecreeMutation.mutate(decretoText.trim());
            }}
            disabled={createDecreeMutation.isPending || !decretoText.trim()}
          >
            {createDecreeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
            {createDecreeMutation.isPending ? 'Creando decreto...' : 'Crear decreto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
