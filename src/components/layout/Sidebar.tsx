import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Home,
  Inbox,
  Send,
  FolderOpen,
  Clock,
  Bot,
  PenTool,
  Archive,
  FileText,
  ClipboardList,
  Building2,
  Network,
  Users,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  CalendarDays,
  Mic,
  MessageCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

const navItems = [
  { key: 'nav.inicio', path: '/dashboard', icon: Home, color: 'bg-blue-500' },
  { key: 'nav.bandeja_entrada', path: '/inbox', icon: Inbox, color: 'bg-green-500' },
  { key: 'nav.bandeja_salida', path: '/outbox', icon: Send, color: 'bg-orange-500' },
  { key: 'nav.nuevo_documento', path: '/new-entry', icon: FileText, color: 'bg-blue-600' },
  { key: 'nav.expedientes', path: '/cases', icon: FolderOpen, color: 'bg-purple-500' },
  { key: 'nav.plazos', path: '/deadlines', icon: Clock, color: 'bg-red-500' },
  { key: 'nav.asistente', path: '/assistant', icon: Bot, color: 'bg-cyan-500' },
  { key: 'nav.firma', path: '/signature', icon: PenTool, color: 'bg-amber-500' },
  { key: 'nav.archivo', path: '/archive', icon: Archive, color: 'bg-slate-500' },
  { key: 'nav.multimedia', path: '/multimedia', icon: Mic, color: 'bg-fuchsia-500' },
  { key: 'nav.agenda', path: '/agenda', icon: CalendarDays, color: 'bg-rose-500' },
  { key: 'nav.whatsapp', path: '/whatsapp', icon: MessageCircle, color: 'bg-green-600' },
  { key: 'nav.contenidos', path: '/content', icon: FileText, color: 'bg-teal-500' },
  { key: 'nav.auditoria', path: '/audit', icon: ClipboardList, color: 'bg-indigo-500' },
  { key: 'nav.seguridad', path: '/security', icon: Shield, color: 'bg-red-600' },
  { key: 'nav.entidades', path: '/entities', icon: Building2, color: 'bg-emerald-500' },
  { key: 'nav.departamentos', path: '/departments', icon: Network, color: 'bg-sky-500' },
  { key: 'nav.usuarios', path: '/users', icon: Users, color: 'bg-violet-500' },
  { key: 'nav.ajustes', path: '/settings', icon: Settings, color: 'bg-gray-500' },
];

