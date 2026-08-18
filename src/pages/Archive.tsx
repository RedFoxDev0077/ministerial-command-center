import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TablePagination } from '@/components/ui/table-pagination';
import { WorkflowTimeline } from '@/components/workflow/WorkflowTimeline';
import { DocumentStageProgress } from '@/components/workflow/DocumentStageProgress';
import {
  Search,
  FileText,
  ChevronRight,
  ArrowLeft,
  Download,
  Eye,
  Calendar,
  User,
  Tag,
  FolderOpen,
  Sparkles,
  FileDown,
  History,
  Building
} from 'lucide-react';
import { entitiesApi } from '@/lib/api/entities.api';
import { documentsApi } from '@/lib/api/documents.api';
import { useDocuments } from '@/hooks/useDocuments';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ArchivePage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch entities
  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: entitiesApi.getAll,
  });

  // Fetch ALL archived documents (without entityId filter) to show counts
  const { data: allArchivedData } = useDocuments({
    status: 'ARCHIVED',
  });

  const allArchivedDocuments = allArchivedData?.data || [];

  // Fetch filtered archived documents when entity is selected
  const { data: documentsData } = useDocuments({
    status: 'ARCHIVED',
    entityId: selectedEntity?.id,
    search: searchQuery || undefined,
  });

  const archivedDocuments = documentsData?.data || [];

  // Count documents by entity from ALL archived documents
  const getDocumentCountByEntity = (entityId: string) => {
    const entityDocs = allArchivedDocuments.filter((d: any) => d.entityId === entityId);
    return entityDocs.length;
  };

  const filteredEntities = entities.filter(entity =>
    entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entity.shortName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // When entity is selected, use documents already filtered by backend
  // Only apply search filter if searchQuery exists
  const filteredDocuments = selectedEntity
    ? (searchQuery
        ? archivedDocuments.filter((doc: any) =>
            doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.correlativeNumber.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : archivedDocuments) // No additional filter needed - backend already filtered by entityId
    : [];

  // Pagination calculation
  const totalPages = Math.ceil(filteredDocuments.length / pageSize);
  const paginatedDocuments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredDocuments.slice(startIndex, endIndex);
  }, [filteredDocuments, currentPage, pageSize]);

  // Reset to page 1 when entity or search changes
  useMemo(() => {
    setCurrentPage(1);
  }, [selectedEntity, searchQuery]);

  const handleOpenDocument = (doc: any) => {
    setSelectedDocument(doc);
    setViewerOpen(true);
  };

  // Handle PDF download
  const handleDownloadPdf = async (doc: any) => {
    try {
      toast.loading('Generando PDF...');
      const pdfBlob = await documentsApi.downloadPdf(doc.id);
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `documento-${doc.correlativeNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success('PDF descargado exitosamente');
    } catch (error) {
      toast.dismiss();
      toast.error('Error al descargar PDF');
    }
  };

  const statusLabels: Record<string, string> = {
    ARCHIVED: 'Archivado',
    COMPLETED: 'Completado',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader title={t('archive.title')} description={t('archive.description')} />

      {/* Breadcrumb navigation */}
      {selectedEntity && (
        <div className="flex items-center gap-2 mb-4 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedEntity(null);
              setSearchQuery('');
            }}
            className="gap-1 h-8 px-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-primary/10">
            <span className="font-medium">{selectedEntity.name}</span>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={selectedEntity ? 'Buscar documentos...' : t('archive.search_archive')}
          className="pl-9 max-w-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Entity folders view */}
      {!selectedEntity ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEntities.map(entity => {
            const docCount = getDocumentCountByEntity(entity.id);
            return (
              <Card
                key={entity.id}
                className="cursor-pointer hover:border-primary/20 transition-all hover:shadow-md"
                onClick={() => setSelectedEntity(entity)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {entity.shortName?.substring(0, 2) || entity.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{entity.name}</h3>
                      <p className="text-sm text-muted-foreground">{docCount} documentos</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Documents list view */
        <>
          <div className="space-y-3">
            {filteredDocuments.length === 0 ? (
              <Card>
                <CardContent className="p-12">
                  <div className="empty-state">
                    <FolderOpen className="empty-state-icon" />
                    <h3 className="empty-state-title">No hay documentos</h3>
                    <p className="empty-state-description">
                      No se encontraron documentos archivados en esta carpeta
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              paginatedDocuments.map((doc: any) => {
              return (
                <Card
                  key={doc.id}
                  className="cursor-pointer hover:border-primary/20 transition-all hover:shadow-md"
                  onClick={() => handleOpenDocument(doc)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-medium truncate">{doc.title}</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {doc.correlativeNumber} · {doc.type}
                            </p>
                          </div>
                          <Badge variant="secondary">{statusLabels[doc.status] || doc.status}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(doc.createdAt), 'dd MMM yyyy', { locale: es })}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {doc.responsible ? `${doc.responsible.firstName} ${doc.responsible.lastName}` : 'N/A'}
                          </span>
                          {doc.tags && doc.tags.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {doc.tags.slice(0, 2).join(', ')}
                            </span>
                          )}
                          {doc.aiSummary && (
                            <span className="flex items-center gap-1 text-primary">
                              <Sparkles className="h-3 w-3" />
                              IA
                            </span>
                          )}
                        </div>
                        {doc.direction && doc.currentStage && (
                          <div className="mt-3">
                            <DocumentStageProgress
                              direction={doc.direction}
                              currentStage={doc.currentStage}
                              size="sm"
                              showIcon={false}
                            />
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDocument(doc);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
          </div>

          {/* Pagination */}
          {filteredDocuments.length > 0 && (
            <div className="mt-6">
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredDocuments.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </>
      )}

      {/* Document viewer dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <FileText className="h-5 w-5" />
              {selectedDocument?.title}
            </DialogTitle>
            <DialogDescription>
              Vista detallada del documento archivado
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <Tabs defaultValue="preview" className="mt-6">
              <TabsList className="grid w-full grid-cols-4 h-11">
                <TabsTrigger value="preview" className="text-sm">
                  <Eye className="h-4 w-4 mr-1.5" />
                  Vista previa
                </TabsTrigger>
                <TabsTrigger value="metadata" className="text-sm">
                  <FileText className="h-4 w-4 mr-1.5" />
                  Metadatos
                </TabsTrigger>
                <TabsTrigger value="workflow" className="text-sm">
                  <History className="h-4 w-4 mr-1.5" />
                  Workflow
                </TabsTrigger>
                <TabsTrigger value="files" className="text-sm">
                  <FileDown className="h-4 w-4 mr-1.5" />
                  Archivos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="mt-6">
                <ScrollArea className="h-[55vh] border-2 rounded-lg bg-gradient-to-b from-white to-gray-50">
                  <div className="p-8">
                    {/* Document header */}
                    <div className="text-center border-b-2 border-primary/10 pb-6 mb-8 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 -mx-8 px-8 py-6">
                      <div className="inline-block px-3 py-1 bg-primary/10 rounded-full mb-3">
                        <p className="text-xs font-mono font-semibold text-primary">
                          {selectedDocument.correlativeNumber}
                        </p>
                      </div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">{selectedDocument.title}</h2>
                      <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                        <Badge variant="outline" className="font-medium">
                          {selectedDocument.type}
                        </Badge>
                        <span>·</span>
                        <span className="font-medium">
                          {format(new Date(selectedDocument.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                        </span>
                      </div>
                    </div>

                    {/* Document content */}
                    <div className="prose prose-sm max-w-none">
                      {selectedDocument.content ? (
                        <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap font-serif">
                          {selectedDocument.content}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
                          <p className="text-base font-medium text-muted-foreground mb-2">
                            Contenido no disponible
                          </p>
                          <p className="text-sm text-muted-foreground max-w-md">
                            El contenido de este documento no está disponible para vista previa. Por favor, descargue el documento para ver su contenido completo.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>

                <div className="flex justify-between items-center gap-3 mt-6">
                  <Button variant="ghost" onClick={() => setViewerOpen(false)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Cerrar
                  </Button>
                  <Button onClick={() => handleDownloadPdf(selectedDocument)} className="gap-2">
                    <Download className="h-4 w-4" />
                    Descargar PDF
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="metadata" className="mt-6">
                <ScrollArea className="h-[55vh]">
                  <div className="grid gap-6 sm:grid-cols-2 px-1">
                    {/* Información General */}
                    <Card className="border-2 hover:border-primary/20 transition-colors">
                      <CardContent className="p-6 space-y-4">
                        <h4 className="font-semibold text-base text-foreground flex items-center gap-2 pb-2 border-b">
                          <FileText className="h-4 w-4 text-primary" />
                          Información general
                        </h4>
                        <div className="space-y-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Número correlativo</span>
                            <span className="text-sm font-semibold text-foreground font-mono">{selectedDocument.correlativeNumber}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo</span>
                            <span className="text-sm font-semibold text-foreground">{selectedDocument.type}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dirección</span>
                            <div className="flex items-center gap-2">
                              {selectedDocument.direction ? (
                                <Badge variant={selectedDocument.direction === 'IN' ? 'default' : 'secondary'}>
                                  {selectedDocument.direction === 'IN' ? 'Entrada' : 'Salida'}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">N/A</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Canal</span>
                            <span className="text-sm font-semibold text-foreground">{selectedDocument.channel || 'N/A'}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Fechas y Responsables */}
                    <Card className="border-2 hover:border-primary/20 transition-colors">
                      <CardContent className="p-6 space-y-4">
                        <h4 className="font-semibold text-base text-foreground flex items-center gap-2 pb-2 border-b">
                          <Calendar className="h-4 w-4 text-primary" />
                          Fechas y responsables
                        </h4>
                        <div className="space-y-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fecha de creación</span>
                            <span className="text-sm font-semibold text-foreground">{format(new Date(selectedDocument.createdAt), 'dd/MM/yyyy')}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Última actualización</span>
                            <span className="text-sm font-semibold text-foreground">{format(new Date(selectedDocument.updatedAt), 'dd/MM/yyyy')}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Responsable</span>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-semibold text-foreground">
                                {selectedDocument.responsible ? `${selectedDocument.responsible.firstName} ${selectedDocument.responsible.lastName}` : 'N/A'}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Entidad</span>
                            <span className="text-sm font-semibold text-foreground line-clamp-2">{selectedDocument.entity?.name || 'N/A'}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Etiquetas */}
                    <Card className="sm:col-span-2 border-2 hover:border-primary/20 transition-colors">
                      <CardContent className="p-6 space-y-4">
                        <h4 className="font-semibold text-base text-foreground flex items-center gap-2 pb-2 border-b">
                          <Tag className="h-4 w-4 text-primary" />
                          Etiquetas
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedDocument.tags && selectedDocument.tags.length > 0 ? (
                            selectedDocument.tags.map((tag: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <div className="text-sm text-muted-foreground italic py-2">
                              No hay etiquetas asignadas a este documento
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="workflow" className="mt-6">
                <ScrollArea className="h-[55vh]">
                  <div className="space-y-6 px-1">
                    {selectedDocument.direction && selectedDocument.currentStage ? (
                      <>
                        {/* Workflow Progress */}
                        <Card className="border-2">
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <History className="h-4 w-4 text-primary" />
                              Estado del Workflow
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <DocumentStageProgress
                              direction={selectedDocument.direction}
                              currentStage={selectedDocument.currentStage}
                              size="lg"
                            />
                          </CardContent>
                        </Card>

                        {/* Workflow Timeline */}
                        <Card className="border-2">
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <History className="h-4 w-4 text-primary" />
                              Historial de Workflow
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <WorkflowTimeline
                              document={selectedDocument}
                            />
                          </CardContent>
                        </Card>
                      </>
                    ) : (
                      <Card>
                        <CardContent className="p-12">
                          <div className="empty-state">
                            <History className="empty-state-icon" />
                            <h3 className="empty-state-title">Workflow no disponible</h3>
                            <p className="empty-state-description">
                              La información de workflow no está disponible para este documento
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* AI Summary if available */}
                    {selectedDocument.aiSummary && (
                      <Card className="border-2 border-primary/20 bg-primary/5">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            Resumen IA
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="prose prose-sm max-w-none">
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                              {selectedDocument.aiSummary}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="files" className="mt-6">
                <ScrollArea className="h-[55vh]">
                  <div className="space-y-4 px-1">
                    {selectedDocument.files && selectedDocument.files.length > 0 ? (
                      <div className="space-y-3">
                        {selectedDocument.files.map((file: any, index: number) => (
                          <Card key={index} className="border-2 hover:border-primary/20 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <FileText className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{file.originalName}</p>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                      <span>{(file.size / 1024).toFixed(1)} KB</span>
                                      {file.mimeType && (
                                        <>
                                          <span>·</span>
                                          <span>{file.mimeType.split('/')[1].toUpperCase()}</span>
                                        </>
                                      )}
                                      {file.uploadedAt && (
                                        <>
                                          <span>·</span>
                                          <span>{format(new Date(file.uploadedAt), 'dd/MM/yyyy', { locale: es })}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      toast.loading('Descargando archivo...');
                                      const blob = await documentsApi.downloadFile(file.id);
                                      const url = window.URL.createObjectURL(blob);
                                      const link = document.createElement('a');
                                      link.href = url;
                                      link.download = file.originalName;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      window.URL.revokeObjectURL(url);
                                      toast.dismiss();
                                      toast.success('Archivo descargado exitosamente');
                                    } catch (error) {
                                      toast.dismiss();
                                      toast.error('Error al descargar archivo');
                                    }
                                  }}
                                  className="gap-2"
                                >
                                  <Download className="h-4 w-4" />
                                  Descargar
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="p-12">
                          <div className="empty-state">
                            <FileDown className="empty-state-icon" />
                            <h3 className="empty-state-title">No hay archivos</h3>
                            <p className="empty-state-description">
                              Este documento no tiene archivos adjuntos
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
