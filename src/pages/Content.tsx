import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { articlesApi, type Article, type ArticleProposal } from '@/lib/api/articles.api';
import { copyToClipboard } from '@/lib/clipboard';
import { toast } from 'sonner';
import {
  Plus,
  FileText,
  Calendar,
  User,
  Eye,
  Edit,
  Trash2,
  Send,
  Save,
  ExternalLink,
  Globe,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Sparkles,
  Share2,
  ChevronRight,
  Copy,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const sectors = ['Puertos', 'Telecomunicaciones', 'Internacional', 'Energía', 'Transporte', 'Economía', 'Transportes', 'Inteligencia Artificial', 'Correos', 'Regulación'];

export default function ContentPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [proposalsOpen, setProposalsOpen] = useState(false);
  const [proposals, setProposals] = useState<ArticleProposal[]>([]);
  const [socialPostArticle, setSocialPostArticle] = useState<Article | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Editor state
  const [editTitle, setEditTitle] = useState('');
  const [editSector, setEditSector] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSources, setEditSources] = useState('');

  // Fetch all articles from backend (shared across all users)
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => articlesApi.findAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; content: string; sector: string; sources: string[]; status: 'DRAFT' | 'PENDING' }) =>
      articlesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; title: string; content: string; sector: string; sources: string[]; status: 'DRAFT' | 'PENDING' }) =>
      articlesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => articlesApi.publish(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      setSelectedArticle(updated);
      toast.success('Artículo publicado. Ahora visible para todos los usuarios.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al publicar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => articlesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success('Artículo eliminado');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al eliminar');
    },
  });

  const generateProposalsMutation = useMutation({
    mutationFn: () => articlesApi.generateProposals(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      setProposals(data);
      setProposalsOpen(true);
      toast.success(`${data.length} propuestas generadas`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al generar propuestas'),
  });

  const generateDraftMutation = useMutation({
    mutationFn: (proposal: ArticleProposal) => articlesApi.generateDraft(proposal),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      setProposalsOpen(false);
      handleEdit(data);
      toast.success('Borrador generado. Puede editarlo antes de publicar.');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al generar borrador'),
  });

  const generateSocialMutation = useMutation({
    mutationFn: (id: string) => articlesApi.generateSocialPost(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      setSocialPostArticle(data);
      toast.success('Publicación para redes sociales generada');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al generar publicación'),
  });

  const statusLabels: Record<string, string> = {
    PUBLISHED: 'Publicado',
    PENDING: 'Pendiente',
    DRAFT: 'Borrador',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    PUBLISHED: <CheckCircle className="h-4 w-4 text-green-600" />,
    PENDING: <Clock className="h-4 w-4 text-yellow-500" />,
    DRAFT: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
  };

  const canEdit = (article: Article) =>
    article.authorId === user?.id || user?.role === 'ADMIN';

  const canPublish = user?.role === 'ADMIN' || user?.role === 'GABINETE';

  const handleCreateNew = () => {
    setEditTitle('');
    setEditSector('');
    setEditContent('');
    setEditSources('');
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEdit = (article: Article) => {
    setSelectedArticle(article);
    setEditTitle(article.title);
    setEditSector(article.sector);
    setEditContent(article.content);
    setEditSources(article.sources.join('\n'));
    setIsEditing(true);
  };

  const handleView = (article: Article) => {
    setSelectedArticle(article);
    setViewMode('detail');
  };

  const handleSave = async (status: 'DRAFT' | 'PENDING') => {
    if (!editTitle.trim() || !editSector || !editContent.trim()) {
      toast.error('Por favor complete el título, sector y contenido');
      return;
    }

    const sources = editSources.split('\n').filter(s => s.trim());

    try {
      if (isCreating) {
        await createMutation.mutateAsync({ title: editTitle, sector: editSector, content: editContent, sources, status });
        toast.success(status === 'DRAFT' ? 'Artículo guardado como borrador' : 'Artículo enviado para aprobación');
      } else if (selectedArticle) {
        const updated = await updateMutation.mutateAsync({ id: selectedArticle.id, title: editTitle, sector: editSector, content: editContent, sources, status });
        toast.success(status === 'DRAFT' ? 'Cambios guardados' : 'Enviado para aprobación');
        setSelectedArticle(updated);
      }
      setIsEditing(false);
      setIsCreating(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar el artículo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro que desea eliminar este artículo?')) return;
    await deleteMutation.mutateAsync(id);
    if (viewMode === 'detail') {
      setViewMode('list');
      setSelectedArticle(null);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Preprocess markdown: convert single newlines to line breaks (two spaces + newline)
  const renderMarkdown = (content: string) =>
    content.replace(/([^\n])\n([^\n])/g, '$1  \n$2');

  // Editor Dialog — rendered at top level so it works from both list and detail views
  const editorDialog = (
    <Dialog open={isEditing} onOpenChange={(open) => {
      if (!open) { setIsEditing(false); setIsCreating(false); }
    }}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 pt-5 pb-4 shrink-0 border-b">
          <DialogTitle>{isCreating ? 'Nuevo artículo' : 'Editar artículo'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="content" className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="mx-4 sm:mx-6 mt-4 shrink-0 w-fit">
            <TabsTrigger value="content">Contenido</TabsTrigger>
            <TabsTrigger value="metadata">Metadatos</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0 mt-2">
            <div className="px-4 sm:px-6 py-3 space-y-4">
              <TabsContent value="content" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Título del artículo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Contenido</Label>
                  <Textarea
                    id="content"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Escribe el contenido usando Markdown: ## Título, **negrita**, - lista, > cita"
                    className="min-h-[240px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Markdown: <code>## Título</code> · <code>**negrita**</code> · <code>- lista</code> · <code>{'>'} cita</code> · Una línea en blanco = nuevo párrafo
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="metadata" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="sector">Sector</Label>
                  <Select value={editSector} onValueChange={setEditSector}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectors.map(sector => (
                        <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sources">Fuentes (una por línea)</Label>
                  <Textarea
                    id="sources"
                    value={editSources}
                    onChange={(e) => setEditSources(e.target.value)}
                    placeholder={`Informe Técnico PT-2024-001\nEstudio de Impacto Económico`}
                    className="min-h-[120px]"
                  />
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <div className="px-4 sm:px-6 py-4 shrink-0 border-t bg-muted/30 flex flex-wrap gap-2 justify-end">
          <Button variant="outline" onClick={() => { setIsEditing(false); setIsCreating(false); }}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={() => handleSave('DRAFT')} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar borrador
          </Button>
          <Button onClick={() => handleSave('PENDING')} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar para aprobación
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Detail view
  if (viewMode === 'detail' && selectedArticle) {
    // Find the latest version from the query cache
    const latest = articles.find(a => a.id === selectedArticle.id) || selectedArticle;
    return (
      <>
      <div className="p-6 max-w-4xl mx-auto animate-fade-in">
        <Button
          variant="ghost"
          onClick={() => { setViewMode('list'); setSelectedArticle(null); }}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a la lista
        </Button>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{latest.sector}</Badge>
                  <Badge variant={latest.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                    {statusIcons[latest.status]}
                    <span className="ml-1">{statusLabels[latest.status]}</span>
                  </Badge>
                </div>
                <CardTitle className="text-2xl">{latest.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {latest.author.firstName} {latest.author.lastName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(latest.updatedAt), 'dd MMM yyyy', { locale: es })}
                  </span>
                  {latest.publishedAt && (
                    <span className="flex items-center gap-1 text-green-600">
                      <Globe className="h-4 w-4" />
                      Publicado {format(new Date(latest.publishedAt), 'dd MMM yyyy', { locale: es })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {canEdit(latest) && (
                  <Button variant="outline" size="sm" onClick={() => handleEdit(latest)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
                {canPublish && latest.status === 'PENDING' && (
                  <Button
                    size="sm"
                    onClick={() => publishMutation.mutate(latest.id)}
                    disabled={publishMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {publishMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
                    Publicar
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[60vh]">
              <div className="prose prose-sm max-w-none
                prose-headings:font-semibold prose-headings:text-foreground
                prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3
                prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2
                prose-p:my-2 prose-p:text-foreground
                prose-strong:font-bold prose-strong:text-foreground
                prose-em:italic
                prose-ul:ml-4 prose-ul:list-disc
                prose-ol:ml-4 prose-ol:list-decimal
                prose-li:my-1
                prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
              ">
                <ReactMarkdown>{renderMarkdown(latest.content)}</ReactMarkdown>
              </div>

              {latest.sources.length > 0 && (
                <div className="mt-8 pt-4 border-t">
                  <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Fuentes
                  </h4>
                  <ul className="space-y-1">
                    {latest.sources.map((source, i) => (
                      <li key={i} className="text-sm text-primary">{source}</li>
                    ))}
                  </ul>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      {editorDialog}
      </>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title={t('content.title')}
        description={t('content.description')}
        action={
          <div className="flex gap-2">
            {canPublish && (
              <Button
                variant="outline"
                onClick={() => generateProposalsMutation.mutate()}
                disabled={generateProposalsMutation.isPending}
              >
                {generateProposalsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generar con IA
              </Button>
            )}
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              {t('content.new_article')}
            </Button>
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{articles.filter(a => a.status === 'PUBLISHED').length}</p>
              <p className="text-sm text-muted-foreground">Publicados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{articles.filter(a => a.status === 'PENDING').length}</p>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{articles.filter(a => a.status === 'DRAFT').length}</p>
              <p className="text-sm text-muted-foreground">Borradores</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Articles list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Cargando artículos...</span>
        </div>
      ) : articles.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay artículos aún. Cree el primero.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(article => (
            <Card key={article.id} className="hover:border-primary/20 transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleView(article)}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium hover:text-primary transition-colors">{article.title}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">{article.sector}</p>
                      </div>
                      <Badge variant={article.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                        {statusIcons[article.status]}
                        <span className="ml-1">{statusLabels[article.status]}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {article.author.firstName} {article.author.lastName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(article.updatedAt), 'dd MMM yyyy', { locale: es })}
                      </span>
                      {article.aiGenerated && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-purple-300 text-purple-600">
                          <Sparkles className="h-2.5 w-2.5 mr-1" />IA
                        </Badge>
                      )}
                      {article.contentType === 'PROPOSAL' && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-blue-300 text-blue-600">
                          Propuesta
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleView(article)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canEdit(article) && (
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(article)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canPublish && article.status !== 'DRAFT' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-purple-600 hover:text-purple-700"
                        onClick={() => generateSocialMutation.mutate(article.id)}
                        title="Generar post para redes sociales"
                        disabled={generateSocialMutation.isPending}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    )}
                    {canPublish && article.status === 'PENDING' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => publishMutation.mutate(article.id)}
                        title="Publicar"
                      >
                        <Globe className="h-4 w-4" />
                      </Button>
                    )}
                    {canEdit(article) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(article.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {articles.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Anterior
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Página {page} de {Math.ceil(articles.length / PAGE_SIZE)}
            <span className="ml-2 text-xs">({articles.length} artículos)</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(Math.ceil(articles.length / PAGE_SIZE), p + 1))}
            disabled={page === Math.ceil(articles.length / PAGE_SIZE)}
          >
            Siguiente →
          </Button>
        </div>
      )}

      {editorDialog}

      {/* AI Weekly Proposals Dialog */}
      <Dialog open={proposalsOpen} onOpenChange={setProposalsOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl flex flex-col" style={{maxHeight: '90vh'}}>
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Propuestas Semanales con IA
            </DialogTitle>
            <DialogDescription>
              Se han generado {proposals.length} propuestas de artículos por sector. Seleccione una para generar el borrador completo.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="pr-1" style={{height: '60vh', minHeight: '200px'}}>
            <div className="space-y-3 py-2">
              {proposals.map((p) => (
                <Card key={p.id} className="border hover:border-purple-300 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-600">{p.sector}</Badge>
                        </div>
                        <h4 className="font-medium text-sm">{p.title}</h4>
                        {p.introduction && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.introduction}</p>
                        )}
                        {p.outline && p.outline.length > 0 && (
                          <ul className="mt-2 space-y-0.5">
                            {p.outline.map((point, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                <ChevronRight className="h-3 w-3 shrink-0 mt-0.5 text-purple-400" />
                                {point}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => generateDraftMutation.mutate(p)}
                        disabled={generateDraftMutation.isPending}
                      >
                        {generateDraftMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileText className="h-3.5 w-3.5" />
                        )}
                        <span className="ml-1.5 hidden sm:inline">Redactar</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProposalsOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Social Post Dialog */}
      {socialPostArticle && (
        <Dialog open={!!socialPostArticle} onOpenChange={(open) => !open && setSocialPostArticle(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-purple-600" />
                Publicación para Redes Sociales
              </DialogTitle>
              <DialogDescription>{socialPostArticle.title}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-72">
              <div className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-4">
                {socialPostArticle.socialPost}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  copyToClipboard(socialPostArticle.socialPost || '')
                    .then(() => toast.success('Copiado al portapapeles'))
                    .catch(() => toast.error('Error al copiar'));
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
              <Button onClick={() => setSocialPostArticle(null)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
