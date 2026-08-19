import { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Optional leading icon, passed as the component itself (e.g. `icon={FileText}`). */
  icon?: LucideIcon;
}

export function PageHeader({ title, description, action, icon: Icon }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 animate-fade-in-down">
      <div className="page-header pb-0 min-w-0 flex items-start gap-3">
        {Icon && (
          <span className="shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
        <h1 className="page-title text-lg sm:text-xl lg:text-2xl truncate">{title}</h1>
        {description && (
          <p className="page-description text-xs sm:text-sm mt-0.5 sm:mt-1 line-clamp-2">{description}</p>
        )}
        </div>
      </div>
      {action && (
        <div className="shrink-0 animate-fade-in-right" style={{ animationDelay: '0.1s' }}>
          {action}
        </div>
      )}
    </div>
  );
}
