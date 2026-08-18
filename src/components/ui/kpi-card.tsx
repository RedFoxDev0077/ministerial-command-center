import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  className?: string;
  loading?: boolean;
}

export function KpiCard({ title, value, icon: Icon, trend, className, loading }: KpiCardProps) {
  if (loading) {
    return (
      <div className={cn('kpi-card', className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="h-4 w-20 sm:w-24 rounded bg-muted skeleton-shimmer" />
            <div className="h-6 sm:h-8 w-12 sm:w-16 rounded bg-muted skeleton-shimmer" />
          </div>
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-muted skeleton-shimmer shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'kpi-card group cursor-pointer',
      'transition-all duration-300 ease-out',
      'hover:shadow-md hover:border-primary/20',
      'active:scale-[0.98]',
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="mt-1 text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight transition-transform duration-300 group-hover:scale-105 origin-left">
            {value}
          </p>
          {trend && (
            <p className={cn(
              'mt-1 text-[10px] sm:text-xs font-medium transition-colors',
              trend.positive ? 'text-success' : 'text-destructive'
            )}>
              {trend.positive ? '+' : ''}{trend.value}% vs. ayer
            </p>
          )}
        </div>
        <div className={cn(
          'flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg shrink-0',
          'bg-primary/10 text-primary',
          'transition-all duration-300 ease-out',
          'group-hover:bg-primary group-hover:text-primary-foreground',
          'group-hover:scale-110 group-hover:rotate-3',
          'group-hover:shadow-lg'
        )}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 group-hover:scale-110" />
        </div>
      </div>

      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/0 to-primary/0 transition-all duration-300 group-hover:from-primary/5 group-hover:to-transparent pointer-events-none" />
    </div>
  );
}
