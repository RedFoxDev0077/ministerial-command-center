import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { DataTableSkeleton } from '@/components/ui/data-table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Checkbox } from '@/components/ui/checkbox';
import { TablePagination } from '@/components/ui/table-pagination';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Plus, Search, MoreHorizontal, Bot, PenTool, Send, Edit, Trash2,
  Archive, Download, Printer, UserPlus, Clock, FolderOpen, RefreshCw,
  CheckCircle, Stamp, Sparkles, Building2, Home, FileText, Landmark,
  Factory, Briefcase, ExternalLink, ArrowLeftRight, FileType,
} from 'lucide-react';
import { DocumentAIPanel, DecreeDialog } from '@/components/documents/DocumentAIPanel';
import { DocumentDetailSheet } from '@/components/documents/DocumentDetailSheet';
import { EditDocumentDialog } from '@/components/documents/EditDocumentDialog';
import { AssignDialog } from '@/components/documents/AssignDialog';
import { DeadlineDialog } from '@/components/documents/DeadlineDialog';
import { StatusChangeDialog } from '@/components/documents/StatusChangeDialog';
import { AssignExpedienteDialog } from '@/components/documents/AssignExpedienteDialog';
import { ManualEntryStampDialog } from '@/components/documents/ManualEntryStampDialog';
import { AcknowledgmentDialog } from '@/components/documents/AcknowledgmentDialog';
import { SignatureProtocolDialog } from '@/components/documents/SignatureProtocolDialog';
import { DocumentStageProgress } from '@/components/workflow/DocumentStageProgress';
import {
  useOutboxDocuments, useArchiveDocument, useDeleteDocument, useDecreeDocument,
} from '@/hooks/useDocuments';
import { documentsApi } from '@/lib/api/documents.api';
import { entitiesApi, EntityType, getEntityTypeLabel } from '@/lib/api/entities.api';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function OutboxPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Filter state
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [classificationFilter, setClassificationFilter] = useState<string>('all');
  const debouncedSearch = useDebounce(search, 500);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialog state
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [decreeDialogOpen, setDecreeDialogOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [deadlineDialogOpen, setDeadlineDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [assignExpedienteDialogOpen, setAssignExpedienteDialogOpen] = useState(false);
  const [manualEntryStampDialogOpen, setManualEntryStampDialogOpen] = useState(false);
  const [acknowledgmentDialogOpen, setAcknowledgmentDialogOpen] = useState(false);
  const [signatureProtocolDialogOpen, setSignatureProtocolDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Reset page on filter change
  useMemo(() => { setCurrentPage(1); }, [debouncedSearch, entityFilter, statusFilter, priorityFilter, classificationFilter, entityTypeFilter]);
  useMemo(() => { if (classificationFilter === 'INTERNAL') { setEntityTypeFilter('all'); setEntityFilter('all'); } }, [classificationFilter]);

  // Fetch entities
  const { data: allEntities = [] } = useQuery({ queryKey: ['entities'], queryFn: entitiesApi.getAll });
  const embassies = allEntities.filter((e: any) => e.type === EntityType.EMBASSY && e.isActive);

  // Query params
  const queryParams = useMemo(() => ({
    page: currentPage,
    limit: pageSize,
    search: debouncedSearch || undefined,
    entityId: entityFilter !== 'all' ? entityFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    classification: classificationFilter !== 'all' ? (classificationFilter as 'INTERNAL' | 'EXTERNAL') : undefined,
  }), [currentPage, pageSize, debouncedSearch, entityFilter, statusFilter, priorityFilter, classificationFilter]);

  const { data: outboxData, isLoading: loading, refetch } = useOutboxDocuments(queryParams);
  const archiveDocument = useArchiveDocument();
  const deleteDocument = useDeleteDocument();
  const decreeDocument = useDecreeDocument();

  const filteredDocs = outboxData?.data || [];

  // Auto-open document when navigated from Signature page
  useEffect(() => {
    const openDocumentId = location.state?.openDocumentId;
    if (!openDocumentId) return;
    navigate(location.pathname, { replace: true, state: {} });
    documentsApi.findOne(openDocumentId).then(doc => {
      setSelectedDocument(doc);
      setDetailSheetOpen(true);
    }).catch(() => {
      toast.error('No se pudo abrir el documento');
    });
  }, [location.state?.openDocumentId]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openAIPanel = (doc: any) => { setSelectedDocument(doc); setAiPanelOpen(true); };
  const openDecreeDialog = (doc: any) => { setSelectedDocument(doc); setDecreeDialogOpen(true); };
  const handleEdit = (doc: any) => { setSelectedDocument(doc); setDetailSheetOpen(true); };
  const handleOpenEditDialog = (doc: any) => { setSelectedDocument(doc); setDetailSheetOpen(false); setEditDialogOpen(true); };
  const handleArchive = (doc: any) => { setSelectedDocument(doc); setArchiveDialogOpen(true); };
  const handleDelete = (doc: any) => { setSelectedDocument(doc); setDeleteDialogOpen(true); };
  const handleAssign = (doc: any) => { setSelectedDocument(doc); setAssignDialogOpen(true); };
  const handleCreateDeadline = (doc: any) => { setSelectedDocument(doc); setDeadlineDialogOpen(true); };
  const handleChangeStatus = (doc: any) => { setSelectedDocument(doc); setStatusDialogOpen(true); };
  const handleAssignExpediente = (doc: any) => { setSelectedDocument(doc); setAssignExpedienteDialogOpen(true); };
  const handleManualEntryStamp = (doc: any) => { setSelectedDocument(doc); setManualEntryStampDialogOpen(true); };
  const handleAcknowledgment = (doc: any) => { setSelectedDocument(doc); setAcknowledgmentDialogOpen(true); };
  const handleSignatureProtocol = (doc: any) => { setSelectedDocument(doc); setSignatureProtocolDialogOpen(true); };
  const handleMoveToInbox = (doc: any) => { setSelectedDocument(doc); setMoveDialogOpen(true); };
  const handleOpenCase = (doc: any) => {
    if (doc.expedienteId) navigate(`/cases/${doc.expedienteId}`);
    else navigate('/cases/new', { state: { documentId: doc.id, documentTitle: doc.title } });
  };

  const confirmArchive = () => {
    if (!selectedDocument) return;
    archiveDocument.mutate(selectedDocument.id, {
      onSuccess: () => { setArchiveDialogOpen(false); setSelectedDocument(null); },
    });
  };

  const confirmDelete = () => {
    if (!selectedDocument) return;
    deleteDocument.mutate(selectedDocument.id, {
      onSuccess: () => { setDeleteDialogOpen(false); setSelectedDocument(null); refetch(); },
    });
  };

  const confirmMove = async () => {
    if (!selectedDocument) return;
    try {
      toast.loading('Moviendo documento...');
      await documentsApi.moveDirection(selectedDocument.id, 'IN');
      toast.dismiss();
      toast.success('Documento movido a Bandeja de Entrada');
      setMoveDialogOpen(false);
      setSelectedDocument(null);
      refetch();
    } catch {
      toast.dismiss();
      toast.error('Error al mover el documento');
    }
  };

  const handleDownloadPdf = async (doc: any) => {
    try {
      toast.loading('Generando PDF...');
      const blob = await documentsApi.downloadPdf(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `documento-${doc.correlativeNumber}.pdf`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.dismiss(); toast.success('PDF descargado');
    } catch { toast.dismiss(); toast.error('Error al descargar PDF'); }
  };

  const handleDownloadWord = async (doc: any) => {
    try {
      toast.loading('Generando Word...');
      const blob = await documentsApi.downloadWord(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `documento-${doc.correlativeNumber}.docx`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.dismiss(); toast.success('Word descargado');
    } catch { toast.dismiss(); toast.error('Error al descargar Word'); }
  };

  const handlePrint = async (doc: any) => {
    try {
      toast.loading('Preparando impresión...');
      const blob = await documentsApi.downloadPdf(doc.id);
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (w) { w.onload = () => { w.print(); toast.dismiss(); toast.success('Listo para imprimir'); }; }
      else { toast.dismiss(); toast.error('Habilite ventanas emergentes'); }
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast.dismiss(); toast.error('Error al preparar impresión'); }
  };

  // Bulk
  const toggleSelect = (id: string) => setSelectedIds(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === filteredDocs.length ? [] : filteredDocs.map((d: any) => d.id));

  const handleBulkDownloadPdfs = async () => {
    toast.loading(`Descargando ${selectedIds.length} documentos...`);
    for (const doc of filteredDocs.filter((d: any) => selectedIds.includes(d.id))) {
      await handleDownloadPdf(doc); await new Promise(r => setTimeout(r, 400));
    }
    toast.dismiss(); toast.success(`${selectedIds.length} documentos descargados`); setSelectedIds([]);
  };

  const handleBulkAssign = () => {
    if (selectedIds.length === 1) { const doc = filteredDocs.find((d: any) => d.id === selectedIds[0]); if (doc) handleAssign(doc); }
    else toast.info('Seleccione un documento a la vez para asignar responsable.');
  };

  const handleBulkArchive = async () => {
    if (!window.confirm(`¿Archivar ${selectedIds.length} documentos seleccionados?`)) return;
    for (const id of selectedIds) archiveDocument.mutate(id);
    toast.success(`${selectedIds.length} documentos archivados`); setSelectedIds([]);
  };

  const statusLabels: Record<string, string> = {
    DRAFT: 'Borrador', PENDING: 'Pendiente', IN_PROGRESS: 'En proceso',
    COMPLETED: 'Completado', ARCHIVED: 'Archivado', REJECTED: 'Rechazado',
  };
  const statusVariants: Record<string, 'warning' | 'info' | 'success' | 'muted' | 'destructive'> = {
    DRAFT: 'muted', PENDING: 'warning', IN_PROGRESS: 'info',
    COMPLETED: 'success', ARCHIVED: 'muted', REJECTED: 'destructive',
  };

  // Shared dropdown content
  const renderMenu = (doc: any, xs = false) => {
    const cls = xs ? 'py-2 text-xs' : '';
    const icn = xs ? 'h-3.5 w-3.5 mr-2' : 'h-4 w-4 mr-2';
    return (
      <DropdownMenuContent align="end" className="animate-scale-in w-56">
        <DropdownMenuItem className={cls} onClick={() => openAIPanel(doc)}>
          <Sparkles className={`${icn} text-primary`} />Analizar con IA / Borrador respuesta
        </DropdownMenuItem>
        <DropdownMenuItem className={cls} onClick={() => openDecreeDialog(doc)}>
          <Building2 className={`${icn} text-orange-500`} />Decretar documento
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className={cls} onClick={() => handleOpenCase(doc)}>
          <FolderOpen className={icn} />Abrir expediente
        </DropdownMenuItem>
        <DropdownMenuItem className={cls} onClick={() => handleAssignExpediente(doc)}>
          <FolderOpen className={`${icn} text-blue-600`} />Asignar a expediente
        </DropdownMenuItem>
        <DropdownMenuItem className={cls} onClick={() => handleAssign(doc)}>
          <UserPlus className={icn} />Asignar responsable
        </DropdownMenuItem>
        <DropdownMenuItem className={cls} onClick={() => handleCreateDeadline(doc)}>
          <Clock className={icn} />Establecer plazo
        </DropdownMenuItem>
        {doc.currentStage === 'SIGNATURE_PROTOCOL' && (
          <DropdownMenuItem className={cls} onClick={() => handleSignatureProtocol(doc)}>
            <PenTool className={`${icn} text-green-600`} />Protocolo de firma
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className={cls} onClick={() => handleChangeStatus(doc)}>
          <RefreshCw className={`${icn} text-blue-600`} />Cambiar estado
        </DropdownMenuItem>
        <DropdownMenuItem className={cls} onClick={() => handleMoveToInbox(doc)}>
          <ArrowLeftRight className={`${icn} text-indigo-600`} />Mover a Bandeja de Entrada
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className={cls} onClick={() => handleDownloadPdf(doc)}>
          <Download className={`${icn} text-blue-600`} />Descargar PDF
        </DropdownMenuItem>
        <DropdownMenuItem className={cls} onClick={() => handleDownloadWord(doc)}>
          <FileType className={`${icn} text-blue-700`} />Descargar Word
        </DropdownMenuItem>
        <DropdownMenuItem className={cls} onClick={() => handlePrint(doc)}>
          <Printer className={`${icn} text-green-600`} />Imprimir
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className={cls} onClick={() => handleEdit(doc)} disabled={doc.status === 'ARCHIVED'}>
          <Edit className={icn} />Editar {doc.status === 'ARCHIVED' && '(Solo lectura)'}
        </DropdownMenuItem>
        <DropdownMenuItem className={cls} onClick={() => handleArchive(doc)} disabled={doc.status === 'ARCHIVED'}>
          <Archive className={`${icn} text-blue-600`} />Archivar
        </DropdownMenuItem>
        <DropdownMenuItem className={`${cls} text-destructive focus:text-destructive`} onClick={() => handleDelete(doc)}>
          <Trash2 className={icn} />Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title={t('outbox.title')}
        description={t('outbox.description')}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/assistant')}>
              <Bot className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t('outbox.generate_draft')}</span>
            </Button>
            <Button onClick={() => navigate('/outbox/new')}>
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t('outbox.register_new')}</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </div>
        }
      />

      {/* Classification tabs */}
      <div className="flex gap-2 mb-4 animate-fade-in-up overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        {[
          { value: 'all', label: 'Todos', icon: <FileText className="h-4 w-4 sm:mr-1.5" /> },
          { value: 'INTERNAL', label: 'Internos', icon: <Home className="h-4 w-4 sm:mr-1.5" /> },
          { value: 'EXTERNAL', label: 'Externos', icon: <ExternalLink className="h-4 w-4 sm:mr-1.5" /> },
        ].map(tab => (
          <Button key={tab.value} variant={classificationFilter === tab.value ? 'default' : 'outline'} size="sm"
            onClick={() => setClassificationFilter(tab.value)} className="rounded-full shrink-0 h-9">
            {tab.icon}<span className="hidden sm:inline">{tab.label}</span>
          </Button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 mb-4 sm:mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('common.search')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-11 text-base sm:text-sm" />
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="h-10 text-xs sm:text-sm sm:w-48"><SelectValue placeholder="Entidad" /></SelectTrigger>
            <SelectContent className="max-h-[60vh] sm:max-h-80">
              <SelectItem value="all">Todas las entidades</SelectItem>
              {(Object.values(EntityType) as EntityType[]).map(type => {
                const list = allEntities.filter((e: any) => e.type === type && e.isActive);
                if (!list.length) return null;
                return (
                  <SelectGroup key={type}>
                    <SelectLabel className="text-xs text-muted-foreground py-1.5">{getEntityTypeLabel(type)}</SelectLabel>
                    {list.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full shrink-0 bg-primary/40" />
                          <span className="truncate text-xs sm:text-sm">{e.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                );
              })}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 text-xs sm:text-sm sm:w-36"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="DRAFT">Borrador</SelectItem>
              <SelectItem value="PENDING">Pendiente</SelectItem>
              <SelectItem value="IN_PROGRESS">En proceso</SelectItem>
              <SelectItem value="COMPLETED">Completado</SelectItem>
              <SelectItem value="ARCHIVED">Archivado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-10 text-xs sm:text-sm sm:w-36"><SelectValue placeholder="Prioridad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="URGENT">🔴 Urgente</SelectItem>
              <SelectItem value="HIGH">🟠 Alta</SelectItem>
              <SelectItem value="MEDIUM">🟡 Media</SelectItem>
              <SelectItem value="LOW">🟢 Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {classificationFilter === 'EXTERNAL' && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={entityTypeFilter} onValueChange={v => { setEntityTypeFilter(v); if (v !== 'EMBASSY') setEntityFilter('all'); }}>
              <SelectTrigger className="h-10 text-xs sm:text-sm sm:w-full"><SelectValue placeholder="Tipo de Entidad Externa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="EMBASSY">🏛️ Embajadas</SelectItem>
                <SelectItem value="PUBLIC_COMPANY">🏢 Empresas Públicas</SelectItem>
                <SelectItem value="PRIVATE_COMPANY">💼 Empresas Privadas</SelectItem>
                <SelectItem value="INTERNATIONAL_ORG">🌍 Organizaciones Internacionales</SelectItem>
                <SelectItem value="GOVERNMENT_MINISTRY">🏛️ Ministerios</SelectItem>
              </SelectContent>
            </Select>
            {entityTypeFilter === 'EMBASSY' && embassies.length > 0 && (
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="h-10 text-xs sm:text-sm sm:w-full"><SelectValue placeholder="Seleccionar Embajada" /></SelectTrigger>
                <SelectContent className="max-h-[60vh]">
                  <SelectItem value="all">Todas las embajadas ({embassies.length})</SelectItem>
                  {embassies.map((emb: any) => (
                    <SelectItem key={emb.id} value={emb.id}>
                      <span className="flex items-center gap-2">🏳️ <span className="truncate text-xs sm:text-sm">{emb.name}</span></span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg animate-fade-in shadow-sm">
          <span className="text-sm font-medium">{selectedIds.length} documento(s) seleccionado(s)</span>
          <div className="flex gap-2 sm:ml-auto flex-wrap">
            <Button variant="outline" size="sm" onClick={handleBulkDownloadPdfs} className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Descargar PDFs</span><span className="sm:hidden">PDFs</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkAssign} className="flex-1 sm:flex-none">
              <UserPlus className="h-4 w-4 mr-1" />Asignar
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkArchive} className="flex-1 sm:flex-none">
              <Archive className="h-4 w-4 mr-1" />Archivar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} className="flex-1 sm:flex-none">Cancelar</Button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <DataTableSkeleton columns={6} rows={5} />
      ) : filteredDocs.length === 0 ? (
        <EmptyState icon={Send} title={t('empty.no_documents')} description="Los documentos de salida aparecerán aquí"
          action={{ label: t('outbox.register_new'), onClick: () => navigate('/outbox/new') }} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"><Checkbox checked={selectedIds.length === filteredDocs.length && filteredDocs.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc: any, i: number) => (
                  <TableRow key={doc.id} className="group transition-colors hover:bg-muted/50 cursor-pointer"
                    style={{ animationDelay: `${i * 0.03}s` }}
                    onClick={e => {
                      const t = e.target as HTMLElement;
                      if (t.closest('button') || t.closest('[role="checkbox"]') || t.closest('[role="menuitem"]') || t.closest('[role="menu"]')) return;
                      handleEdit(doc);
                    }}>
                    <TableCell><Checkbox checked={selectedIds.includes(doc.id)} onCheckedChange={() => toggleSelect(doc.id)} /></TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div><p className="font-medium">{doc.title}</p><p className="text-xs text-muted-foreground">{doc.correlativeNumber}</p></div>
                        <DocumentStageProgress direction={doc.direction} currentStage={doc.currentStage} size="sm" showIcon={false} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded text-xs font-semibold flex items-center justify-center text-primary-foreground"
                          style={{ backgroundColor: doc.entity?.color || '#6366f1' }}>
                          {doc.entity?.shortName || doc.entity?.name?.substring(0, 2)?.toUpperCase()}
                        </div>
                        <span className="text-sm truncate">{doc.entity?.name || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm">{doc.responsible ? `${doc.responsible.firstName} ${doc.responsible.lastName}` : 'N/A'}</span></TableCell>
                    <TableCell><span className="text-sm text-muted-foreground">{format(new Date(doc.createdAt), 'dd MMM yyyy', { locale: es })}</span></TableCell>
                    <TableCell><StatusBadge variant={statusVariants[doc.status] || 'muted'}>{statusLabels[doc.status] || doc.status}</StatusBadge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        {renderMenu(doc)}
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {filteredDocs.map((doc: any, i: number) => (
              <div key={doc.id} className="rounded-lg border bg-card p-4 space-y-3 cursor-pointer hover:shadow-md transition-shadow"
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={e => {
                  const t = e.target as HTMLElement;
                  if (t.closest('button') || t.closest('[role="checkbox"]') || t.closest('[role="menu"]')) return;
                  handleEdit(doc);
                }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Checkbox checked={selectedIds.includes(doc.id)} onCheckedChange={() => toggleSelect(doc.id)} onClick={e => e.stopPropagation()} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm leading-snug line-clamp-2">{doc.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{doc.correlativeNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <StatusBadge variant={statusVariants[doc.status] || 'muted'}>{statusLabels[doc.status] || doc.status}</StatusBadge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      {renderMenu(doc, true)}
                    </DropdownMenu>
                  </div>
                </div>
                <DocumentStageProgress direction={doc.direction} currentStage={doc.currentStage} size="sm" showIcon={false} />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{doc.entity?.name || 'N/A'}</span>
                  <span>{format(new Date(doc.createdAt), 'dd MMM yyyy', { locale: es })}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {!loading && filteredDocs.length > 0 && (
        <div className="mt-6">
          <TablePagination currentPage={currentPage} totalPages={outboxData?.totalPages || 1}
            pageSize={pageSize} totalItems={outboxData?.total || filteredDocs.length}
            onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
        </div>
      )}

      {/* AI Panel */}
      <Sheet open={aiPanelOpen} onOpenChange={setAiPanelOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />Análisis IA del Documento
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {selectedDocument && (
              <>
                <div className="mb-4 p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">{selectedDocument.title}</p>
                  <p className="text-xs text-muted-foreground">{selectedDocument.correlativeNumber}</p>
                </div>
                <DocumentAIPanel document={selectedDocument} />
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* All dialogs */}
      {selectedDocument && (
        <DecreeDialog open={decreeDialogOpen} onOpenChange={setDecreeDialogOpen} document={selectedDocument}
          onDecree={data => decreeDocument.mutate({ id: selectedDocument.id, data }, {
            onSuccess: () => { setDecreeDialogOpen(false); setSelectedDocument(null); refetch(); },
          })} />
      )}
      {selectedDocument && <DocumentDetailSheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen} documentId={selectedDocument.id} onEdit={handleOpenEditDialog} />}
      {selectedDocument && <EditDocumentDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} document={selectedDocument} />}
      {selectedDocument && <AssignDialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen} document={selectedDocument} />}
      {selectedDocument && <DeadlineDialog open={deadlineDialogOpen} onOpenChange={setDeadlineDialogOpen} document={selectedDocument} />}
      {selectedDocument && <StatusChangeDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen} document={selectedDocument} />}
      {selectedDocument && <AssignExpedienteDialog open={assignExpedienteDialogOpen} onOpenChange={setAssignExpedienteDialogOpen} document={selectedDocument} />}
      {selectedDocument && <ManualEntryStampDialog open={manualEntryStampDialogOpen} onOpenChange={setManualEntryStampDialogOpen} document={selectedDocument} />}
      {selectedDocument && <AcknowledgmentDialog open={acknowledgmentDialogOpen} onOpenChange={setAcknowledgmentDialogOpen} document={selectedDocument} />}
      {selectedDocument && <SignatureProtocolDialog open={signatureProtocolDialogOpen} onOpenChange={setSignatureProtocolDialogOpen} document={selectedDocument} mode="signature" />}

      {/* Archive confirm */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar documento?</AlertDialogTitle>
            <AlertDialogDescription>¿Archivar "{selectedDocument?.title}"? Podrá recuperarlo desde Archivo.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveDocument.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive} className="bg-blue-600 hover:bg-blue-700" disabled={archiveDocument.isPending}>
              {archiveDocument.isPending ? 'Archivando...' : 'Archivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">⚠️ ¿Eliminar permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold">Esta acción no se puede deshacer.</span><br /><br />
              ¿Eliminar permanentemente "{selectedDocument?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDocument.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90" disabled={deleteDocument.isPending}>
              {deleteDocument.isPending ? 'Eliminando...' : 'Eliminar Permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move to Inbox confirm */}
      <AlertDialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-indigo-600" />Mover a Bandeja de Entrada
            </AlertDialogTitle>
            <AlertDialogDescription>
              El documento "<strong>{selectedDocument?.title}</strong>" será movido a Bandeja de Entrada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMove} className="bg-indigo-600 hover:bg-indigo-700">Mover a Entrada</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ScrollToTop />
    </div>
  );
}
