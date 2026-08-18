import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMutation, useQuery } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api/documents.api';
import { entitiesApi } from '@/lib/api/entities.api';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bot,
  Send,
  FileText,
  Sparkles,
  ListChecks,
  Languages,
  FileEdit,
  AlertTriangle,
  Copy,
  Plus,
  Loader2,
  X,
  Search,
  Link,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  title?: string;
  sources?: { title: string; id: string }[];
  metadata?: any;
}

interface LinkedDocument {
  id: string;
  correlativeNumber: string;
  title: string;
}

const modes = [
  { id: 'summarize', label: 'Resumir', icon: Sparkles },
  { id: 'draft', label: 'Redactar respuesta', icon: FileEdit },
  { id: 'keypoints', label: 'Puntos clave', icon: ListChecks },
  { id: 'translate', label: 'Traducir', icon: Languages },
  { id: 'memo', label: 'Preparar memo', icon: FileText },
];

const tones = [
  { id: 'formal', label: 'Formal' },
  { id: 'very_formal', label: 'Muy formal' },
  { id: 'internal', label: 'Nota interna' },
];

const documentTypes = [
  { id: 'RESPUESTA', label: 'Respuesta a Oficio' },
  { id: 'MEMORANDO', label: 'Memorando Interno' },
  { id: 'DECRETO', label: 'Decreto Ministerial' },
  { id: 'OFICIO', label: 'Oficio' },
  { id: 'RESOLUCION', label: 'Resolución' },
  { id: 'CARTA', label: 'Carta Oficial' },
];

