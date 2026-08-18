import { useState } from 'react';
import { copyToClipboard } from '@/lib/clipboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Bot,
  Sparkles,
  FileText,
  Send,
  Copy,
  Check,
  RefreshCw,
  ChevronRight,
  Mail,
  AlertCircle,
  Loader2,
  List,
  PenLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { axiosInstance } from '@/lib/api/axios';
import { departmentsApi } from '@/lib/api/departments.api';
import { useNavigate } from 'react-router-dom';

function getDeptColor(level: number): string {
  const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];
  return colors[(level - 1) % colors.length];
}

function getDeptCode(dept: Department): string {
  if (dept.shortName) return dept.shortName;
  const words = dept.name.split(' ');
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return dept.name.substring(0, 2).toUpperCase();
}

interface DocumentAIPanelProps {
  document: any;
  onClose?: () => void;
}

/**
 * Convert plain text (from OpenAI) to HTML for CKEditor.
 * Double newlines → paragraph breaks, single newlines → <br>.
 */
function plainTextToHtml(text: string): string {
  if (!text || text.trim() === '') return '';
  // If it already contains HTML tags, return as-is
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .split(/\n{2,}/)
    .map(para => {
      const inner = para.trim().replace(/\n/g, '<br>');
      return inner ? `<p>${inner}</p>` : '';
    })
    .filter(Boolean)
    .join('\n');
}

