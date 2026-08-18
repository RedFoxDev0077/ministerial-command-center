import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Sparkles,
  ListChecks,
  AlertTriangle,
  Users,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { documentsApi } from '@/lib/api/documents.api';

interface DocumentAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
}

export function DocumentAnalysisDialog({
  open,
  onOpenChange,
  documentId,
  documentTitle,
}: DocumentAnalysisDialogProps) {
  const [analysis, setAnalysis] = useState<any>(null);

  // Mutation for analyzing document
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      return documentsApi.analyzeDocument(documentId, 'executive_summary');
    },
    onSuccess: (data) => {
      setAnalysis(data);
      toast.success('Análisis completado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error analyzing document:', error);
      const errorMessage =
        error.response?.data?.message ||
        'Error al analizar el documento. Por favor, intente nuevamente.';
      toast.error(errorMessage);
    },
  });

  const handleAnalyze = () => {
    setAnalysis(null);
    analyzeMutation.mutate();
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'ALTA':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIA':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'BAJA':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Análisis con IA
          </DialogTitle>
          <DialogDescription>
            Análisis automático del documento: <span className="font-medium">{documentTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {!analysis && !analyzeMutation.isPending && (
            <div className="py-8 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Haga clic en "Analizar" para obtener un análisis completo del documento con IA
              </p>
              <p className="text-xs text-muted-foreground">
                El análisis incluye: resumen ejecutivo, temas clave, acciones requeridas, nivel de
                urgencia y partes interesadas
              </p>
            </div>
          )}

          {analyzeMutation.isPending && (
            <div className="py-12 text-center">
              <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Analizando documento con IA...
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Esto puede tomar 10-15 segundos
              </p>
            </div>
          )}

          {analysis && (
            <div className="space-y-4">
              {/* Urgency Level */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Nivel de Urgencia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={getUrgencyColor(analysis.urgencyLevel)} variant="outline">
                    {analysis.urgencyLevel}
                  </Badge>
                </CardContent>
              </Card>

              {/* Executive Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Resumen Ejecutivo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {analysis.summary}
                  </p>
                </CardContent>
              </Card>

              {/* Key Topics */}
              {analysis.keyTopics && analysis.keyTopics.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ListChecks className="h-4 w-4" />
                      Temas Clave
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.keyTopics.map((topic: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Required Actions */}
              {analysis.requiredActions && analysis.requiredActions.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Acciones Requeridas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.requiredActions.map((action: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Stakeholders */}
              {analysis.stakeholders && analysis.stakeholders.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Partes Interesadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {analysis.stakeholders.map((stakeholder: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {stakeholder}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Metadata */}
              {analysis.metadata && (
                <div className="text-xs text-muted-foreground pt-2">
                  <Separator className="mb-2" />
                  <p>
                    Analizado: {new Date(analysis.metadata.analyzedAt).toLocaleString('es-ES')}
                  </p>
                  <p>
                    Longitud del contenido: {analysis.metadata.contentLength} caracteres (
                    {analysis.metadata.wordCount} palabras)
                  </p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {!analysis && (
            <Button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending}
              className="gap-2"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analizar
                </>
              )}
            </Button>
          )}
          {analysis && (
            <Button onClick={handleAnalyze} variant="secondary" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Analizar de Nuevo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