export default function AIAssistant() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hola, soy tu asistente de inteligencia artificial. ¿En qué puedo ayudarte hoy?\n\nPuedo ayudarte a:\n- Generar documentos oficiales (Respuestas, Memorandos, Decretos, etc.)\n- Resumir documentos existentes\n- Redactar respuestas oficiales\n- Extraer puntos clave\n\nSelecciona un tipo de documento y describe lo que necesitas generar.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<string>('RESPUESTA');
  const [tone, setTone] = useState('formal');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Linked documents state
  const [linkedDocuments, setLinkedDocuments] = useState<LinkedDocument[]>([]);
  const [addDocOpen, setAddDocOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search documents query (only fires when dialog is open and has search term)
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['ai-doc-search', debouncedSearch],
    queryFn: () => documentsApi.findAll({ search: debouncedSearch, limit: 10 }),
    enabled: addDocOpen && debouncedSearch.trim().length >= 2,
  });

  // Fetch entities for document creation
  const { data: entitiesData, isLoading: isLoadingEntities, error: entitiesError } = useQuery({
    queryKey: ['entities'],
    queryFn: () => entitiesApi.getAll(),
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (entitiesError) {
      console.error('Error loading entities:', entitiesError);
      toast.error('Error al cargar entidades. Algunas funciones pueden no estar disponibles.');
    }
  }, [entitiesError]);

  const handleAddLinkedDocument = (doc: any) => {
    const alreadyLinked = linkedDocuments.some(d => d.id === doc.id);
    if (alreadyLinked) {
      toast.info('Este documento ya está vinculado');
      return;
    }
    setLinkedDocuments(prev => [...prev, {
      id: doc.id,
      correlativeNumber: doc.correlativeNumber || doc.id.slice(0, 8),
      title: doc.title,
    }]);
    setAddDocOpen(false);
    setSearchQuery('');
    toast.success(`Documento ${doc.correlativeNumber || doc.title} vinculado`);
  };

  const handleRemoveLinkedDocument = (docId: string) => {
    setLinkedDocuments(prev => prev.filter(d => d.id !== docId));
  };

  // Mutation for generating document from prompt
  const generateMutation = useMutation({
    mutationFn: async ({ prompt, history }: { prompt: string; history: Message[] }) => {
      return documentsApi.generateFromPrompt({
        documentType,
        prompt,
        tone,
        language: 'es',
        linkedDocumentIds: linkedDocuments.map(d => d.id),
        conversationHistory: history.map(m => ({ role: m.role, content: m.content })),
      } as any);
    },
    onSuccess: (data) => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        title: data.title,
        metadata: data.metadata,
      };
      setMessages(prev => [...prev, aiMessage]);
      setLoading(false);
    },
    onError: (error: any) => {
      console.error('Error generating document:', error);
      const errorMessage = error.response?.data?.message || 'Error al generar documento. Por favor, intente nuevamente.';
      toast.error(errorMessage);
      setLoading(false);
    },
  });

  const handleSend = async () => {
    if (!input.trim()) return;

    const linkedNote = linkedDocuments.length > 0
      ? ` [Contexto: ${linkedDocuments.map(d => d.correlativeNumber).join(', ')}]`
      : '';

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `[${documentTypes.find(dt => dt.id === documentType)?.label}]${linkedNote} ${input}`,
    };

    // Snapshot history BEFORE adding the new user message
    const historySnapshot = messages;
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    generateMutation.mutate({ prompt: currentInput, history: historySnapshot });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (content: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
        toast.success('Texto copiado al portapapeles');
        return;
      }
    } catch (clipboardError) {
      console.log('Modern clipboard API failed, trying fallback:', clipboardError);
    }

    try {
      const textArea = window.document.createElement('textarea');
      textArea.value = content;
      textArea.style.position = 'absolute';
      textArea.style.left = '-9999px';
      textArea.style.top = '0';
      textArea.style.opacity = '0';
      window.document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, content.length);
      const successful = window.document.execCommand('copy');
      window.document.body.removeChild(textArea);
      if (successful) {
        toast.success('Texto copiado al portapapeles');
      } else {
        toast.error('Error al copiar texto. Por favor, intente copiar manualmente.');
      }
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('Error al copiar texto. Por favor, intente copiar manualmente.');
    }
  };

  const handleSaveDocument = async (message: Message) => {
    try {
      if (!user) {
        toast.error('Usuario no autenticado. Por favor, inicie sesión nuevamente.');
        return;
      }

      if (isLoadingEntities) {
        toast.error('Cargando entidades. Por favor, espere un momento.');
        return;
      }

      if (!entitiesData || entitiesData.length === 0) {
        toast.error('No hay entidades disponibles. Contacte al administrador.');
        return;
      }

      const defaultEntity = entitiesData[0];

      const documentData = {
        title: message.title || 'Documento Generado por IA',
        type: documentType,
        direction: 'OUT' as const,
        classification: 'EXTERNAL' as const,
        entityId: defaultEntity.id,
        responsibleId: user.id,
        content: message.content,
        isDraft: true,
        priority: 'MEDIUM' as const,
        tags: ['AI-Generated', documentType],
      };

      const result = await documentsApi.create(documentData);

      toast.success(
        `Documento guardado como borrador con ID: ${result.documentNumber || 'N/A'}`,
        {
          description: 'Puede editarlo desde la sección de documentos',
          duration: 5000,
        }
      );
    } catch (error: any) {
      console.error('Error saving document:', error);
      toast.error(
        error.response?.data?.message || 'Error al guardar el documento'
      );
    }
  };

  const handleDownloadPDF = (message: Message) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(message.title || 'Documento Generado por IA', 20, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tipo: ${documentTypes.find(dt => dt.id === documentType)?.label}`, 20, 30);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 20, 35);

      if (message.metadata) {
        doc.text(`Palabras: ${message.metadata.wordCount || 'N/A'}`, 20, 40);
        doc.text(`Páginas estimadas: ${message.metadata.estimatedPages || 'N/A'}`, 20, 45);
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      const lines = doc.splitTextToSize(message.content, maxWidth);

      let yPosition = 55;
      const lineHeight = 7;
      const pageHeight = doc.internal.pageSize.getHeight();

      lines.forEach((line: string) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, margin, yPosition);
        yPosition += lineHeight;
      });

      const filename = `${message.title?.replace(/\s+/g, '_') || 'documento'}_${Date.now()}.pdf`;
      doc.save(filename);

      toast.success('PDF descargado correctamente');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Error al generar el PDF');
    }
  };

  const searchDocuments = searchResults?.data || searchResults?.documents || (Array.isArray(searchResults) ? searchResults : []);

  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-7xl mx-auto animate-fade-in">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col p-6">
        <PageHeader
          title={t('ai.title')}
          description={t('ai.description')}
        />

        {/* Document Type Selector */}
        <div className="mb-4">
          <Label className="text-sm font-medium mb-2 block">Tipo de Documento</Label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map(type => (
                <SelectItem key={type.id} value={type.id}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={cn(
                'chat-message',
                message.role === 'user' ? 'chat-message-user' : 'chat-message-ai'
              )}
            >
              <div className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-accent'
              )}>
                {message.role === 'user' ? 'TÚ' : <Bot className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                </div>
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">{t('ai.sources')}:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.sources.map(source => (
                        <Badge key={source.id} variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                          <FileText className="h-3 w-3 mr-1" />
                          {source.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {message.role === 'assistant' && message.id !== '1' && message.content && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(message.content)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleSaveDocument(message)}
                      disabled={isLoadingEntities || !entitiesData || entitiesData.length === 0}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {isLoadingEntities ? 'Cargando...' : 'Guardar como Documento'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(message)}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Descargar PDF
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-message chat-message-ai">
              <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <div className="flex-1">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-pulse-soft" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-pulse-soft" style={{ animationDelay: '0.2s' }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-pulse-soft" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Warning Banner */}
        <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg mb-4">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <p className="text-sm text-warning">{t('ai.review_warning')}</p>
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <Textarea
            placeholder="Ej: Generar respuesta oficial sobre solicitud de información presupuestaria del Ministerio de Educación..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-12 max-h-32 resize-none"
            rows={1}
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Right Panel - Settings */}
      <div className="w-72 border-l p-4 space-y-6 hidden lg:block">
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t('ai.tone')}</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tones.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Linked Documents */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Documentos vinculados</Label>
          <Card>
            <CardContent className="p-3 space-y-2">
              {linkedDocuments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Sin documentos vinculados.<br />Añade contexto para mejores respuestas.
                </p>
              ) : (
                linkedDocuments.map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 text-sm group">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1 text-xs" title={doc.title}>
                      {doc.correlativeNumber}
                    </span>
                    <button
                      onClick={() => handleRemoveLinkedDocument(doc.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      title="Quitar documento"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => setAddDocOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Añadir documento
              </Button>
            </CardContent>
          </Card>
          {linkedDocuments.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <Link className="h-3 w-3 inline mr-1" />
              El IA usará estos documentos como contexto.
            </p>
          )}
        </div>
      </div>

      {/* Add Document Dialog */}
      <Dialog open={addDocOpen} onOpenChange={(open) => {
        setAddDocOpen(open);
        if (!open) setSearchQuery('');
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Buscar documento para vincular
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Buscar por título o número de documento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />

            <div className="min-h-[200px] max-h-[300px] overflow-y-auto space-y-1">
              {debouncedSearch.trim().length < 2 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Escribe al menos 2 caracteres para buscar
                </p>
              ) : isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Buscando...</span>
                </div>
              ) : searchDocuments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No se encontraron documentos
                </p>
              ) : (
                searchDocuments.map((doc: any) => {
                  const alreadyLinked = linkedDocuments.some(d => d.id === doc.id);
                  return (
                    <button
                      key={doc.id}
                      onClick={() => handleAddLinkedDocument(doc)}
                      disabled={alreadyLinked}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-md text-sm transition-colors border',
                        alreadyLinked
                          ? 'opacity-50 cursor-not-allowed bg-muted border-transparent'
                          : 'hover:bg-accent border-transparent hover:border-border cursor-pointer'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.correlativeNumber} · {doc.direction === 'IN' ? 'Entrada' : 'Salida'}
                          </p>
                        </div>
                        {alreadyLinked && (
                          <Badge variant="secondary" className="text-xs shrink-0">Vinculado</Badge>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
