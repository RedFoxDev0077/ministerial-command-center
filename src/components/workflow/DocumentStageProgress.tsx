import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Clock,
  FileText,
  Stamp,
  PenTool,
  CheckCircle,
  Send,
  Archive,
} from 'lucide-react';

interface DocumentStageProgressProps {
  direction: 'IN' | 'OUT';
  currentStage: string;
  className?: string;
  showIcon?: boolean;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const STAGE_ORDER = {
  IN: [
    'PENDING',
    'MANUAL_ENTRY',
    'RECEIVED',
    'REGISTRATION',
    'DISTRIBUTION',
    'ANALYSIS',
    'DRAFT_RESPONSE',
    'REVIEW',
    'SIGNATURE_PROTOCOL',
    'ACKNOWLEDGMENT',
    'ARCHIVED',
  ],
  OUT: ['PENDING', 'DRAFT', 'REVISION', 'SIGNATURE_PROTOCOL', 'PRINTED_SENT', 'ARCHIVED'],
};

const STAGE_LABELS = {
  PENDING: 'Pendiente',
  MANUAL_ENTRY: 'Entrada Manual',
  RECEIVED: 'Recibido',
  REGISTRATION: 'Registro',
  DISTRIBUTION: 'Distribución',
  ANALYSIS: 'Análisis',
  DRAFT_RESPONSE: 'Borrador',
  REVIEW: 'Revisión',
  SIGNATURE_PROTOCOL: 'Firma',
  ACKNOWLEDGMENT: 'Confirmación',
  ARCHIVED: 'Archivado',
  DRAFT: 'Borrador',
  REVISION: 'Revisión',
  PRINTED_SENT: 'Enviado',
};

const STAGE_ICONS = {
  PENDING: Clock,
  MANUAL_ENTRY: Stamp,
  RECEIVED: FileText,
  REGISTRATION: FileText,
  DISTRIBUTION: Send,
  ANALYSIS: FileText,
  DRAFT_RESPONSE: FileText,
  REVIEW: FileText,
  SIGNATURE_PROTOCOL: PenTool,
  ACKNOWLEDGMENT: CheckCircle,
  ARCHIVED: Archive,
  DRAFT: FileText,
  REVISION: FileText,
  PRINTED_SENT: Send,
};

const STAGE_COLORS = {
  PENDING: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  MANUAL_ENTRY: 'text-purple-600 bg-purple-50 border-purple-200',
  RECEIVED: 'text-blue-600 bg-blue-50 border-blue-200',
  REGISTRATION: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  DISTRIBUTION: 'text-cyan-600 bg-cyan-50 border-cyan-200',
  ANALYSIS: 'text-teal-600 bg-teal-50 border-teal-200',
  DRAFT_RESPONSE: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  REVIEW: 'text-orange-600 bg-orange-50 border-orange-200',
  SIGNATURE_PROTOCOL: 'text-green-600 bg-green-50 border-green-200',
  ACKNOWLEDGMENT: 'text-blue-600 bg-blue-50 border-blue-200',
  ARCHIVED: 'text-gray-600 bg-gray-50 border-gray-200',
  DRAFT: 'text-blue-600 bg-blue-50 border-blue-200',
  REVISION: 'text-orange-600 bg-orange-50 border-orange-200',
  PRINTED_SENT: 'text-green-600 bg-green-50 border-green-200',
};

export function DocumentStageProgress({
  direction,
  currentStage,
  className,
  showIcon = true,
  showPercentage = true,
  size = 'md',
}: DocumentStageProgressProps) {
  // Return null if required props are missing
  if (!direction || !currentStage) {
    return null;
  }

  const stages = STAGE_ORDER[direction];
  if (!stages) {
    return null;
  }

  const currentIndex = stages.indexOf(currentStage);
  const progress = ((currentIndex + 1) / stages.length) * 100;
  const stageLabel = STAGE_LABELS[currentStage as keyof typeof STAGE_LABELS] || currentStage;
  const StageIcon = STAGE_ICONS[currentStage as keyof typeof STAGE_ICONS] || FileText;
  const stageColor = STAGE_COLORS[currentStage as keyof typeof STAGE_COLORS] || STAGE_COLORS.PENDING;

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const badgeSizes = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {showIcon && <StageIcon className={cn(iconSizes[size], stageColor.split(' ')[0])} />}
          <Badge
            variant="outline"
            className={cn('border', stageColor, badgeSizes[size])}
          >
            {stageLabel}
          </Badge>
        </div>
        {showPercentage && (
          <span className={cn('font-medium tabular-nums', size === 'sm' ? 'text-xs' : 'text-sm')}>
            {Math.round(progress)}%
          </span>
        )}
      </div>
      <Progress value={progress} className={sizeClasses[size]} />
      {size === 'lg' && (
        <p className="text-xs text-muted-foreground">
          Etapa {currentIndex + 1} de {stages.length}
        </p>
      )}
    </div>
  );
}
