import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, MoreVertical } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

interface MobileDataCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
  onSelect?: () => void;
}

export function MobileDataCard({
  children,
  className,
  onClick,
  selected,
  onSelect,
}: MobileDataCardProps) {
  return (
    <div
      className={cn(
        'relative bg-card rounded-2xl border p-4',
        'transition-all duration-200',
        'hover:shadow-md hover:border-primary/20',
        'active:scale-[0.99]',
        selected && 'border-primary bg-primary/5 shadow-md',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface MobileDataCardHeaderProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  icon?: ReactNode;
  actions?: { label: string; icon?: ReactNode; onClick: () => void }[];
}

export function MobileDataCardHeader({
  title,
  subtitle,
  badge,
  icon,
  actions,
}: MobileDataCardHeaderProps) {
  return (
    <div className="flex items-start gap-3">
      {icon && (
        <div className="shrink-0">{icon}</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">{title}</h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {badge}
            {actions && actions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {actions.map((action, index) => (
                    <DropdownMenuItem key={index} onClick={action.onClick}>
                      {action.icon}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MobileDataCardRowProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}

export function MobileDataCardRow({ label, value, icon }: MobileDataCardRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

interface MobileDataCardFooterProps {
  left?: ReactNode;
  right?: ReactNode;
}

export function MobileDataCardFooter({ left, right }: MobileDataCardFooterProps) {
  return (
    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
      <div className="text-xs text-muted-foreground">{left}</div>
      <div className="flex items-center gap-1 text-xs text-primary font-medium">
        {right}
        <ChevronRight className="h-3 w-3" />
      </div>
    </div>
  );
}

// Swipeable card wrapper for future swipe actions
interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: { label: string; icon: ReactNode; color: string };
  rightAction?: { label: string; icon: ReactNode; color: string };
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
}: SwipeableCardProps) {
  // Basic implementation - can be enhanced with react-swipeable or framer-motion
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Left action background */}
      {leftAction && (
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-20 flex items-center justify-center',
            leftAction.color
          )}
        >
          {leftAction.icon}
        </div>
      )}

      {/* Right action background */}
      {rightAction && (
        <div
          className={cn(
            'absolute inset-y-0 right-0 w-20 flex items-center justify-center',
            rightAction.color
          )}
        >
          {rightAction.icon}
        </div>
      )}

      {/* Main content */}
      <div className="relative bg-card">{children}</div>
    </div>
  );
}
