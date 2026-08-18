import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 animate-fade-in-down">
      <div className="page-header pb-0 min-w-0">
        <h1 className="page-title text-lg sm:text-xl lg:text-2xl truncate">{title}</h1>
        {description && (
          <p className="page-description text-xs sm:text-sm mt-0.5 sm:mt-1 line-clamp-2">{description}</p>
        )}
      </div>
      {action && (
        <div className="shrink-0 animate-fade-in-right" style={{ animationDelay: '0.1s' }}>
          {action}
        </div>
      )}
    </div>
  );
}
