import { useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Stamp,
  PenTool,
  CheckCircle,
  Send,
  Archive,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WorkflowStage {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  order: number;
  requiredFor: 'IN' | 'OUT' | 'BOTH';
}

interface WorkflowTimelineProps {
  document: any;
  className?: string;
  compact?: boolean;
}

const INCOMING_STAGES: WorkflowStage[] = [
  {
    id: 'PENDING',
    name: 'Pendiente',
    description: 'Documento creado, esperando procesamiento',
    icon: <Clock className="h-4 w-4" />,
    order: 1,
    requiredFor: 'BOTH',
  },
  {
    id: 'MANUAL_ENTRY',
    name: 'Entrada Manual',
    description: 'Sello de entrada aplicado',
    icon: <Stamp className="h-4 w-4" />,
    order: 2,
    requiredFor: 'IN',
  },
  {
    id: 'RECEIVED',
    name: 'Recibido',
    description: 'Documento recibido oficialmente',
    icon: <FileText className="h-4 w-4" />,
    order: 3,
    requiredFor: 'IN',
  },
  {
    id: 'REGISTRATION',
    name: 'Registro',
    description: 'Documento registrado en el sistema',
    icon: <FileText className="h-4 w-4" />,
    order: 4,
    requiredFor: 'IN',
  },
  {
    id: 'DISTRIBUTION',
    name: 'Distribución',
    description: 'Asignado a departamento responsable',
    icon: <Send className="h-4 w-4" />,
    order: 5,
    requiredFor: 'IN',
  },
  {
    id: 'ANALYSIS',
    name: 'Análisis',
    description: 'En proceso de análisis',
    icon: <FileText className="h-4 w-4" />,
    order: 6,
    requiredFor: 'IN',
  },
  {
    id: 'DRAFT_RESPONSE',
    name: 'Borrador de Respuesta',
    description: 'Preparando respuesta',
    icon: <FileText className="h-4 w-4" />,
    order: 7,
    requiredFor: 'IN',
  },
  {
    id: 'REVIEW',
    name: 'Revisión',
    description: 'En revisión',
    icon: <FileText className="h-4 w-4" />,
    order: 8,
    requiredFor: 'IN',
  },
  {
    id: 'SIGNATURE_PROTOCOL',
    name: 'Protocolo de Firma',
    description: 'Esperando firma ministerial',
    icon: <PenTool className="h-4 w-4" />,
    order: 9,
    requiredFor: 'BOTH',
  },
  {
    id: 'ACKNOWLEDGMENT',
    name: 'Confirmación',
    description: 'Confirmación de recepción',
    icon: <CheckCircle className="h-4 w-4" />,
    order: 10,
    requiredFor: 'IN',
  },
  {
    id: 'ARCHIVED',
    name: 'Archivado',
    description: 'Documento archivado',
    icon: <Archive className="h-4 w-4" />,
    order: 11,
    requiredFor: 'BOTH',
  },
];

const OUTGOING_STAGES: WorkflowStage[] = [
  {
    id: 'PENDING',
    name: 'Pendiente',
    description: 'Documento creado',
    icon: <Clock className="h-4 w-4" />,
    order: 1,
    requiredFor: 'BOTH',
  },
  {
    id: 'DRAFT',
    name: 'Borrador',
    description: 'En redacción',
    icon: <FileText className="h-4 w-4" />,
    order: 2,
    requiredFor: 'OUT',
  },
  {
    id: 'REVISION',
    name: 'Revisión',
    description: 'En proceso de revisión',
    icon: <FileText className="h-4 w-4" />,
    order: 3,
    requiredFor: 'OUT',
  },
  {
    id: 'SIGNATURE_PROTOCOL',
    name: 'Protocolo de Firma',
    description: 'Esperando firma ministerial',
    icon: <PenTool className="h-4 w-4" />,
    order: 4,
    requiredFor: 'BOTH',
  },
  {
    id: 'PRINTED_SENT',
    name: 'Impreso y Enviado',
    description: 'Documento enviado',
    icon: <Send className="h-4 w-4" />,
    order: 5,
    requiredFor: 'OUT',
  },
  {
    id: 'ARCHIVED',
    name: 'Archivado',
    description: 'Documento archivado',
    icon: <Archive className="h-4 w-4" />,
    order: 6,
    requiredFor: 'BOTH',
  },
];

export function WorkflowTimeline({ document, className, compact = false }: WorkflowTimelineProps) {
  // Return null if document or required fields are missing
  if (!document || !document.direction || !document.currentStage) {
    return null;
  }

  const stages = useMemo(() => {
    return document.direction === 'IN' ? INCOMING_STAGES : OUTGOING_STAGES;
  }, [document.direction]);

  const currentStageIndex = useMemo(() => {
    return stages.findIndex((stage) => stage.id === document.currentStage);
  }, [stages, document.currentStage]);

  const getStageStatus = (stageIndex: number): 'completed' | 'current' | 'upcoming' => {
    if (stageIndex < currentStageIndex) return 'completed';
    if (stageIndex === currentStageIndex) return 'current';
    return 'upcoming';
  };

  const getStageIcon = (stage: WorkflowStage, status: string) => {
    if (status === 'completed') {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    if (status === 'current') {
      return <div className="relative">{stage.icon}</div>;
    }
    return <Circle className="h-5 w-5 text-gray-300" />;
  };

  const getStageDate = (stageId: string): Date | null => {
    // Map stage IDs to document fields
    const stageFields: Record<string, string> = {
      MANUAL_ENTRY: 'manualEntryDate',
      SIGNATURE_PROTOCOL: 'signedAt',
      ACKNOWLEDGMENT: 'acknowledgmentDate',
      ARCHIVED: 'archivedAt',
    };

    const field = stageFields[stageId];
    return field && document[field] ? new Date(document[field]) : null;
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex-1 flex items-center gap-1">
          {stages.map((stage, index) => {
            const status = getStageStatus(index);
            return (
              <div
                key={stage.id}
                className={cn(
                  'h-2 flex-1 rounded',
                  status === 'completed' && 'bg-green-600',
                  status === 'current' && 'bg-blue-600',
                  status === 'upcoming' && 'bg-gray-200'
                )}
              />
            );
          })}
        </div>
        <Badge variant={currentStageIndex === stages.length - 1 ? 'success' : 'default'}>
          {stages[currentStageIndex]?.name || 'Desconocido'}
        </Badge>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Progreso del Flujo de Trabajo</span>
          <Badge variant="outline">
            {currentStageIndex + 1} / {stages.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const status = getStageStatus(index);
            const stageDate = getStageDate(stage.id);

            return (
              <div key={stage.id} className="flex gap-4">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center border-2',
                      status === 'completed' &&
                        'bg-green-50 border-green-600 text-green-600',
                      status === 'current' &&
                        'bg-blue-50 border-blue-600 text-blue-600 ring-4 ring-blue-100',
                      status === 'upcoming' && 'bg-gray-50 border-gray-300 text-gray-400'
                    )}
                  >
                    {getStageIcon(stage, status)}
                  </div>
                  {index < stages.length - 1 && (
                    <div
                      className={cn(
                        'w-0.5 h-16 mt-2',
                        status === 'completed' ? 'bg-green-600' : 'bg-gray-200'
                      )}
                    />
                  )}
                </div>

                {/* Stage info */}
                <div className="flex-1 pb-8">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4
                        className={cn(
                          'font-medium',
                          status === 'completed' && 'text-green-900',
                          status === 'current' && 'text-blue-900',
                          status === 'upcoming' && 'text-gray-500'
                        )}
                      >
                        {stage.name}
                      </h4>
                      <p
                        className={cn(
                          'text-sm mt-1',
                          status === 'completed' && 'text-green-700',
                          status === 'current' && 'text-blue-700',
                          status === 'upcoming' && 'text-gray-400'
                        )}
                      >
                        {stage.description}
                      </p>
                      {stageDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(stageDate, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
                        </p>
                      )}
                    </div>

                    {/* Status badge */}
                    {status === 'completed' && (
                      <Badge variant="success" className="text-xs">
                        Completado
                      </Badge>
                    )}
                    {status === 'current' && (
                      <Badge variant="default" className="text-xs">
                        En progreso
                      </Badge>
                    )}
                  </div>

                  {/* Stage-specific info */}
                  {status === 'completed' && stage.id === 'MANUAL_ENTRY' && document.manualEntryTime && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Hora: {document.manualEntryTime}
                    </div>
                  )}

                  {status === 'completed' && stage.id === 'SIGNATURE_PROTOCOL' && document.signedBy && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Firmado por el Ministro
                    </div>
                  )}

                  {status === 'completed' &&
                    stage.id === 'ACKNOWLEDGMENT' &&
                    document.acknowledgmentBy && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Confirmado por: {document.acknowledgmentBy}
                      </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