export function DocumentAIPanel({ document, onClose }: DocumentAIPanelProps) {
  const [copied, setCopied] = useState<'summary' | 'response' | null>(null);
  const [editedResponse, setEditedResponse] = useState(
    plainTextToHtml(document.aiProposedResponse || '')
  );

  // Local state for AI content (so we can update it without mutating props)
  const [aiSummary, setAiSummary] = useState(document.aiSummary || '');
  const [aiKeyPoints, setAiKeyPoints] = useState(document.aiKeyPoints || []);
  const [aiProposedResponse, setAiProposedResponse] = useState(document.aiProposedResponse || '');

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch departments for decreted-to display
  const { data: allDepartments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsApi.findAll,
    staleTime: 5 * 60 * 1000,
  });

  const handleCopy = async (text: string, type: 'summary' | 'response') => {
    const plain = text.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').trim();
    try {
      await copyToClipboard(plain);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('No se pudo copiar al portapapeles');
    }
  };

  // AI Generation mutation
  const generateAIMutation = useMutation({
    mutationFn: async ({ force = false }: { force?: boolean } = {}) => {
      const response = await axiosInstance.post(`/documents/${document.id}/generate-ai`, { force });
      return response.data;
    },
    onSuccess: async () => {
      // Always do a fresh fetch to get the actual saved AI fields from DB
      // (the generate-ai response may have stale or incomplete data)
      try {
        const freshResponse = await axiosInstance.get(`/documents/${document.id}`);
        const updatedDoc = freshResponse.data;

        const newSummary = updatedDoc.aiSummary || '';
        const newKeyPoints = updatedDoc.aiKeyPoints || [];
        const newProposedResponse = updatedDoc.aiProposedResponse || '';

        setAiSummary(newSummary);
        setAiKeyPoints(newKeyPoints);
        setAiProposedResponse(newProposedResponse);

        if (newProposedResponse) {
          setEditedResponse(plainTextToHtml(newProposedResponse));
        }

        queryClient.invalidateQueries({ queryKey: ['documents'] });
        queryClient.invalidateQueries({ queryKey: ['inbox-documents'] });
        queryClient.invalidateQueries({ queryKey: ['outbox-documents'] });

        if (newProposedResponse) {
          toast.success('IA generada exitosamente', {
            description: 'El contenido se ha actualizado automáticamente',
          });
        } else if (newSummary) {
          toast.success('Resumen generado', {
            description: 'No se pudo generar borrador de respuesta. Agregue más contenido al documento.',
          });
        } else {
          toast.warning('Sin contenido suficiente', {
            description: 'El documento necesita más texto para generar análisis IA.',
          });
        }
      } catch {
        toast.error('Error al obtener resultados de IA');
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Error al generar contenido IA';

      // Show helpful message for short text
      if (errorMessage.includes('too short') || errorMessage.includes('Minimum 50 characters')) {
        toast.error('Documento muy corto', {
          description: 'El documento necesita al menos 50 caracteres para generar contenido con IA. Por favor, agrega más contenido al documento.'
        });
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const handleRegenerate = () => {
    generateAIMutation.mutate({ force: true });
  };

  // Create response document mutation
  const createResponseMutation = useMutation({
    mutationFn: async () => {
      const responseData = {
        title: `Respuesta a: ${document.title}`,
        type: 'RESPUESTA',
        direction: 'OUT',
        classification: 'INTERNAL', // Required field
        content: editedResponse,
        isDraft: true, // Mark as draft instead of using status
        entityId: document.entityId,
        responsibleId: document.responsibleId,
        priority: 'MEDIUM',
      };

      const response = await axiosInstance.post('/documents', responseData);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['outbox-documents'] });

      toast.success('Documento de respuesta creado', {
        description: 'El borrador se ha guardado en la Bandeja de Salida',
      });

      // Navigate to outbox where the new draft document was created
      onClose?.();
      navigate('/outbox');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Error al crear documento de respuesta';
      toast.error(errorMessage);
    },
  });

  const handleCreateResponse = () => {
    if (!editedResponse || editedResponse.trim().length === 0) {
      toast.error('No hay respuesta para crear documento', {
        description: 'Primero genera una respuesta propuesta con IA',
      });
      return;
    }
    createResponseMutation.mutate();
  };

  const decretedDepartments = (document.decretedTo || [])
    .map((id: string) => allDepartments.find((d: Department) => d.id === id))
    .filter(Boolean) as Department[];

  return (
    <div className="space-y-4">
      {/* AI Summary Section */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              Resumen IA
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              disabled={generateAIMutation.isPending}
            >
              {generateAIMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {aiSummary ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {aiSummary}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleCopy(aiSummary, 'summary')}
              >
                {copied === 'summary' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar resumen
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <Bot className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No hay resumen disponible
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleRegenerate}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generar resumen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Points Section */}
      {aiKeyPoints && aiKeyPoints.length > 0 && (
        <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <List className="h-4 w-4 text-green-500" />
              </div>
              Puntos Clave
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {aiKeyPoints.map((point: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
                  <span className="text-muted-foreground leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* AI Proposed Response Section */}
      <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-500" />
              </div>
              Borrador de respuesta (editable)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {(aiProposedResponse || editedResponse) ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Edite el borrador antes de guardarlo como nuevo documento de salida.
              </p>
              <RichTextEditor
                value={editedResponse}
                onChange={setEditedResponse}
                minHeight="200px"
                placeholder="Borrador de respuesta generado por IA..."
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleCopy(editedResponse, 'response')}
                >
                  {copied === 'response' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar
                    </>
                  )}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={handleCreateResponse}
                  disabled={createResponseMutation.isPending || !editedResponse}
                >
                  {createResponseMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Guardar como borrador de respuesta
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground mb-1">
                No hay borrador de respuesta
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Analice el documento con IA para generar un borrador editable.
              </p>
              <Button variant="default" size="sm" className="gap-2" onClick={handleRegenerate} disabled={generateAIMutation.isPending}>
                {generateAIMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generar análisis y borrador de respuesta
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decreted To Section */}
      {decretedDepartments && decretedDepartments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                <Building2 className="h-4 w-4" />
              </div>
              Decretado a
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {decretedDepartments.map((dept) => (
                <div
                  key={dept.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: getDeptColor(dept.level) }}
                    >
                      {getDeptCode(dept)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{dept.name}</p>
                      <p className="text-xs text-muted-foreground">{dept.shortName || `Nivel ${dept.level}`}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Enviar email">
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="WhatsApp">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Decree Dialog Component
interface DecreeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: any;
  onDecree?: (data: {
    decreeNote?: string;
    externalEmail?: string;
  }) => void;
}

export function DecreeDialog({ open, onOpenChange, document, onDecree }: DecreeDialogProps) {
  const [decreeNote, setDecreeNote] = useState<string>(document.decreeNote || '');
  const [externalEmail, setExternalEmail] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSave = () => {
    onDecree?.({ decreeNote: decreeNote.trim() || undefined });
    onOpenChange(false);
  };

  const handleSendEmail = () => {
    if (!externalEmail.trim()) {
      setEmailError('Ingrese una dirección de correo electrónico');
      return;
    }
    if (!isValidEmail(externalEmail.trim())) {
      setEmailError('Dirección de correo no válida');
      return;
    }
    setEmailError('');
    onDecree?.({
      decreeNote: decreeNote.trim() || undefined,
      externalEmail: externalEmail.trim(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-orange-500" />
            Decretar Documento
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* Document reference */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">{document.title}</p>
            <p className="text-xs text-muted-foreground">{document.correlativeNumber}</p>
          </div>

          {/* Decree note */}
          <div className="space-y-1.5">
            <Label htmlFor="decree-note" className="text-sm font-medium flex items-center gap-1.5">
              <PenLine className="h-3.5 w-3.5 text-orange-500" />
              Nota de Decreto
              <span className="text-xs font-normal text-muted-foreground">(orden escrita del Ministro)</span>
            </Label>
            <Textarea
              id="decree-note"
              placeholder="Escriba aquí la orden o instrucción... (ej: «Pase a la Dirección General para que proceda según lo establecido.»)"
              value={decreeNote}
              onChange={(e) => setDecreeNote(e.target.value)}
              className="min-h-[100px] text-sm resize-none border-orange-200 focus-visible:ring-orange-400"
            />
          </div>

          {/* External email */}
          <div className="space-y-1.5">
            <Label htmlFor="external-email" className="text-sm font-medium flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-blue-500" />
              Enviar PDF a destinatario externo
              <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <input
              id="external-email"
              type="email"
              placeholder="nombre@ejemplo.com"
              value={externalEmail}
              onChange={(e) => { setExternalEmail(e.target.value); setEmailError(''); }}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
            <p className="text-xs text-muted-foreground">
              El PDF oficial con la nota de decreto se adjuntará y enviará a este correo.
            </p>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t gap-2 flex-row justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="secondary" onClick={handleSave}>
            Solo Guardar
          </Button>
          <Button onClick={handleSendEmail} className="bg-orange-600 hover:bg-orange-700 text-white">
            <Send className="h-4 w-4 mr-2" />
            Enviar por Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