// Mobile bottom navigation items (subset of main nav)
const mobileNavItems = [
  { key: 'nav.inicio', path: '/dashboard', icon: Home },
  { key: 'nav.bandeja_entrada', path: '/inbox', icon: Inbox },
  { key: 'nav.expedientes', path: '/cases', icon: FolderOpen },
  { key: 'nav.asistente', path: '/assistant', icon: Bot },
  { key: 'nav.ajustes', path: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile menu button - only visible on mobile */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "fixed top-3 left-3 z-50 lg:hidden h-11 w-11",
          "bg-card/95 backdrop-blur-sm shadow-lg border-2",
          "transition-all duration-300",
          mobileOpen && "rotate-90 bg-primary text-primary-foreground border-primary"
        )}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden transition-all duration-300',
          mobileOpen
            ? 'opacity-100 backdrop-blur-sm bg-black/40'
            : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar - Desktop always visible, Mobile as overlay */}
      <aside
        className={cn(
          'flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300',
          // Desktop styles
          'hidden lg:flex',
          collapsed ? 'lg:w-16' : 'lg:w-64'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center h-16 px-4 border-b border-sidebar-border',
          collapsed ? 'justify-center' : 'gap-3'
        )}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-md animate-scale-in">
            <span className="text-sm font-bold text-sidebar-primary-foreground">IA</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col animate-fade-in-left">
              <span className="text-sm font-semibold text-sidebar-foreground">Plataforma IA</span>
              <span className="text-xs text-sidebar-foreground/60">Ministerial</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <ul className="space-y-1">
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              const navLink = (
                <Link
                  to={item.path}
                  className={cn(
                    'nav-item group',
                    isActive && 'nav-item-active',
                    collapsed && 'justify-center px-2'
                  )}
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <Icon className={cn(
                    'h-5 w-5 shrink-0 transition-transform duration-200',
                    'group-hover:scale-110'
                  )} />
                  {!collapsed && (
                    <span className="transition-colors duration-200">{t(item.key)}</span>
                  )}
                  {isActive && !collapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-primary rounded-r-full" />
                  )}
                </Link>
              );

              return (
                <li key={item.path} className="animate-fade-in-left relative" style={{ animationDelay: `${index * 0.03}s` }}>
                  {collapsed ? (
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        {navLink}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {t(item.key)}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    navLink
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Collapse toggle */}
        <div className="p-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200',
              collapsed && 'px-2'
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 transition-transform hover:translate-x-1" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2 transition-transform hover:-translate-x-1" />
                <span>Colapsar</span>
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar - Slide in from left */}
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 w-[300px] z-50 flex flex-col lg:hidden',
          'bg-gradient-to-b from-sidebar to-sidebar/95 backdrop-blur-xl',
          'border-r border-sidebar-border/50 shadow-2xl',
          'transition-transform duration-300 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile drag indicator */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-sidebar-foreground/20" />
        </div>

        {/* Logo with gradient background */}
        <div className="flex items-center px-5 py-4 gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 shadow-lg shadow-primary/30">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-sidebar-foreground">Plataforma IA</span>
            <span className="text-xs text-sidebar-foreground/60">Centro de Comando Ministerial</span>
          </div>
        </div>

        {/* Search hint */}
        <div className="mx-4 mb-2">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-sidebar-accent/50 text-sm text-sidebar-foreground/70">
            <Bot className="h-4 w-4" />
            <span>Usa el buscador para encontrar rápido</span>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3">
          <nav className="py-2">
            <ul className="space-y-1">
              {navItems.map((item, index) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <li
                    key={item.path}
                    className={cn(
                      mobileOpen && 'animate-fade-in-left'
                    )}
                    style={{ animationDelay: `${index * 0.04}s` }}
                  >
                    <Link
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3.5 rounded-xl relative',
                        'transition-all duration-200 active:scale-[0.98]',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent'
                      )}
                    >
                      <div className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                        isActive
                          ? 'bg-white/20'
                          : 'bg-sidebar-accent'
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-medium">{t(item.key)}</span>
                      {isActive && (
                        <div className="absolute right-3 h-2 w-2 rounded-full bg-white animate-pulse" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border/50">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setMobileOpen(false)}
            className="w-full justify-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-xl h-12"
          >
            <X className="h-5 w-5" />
            <span className="font-medium">Cerrar menú</span>
          </Button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-40 lg:hidden",
        "bg-card/95 backdrop-blur-lg border-t shadow-lg",
        "safe-area-bottom"
      )}
      >
        <div className="flex items-center justify-evenly px-1 py-1">
          {mobileNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            // Short labels for mobile
            const shortLabels: Record<string, string> = {
              'nav.inicio': 'Inicio',
              'nav.bandeja_entrada': 'Bandeja',
              'nav.expedientes': 'Expedientes',
              'nav.asistente': 'Asistente',
              'nav.ajustes': 'Ajustes',
            };

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'relative flex flex-col items-center justify-center py-1.5 px-2 flex-1 max-w-[72px]',
                  'transition-all duration-200 active:scale-95',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
                )}

                {/* Icon */}
                <Icon className={cn(
                  'h-5 w-5 mb-0.5',
                  isActive && 'text-primary'
                )} />

                {/* Label */}
                <span className={cn(
                  'text-[9px] leading-tight text-center',
                  isActive ? 'font-semibold text-primary' : 'font-medium'
                )}>
                  {shortLabels[item.key] || t(item.key).split(' ')[0]}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
