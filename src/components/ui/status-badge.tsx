import { cn } from '@/lib/utils';

type StatusVariant = 'success' | 'warning' | 'destructive' | 'info' | 'muted';

interface StatusBadgeProps {
  variant: StatusVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({ variant, children, className, dot = true }: StatusBadgeProps) {
  const variantClasses: Record<StatusVariant, string> = {
    success: 'status-badge-success',
    warning: 'status-badge-warning',
    destructive: 'status-badge-destructive',
    info: 'status-badge-info',
    muted: 'status-badge-muted',
  };

  const dotColors: Record<StatusVariant, string> = {
    success: 'bg-success',
    warning: 'bg-warning',
    destructive: 'bg-destructive',
    info: 'bg-info',
    muted: 'bg-muted-foreground',
  };

  return (
    <span className={cn('status-badge', variantClasses[variant], className)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
}
