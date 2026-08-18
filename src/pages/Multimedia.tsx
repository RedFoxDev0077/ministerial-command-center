import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Upload,
  Mic,
  Video,
  FileText,
  Trash2,
  Loader2,
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  Globe,
  ClipboardList,
  Share2,
  Camera,
  Download,
  ImageIcon,
} from 'lucide-react';
import { multimediaApi, type MediaTranscription } from '@/lib/api/multimedia.api';
import { copyToClipboard } from '@/lib/clipboard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

// Renders AI text cleanly — strips ** markers, renders bold, handles paragraphs
function AiText({ text, className = '' }: { text: string; className?: string }) {
  const clean = text.replace(/^#+\s*/gm, ''); // strip ## headers
  const paragraphs = clean.split(/\n{2,}/);
  return (
    <div className={`text-xs space-y-2 ${className}`}>
      {paragraphs.map((para, i) => {
        const lines = para.trim().split('\n');
        return (
          <p key={i} className="leading-relaxed">
            {lines.map((line, j) => {
              const parts = line.split(/(\*\*[^*]+\*\*)/g);
              return (
                <span key={j}>
                  {parts.map((part, k) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <strong key={k} className="font-semibold">{part.slice(2, -2)}</strong>
                      : <span key={k}>{part}</span>
                  )}
                  {j < lines.length - 1 && <br />}
                </span>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}

const LANGUAGES = [
  { value: 'fr', label: 'Francés' },
  { value: 'en', label: 'Inglés' },
  { value: 'ru', label: 'Ruso' },
  { value: 'zh', label: 'Chino' },
  { value: 'pt', label: 'Portugués' },
];

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  PENDING: { label: 'Pendiente', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  PROCESSING: { label: 'Procesando', icon: Loader2, color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: 'Completado', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  FAILED: { label: 'Error', icon: XCircle, color: 'bg-red-100 text-red-800' },
};

export default function MultimediaPage() {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MediaTranscription | null>(null);
  const [translateLang, setTranslateLang] = useState('fr');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['multimedia'],
    queryFn: multimediaApi.getAll,
    refetchInterval: 5000,
  });

  // Keep detail panel in sync with list data
  const syncedItem = selectedItem
    ? (items.find(i => i.id === selectedItem.id) ?? selectedItem)
    : null;

  const uploadMutation = useMutation({
    mutationFn: (file: File) => multimediaApi.transcribe(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multimedia'] });
      toast.success('Archivo subido. La transcripción está en proceso...');
      setUploadOpen(false);
    },
    onError: () => toast.error('Error al subir archivo'),
  });

  const summaryMutation = useMutation({
    mutationFn: (id: string) => multimediaApi.generateSummary(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['multimedia'] });
      setSelectedItem(data);
      toast.success('Resumen generado');
    },
    onError: () => toast.error('Error al generar resumen'),
  });

  const socialPostMutation = useMutation({
    mutationFn: (id: string) => multimediaApi.generateSocialPost(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['multimedia'] });
      setSelectedItem(data);
      toast.success('Post para redes sociales generado');
    },
    onError: () => toast.error('Error al generar post'),
  });

  const translateMutation = useMutation({
    mutationFn: ({ id, lang }: { id: string; lang: string }) => multimediaApi.translate(id, lang),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['multimedia'] });
      setSelectedItem(data);
      toast.success('Traducción generada');
    },
    onError: () => toast.error('Error al traducir'),
  });

  const opinionMutation = useMutation({
    mutationFn: (id: string) => multimediaApi.generateTechnicalOpinion(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['multimedia'] });
      setSelectedItem(data);
      toast.success('Dictamen técnico generado');
    },
    onError: () => toast.error('Error al generar dictamen'),
  });

  const extractFramesMutation = useMutation({
    mutationFn: (id: string) => multimediaApi.extractFrames(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['multimedia'] });
      setSelectedItem(data);
      toast.success('Extrayendo mejores fotos con IA...');
    },
    onError: () => toast.error('Error al extraer fotos'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => multimediaApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multimedia'] });
      setSelectedItem(null);
      toast.success('Transcripción eliminada');
    },
    onError: () => toast.error('Error al eliminar'),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) {
      toast.error('El archivo no debe superar los 200 MB');
      return;
    }
    uploadMutation.mutate(file);
  };

  const handleDownloadFrame = (item: MediaTranscription, filename: string) => {
    const url = multimediaApi.getFrameUrl(item.id, filename);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.fileName.replace(/\.[^/.]+$/, '')}_${filename}`;
    a.click();
  };

  const item = syncedItem;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in safe-area-inset">
      <PageHeader
        title="Multimedia"
        description="Transcripción, traducción y contenido para redes sociales con IA"
      />

      <div className="flex justify-end mb-6">
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Subir Audio/Video
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* List */}
        <div className="lg:col-span-2 space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
              Cargando...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mic className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No hay transcripciones</p>
              <p className="text-xs mt-1">Suba un archivo de audio o video para comenzar</p>
            </div>
          ) : (
            items.map((i) => {
              const status = statusConfig[i.status] || statusConfig.PENDING;
              const StatusIcon = status.icon;
              return (
                <Card
                  key={i.id}
                  className={`cursor-pointer transition-colors ${item?.id === i.id ? 'border-primary' : 'hover:border-primary/30'}`}
                  onClick={() => setSelectedItem(i)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-muted shrink-0">
                          {i.fileType === 'audio' ? <Mic className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-sm truncate">{i.fileName}</h3>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(i.createdAt), 'dd MMM yyyy, HH:mm', { locale: es })}
                            {i.fileSize && ` · ${(i.fileSize / 1024 / 1024).toFixed(1)} MB`}
                          </p>
                          {/* Feature badges */}
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {i.socialPost && (
                              <span className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded">
                                Post listo
                              </span>
                            )}
                            {i.framesStatus === 'COMPLETED' && (
                              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                                Fotos IA
                              </span>
                            )}
                            {i.translation && (
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                Traducido
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge className={`text-[10px] shrink-0 ${status.color}`}>
                        <StatusIcon className={`h-3 w-3 mr-1 ${i.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                        {status.label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Detail Panel */}
        <Card>
          <CardContent className="p-4">
            {item ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm truncate">{item.fileName}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {item.status === 'PROCESSING' && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Transcribiendo...
                  </div>
                )}

                {item.status === 'FAILED' && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    Error: {item.errorMessage || 'Error desconocido'}
                  </div>
                )}

                {/* Transcription */}
                {item.transcription && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        Transcripción
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          copyToClipboard(item.transcription!)
                            .then(() => toast.success('Copiado'))
                            .catch(() => toast.error('Error al copiar'));
                        }}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar
                      </Button>
                    </div>
                    <ScrollArea className="h-40 rounded-lg border p-3">
                      <p className="text-xs whitespace-pre-wrap">{item.transcription}</p>
                    </ScrollArea>
                  </div>
                )}

                {/* Summary */}
                {item.summary && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                      Resumen Ejecutivo
                    </span>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <AiText text={item.summary} />
                    </div>
                  </div>
                )}

                {item.status === 'COMPLETED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => summaryMutation.mutate(item.id)}
                    disabled={summaryMutation.isPending}
                  >
                    {summaryMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    {item.summary ? 'Regenerar Resumen' : 'Generar Resumen'}
                  </Button>
                )}

                {/* Social Media Post */}
                {item.socialPost && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium flex items-center gap-1">
                        <Share2 className="h-3.5 w-3.5 text-pink-600" />
                        Post para Redes Sociales
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          copyToClipboard(item.socialPost!)
                            .then(() => toast.success('Post copiado'))
                            .catch(() => toast.error('Error al copiar'));
                        }}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar
                      </Button>
                    </div>
                    <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                      <AiText text={item.socialPost} />
                    </div>
                  </div>
                )}

                {item.status === 'COMPLETED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-pink-200 text-pink-700 hover:bg-pink-50"
                    onClick={() => socialPostMutation.mutate(item.id)}
                    disabled={socialPostMutation.isPending}
                  >
                    {socialPostMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Share2 className="h-4 w-4 mr-2" />
                    )}
                    {item.socialPost ? 'Regenerar Post' : 'Generar Post para Redes'}
                  </Button>
                )}

                {/* Translation */}
                {item.translation && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5 text-blue-600" />
                      Traducción ({LANGUAGES.find(l => l.value === item.translationLang)?.label || item.translationLang})
                    </span>
                    <ScrollArea className="h-36 rounded-lg border p-3">
                      <AiText text={item.translation} />
                    </ScrollArea>
                  </div>
                )}

                {item.status === 'COMPLETED' && (
                  <div className="flex gap-2">
                    <Select value={translateLang} onValueChange={setTranslateLang}>
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(l => (
                          <SelectItem key={l.value} value={l.value} className="text-xs">{l.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => translateMutation.mutate({ id: item.id, lang: translateLang })}
                      disabled={translateMutation.isPending}
                    >
                      {translateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                      <span className="ml-1">Traducir</span>
                    </Button>
                  </div>
                )}

                {/* Technical Opinion */}
                {item.technicalOpinion && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <ClipboardList className="h-3.5 w-3.5 text-orange-600" />
                      Dictamen Técnico
                    </span>
                    <ScrollArea className="h-40 rounded-lg border p-3 bg-orange-50">
                      <AiText text={item.technicalOpinion} />
                    </ScrollArea>
                  </div>
                )}

                {item.status === 'COMPLETED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => opinionMutation.mutate(item.id)}
                    disabled={opinionMutation.isPending}
                  >
                    {opinionMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ClipboardList className="h-4 w-4 mr-2" />
                    )}
                    {item.technicalOpinion ? 'Regenerar Dictamen' : 'Generar Dictamen Técnico'}
                  </Button>
                )}

                {/* Best Frames / Photos */}
                {item.framesStatus === 'PROCESSING' && (
                  <div className="flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 p-3 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span className="text-xs">Analizando video y seleccionando mejores fotos con IA...</span>
                  </div>
                )}

                {item.framesStatus === 'COMPLETED' && item.bestFrames && item.bestFrames.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <ImageIcon className="h-3.5 w-3.5 text-indigo-600" />
                      Mejores Fotos ({item.bestFrames.length})
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {item.bestFrames.map((frame) => (
                        <div key={frame.filename} className="relative group rounded-lg overflow-hidden border bg-muted">
                          <img
                            src={multimediaApi.getFrameUrl(item.id, frame.filename)}
                            alt="Frame"
                            className="w-full h-24 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <button
                            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDownloadFrame(item, frame.filename)}
                          >
                            <Download className="h-5 w-5 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Pase el cursor sobre una foto y haga clic para descargar</p>
                  </div>
                )}

                {item.framesStatus === 'FAILED' && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                    Error al extraer fotos del video
                  </div>
                )}

                {item.status === 'COMPLETED' && item.fileType === 'video' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    onClick={() => extractFramesMutation.mutate(item.id)}
                    disabled={extractFramesMutation.isPending || item.framesStatus === 'PROCESSING'}
                  >
                    {extractFramesMutation.isPending || item.framesStatus === 'PROCESSING' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Camera className="h-4 w-4 mr-2" />
                    )}
                    {item.framesStatus === 'COMPLETED' ? 'Re-extraer Mejores Fotos' : 'Extraer Mejores Fotos con IA'}
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Mic className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Seleccione una transcripción</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Subir Audio o Video</DialogTitle>
            <DialogDescription>
              Suba una entrevista o video del Ministro para transcribir, generar posts y extraer fotos. Máximo 200 MB.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Haga clic para seleccionar un archivo</p>
              <p className="text-xs text-muted-foreground/70 mt-1">MP4, MOV, MP3, WAV, M4A, WebM — hasta 200 MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="audio/*,video/*"
              onChange={handleFileSelect}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploadMutation.isPending}>
              Cancelar
            </Button>
            {uploadMutation.isPending && (
              <Button disabled>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Subiendo...
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
