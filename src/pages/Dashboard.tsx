import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Inbox,
  Send,
  FolderOpen,
  Clock,
  PenTool,
  Plus,
  Upload,
  Bot,
  ArrowRight,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { getDeadlines } from '@/lib/api/deadlines.api';
import type { Deadline } from '@/lib/api/deadlines.api';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats, useInboxDocuments } from '@/hooks/useDocuments';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import { WorkflowStatisticsCard } from '@/components/workflow/WorkflowStatisticsCard';

function getEntityColor(name?: string): string {
  if (!name) return '#6366f1';
  const palette = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export default function Dashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch dashboard stats with real API
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  // Fetch recent inbox documents with real API
  const { data: inboxData, isLoading: docsLoading } = useInboxDocuments({
    page: 1,
    limit: 5,
    sort: 'createdAt:desc',
  });

  // Fetch urgent deadlines with real API
  const { data: deadlinesData, isLoading: deadlinesLoading } = useQuery({
    queryKey: ['deadlines', 'urgent'],
    queryFn: () => getDeadlines(),
  });

  const urgentDeadlines: Deadline[] = (deadlinesData || [])
    .filter((d: Deadline) => d.status === 'OVERDUE' || d.priority === 'HIGH' || d.priority === 'URGENT')
    .slice(0, 4);

  const loading = statsLoading || docsLoading;
  const recentDocs = inboxData?.data || [];

  const quickActions = [
    { label: t('dashboard.register_entry'), icon: Inbox, path: '/inbox/new', primary: true },
    { label: t('dashboard.register_exit'), icon: Send, path: '/outbox/new' },
    { label: t('dashboard.create_case'), icon: FolderOpen, path: '/cases/new' },
    { label: t('dashboard.upload_scan'), icon: Upload, path: '/multimedia' },
    { label: t('dashboard.ask_ai'), icon: Bot, path: '/assistant' },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in safe-area-inset">
      <PageHeader
        title={`${t('dashboard.welcome')}, ${user?.firstName || 'Usuario'}`}
        description={format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
      />

      {/* KPI Cards - Responsive grid with stagger animation */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-6 sm:mb-8 stagger-children">
        <KpiCard
          title={t('dashboard.entries_today')}
          value={stats?.entriesToday ?? 0}
          icon={Inbox}
          loading={loading}
          className="hover-lift"
        />
        <KpiCard
          title={t('dashboard.exits_today')}
          value={stats?.exitsToday ?? 0}
          icon={Send}
          loading={loading}
          className="hover-lift"
        />
        <KpiCard
          title={t('dashboard.open_cases')}
          value={stats?.openCases ?? 0}
          icon={FolderOpen}
          loading={loading}
          className="hover-lift"
        />
        <KpiCard
          title={t('dashboard.upcoming_deadlines')}
          value={stats?.upcomingDeadlines ?? 0}
          icon={Clock}
          loading={loading}
          className="hover-lift"
        />
        <KpiCard
          title={t('dashboard.pending_signatures')}
          value={stats?.pendingSignatures ?? 0}
          icon={PenTool}
          loading={loading}
          className="hover-lift col-span-2 sm:col-span-1"
        />
      </div>

      {/* Quick Actions - Mobile optimized with horizontal scroll */}
      <Card className="mb-6 sm:mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <CardHeader className="pb-3 px-4 sm:px-6">
          <CardTitle className="text-sm sm:text-base font-semibold">{t('dashboard.quick_actions')}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {/* Mobile: Horizontal scroll, Desktop: Flex wrap */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            {quickActions.map((action, index) => (
              <Button
                key={action.path}
                variant={action.primary ? 'default' : 'outline'}
                onClick={() => navigate(action.path)}
                className="gap-2 shrink-0 btn-animate text-xs sm:text-sm h-9 sm:h-10"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <action.icon className="h-4 w-4" />
                <span className="whitespace-nowrap">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Two column layout - Stack on mobile */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-3 px-4 sm:px-6">
            <CardTitle className="text-sm sm:text-base font-semibold">{t('dashboard.recent_activity')}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/inbox')} className="h-8 text-xs sm:text-sm">
              <span className="hidden sm:inline">Ver todo</span>
              <span className="sm:hidden">Ver</span>
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="h-8 w-8 rounded bg-muted skeleton-shimmer" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 rounded bg-muted skeleton-shimmer" />
                      <div className="h-3 w-1/2 rounded bg-muted skeleton-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4 stagger-children">
                {recentDocs.map((doc: any) => {
                  const entity = doc.entity; // Backend returns entity directly
                  return (
                    <div
                      key={doc.id}
                      className="flex items-start gap-3 p-2 sm:p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-all duration-200 hover:translate-x-1 active:scale-[0.98]"
                      onClick={() => navigate('/inbox')}
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] sm:text-xs font-semibold text-primary-foreground"
                        style={{ backgroundColor: getEntityColor(entity?.name) }}
                      >
                        {entity?.shortName || entity?.name?.substring(0, 2)?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {doc.correlativeNumber} · {format(new Date(doc.createdAt), 'dd MMM', { locale: es })}
                        </p>
                      </div>
                      <StatusBadge
                        variant={
                          doc.status === 'PENDING' ? 'warning' :
                          doc.status === 'IN_PROGRESS' ? 'info' :
                          doc.status === 'COMPLETED' ? 'success' : 'muted'
                        }
                        className="text-[10px] sm:text-xs shrink-0"
                      >
                        <span className="hidden sm:inline">
                          {doc.status === 'PENDING' ? 'Pendiente' :
                           doc.status === 'IN_PROGRESS' ? 'En proceso' :
                           doc.status === 'COMPLETED' ? 'Completado' :
                           doc.status === 'DRAFT' ? 'Borrador' : 'Archivado'}
                        </span>
                        <span className="sm:hidden">
                          {doc.status === 'PENDING' ? 'Pend.' :
                           doc.status === 'IN_PROGRESS' ? 'Proc.' :
                           doc.status === 'COMPLETED' ? 'Comp.' :
                           doc.status === 'DRAFT' ? 'Borr.' : 'Arch.'}
                        </span>
                      </StatusBadge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Urgent Alerts */}
        <Card className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-3 px-4 sm:px-6">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning animate-pulse" />
              {t('dashboard.urgent_alerts')}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/deadlines')} className="h-8 text-xs sm:text-sm">
              <span className="hidden sm:inline">Ver todo</span>
              <span className="sm:hidden">Ver</span>
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {deadlinesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="h-8 w-8 rounded bg-muted skeleton-shimmer" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 rounded bg-muted skeleton-shimmer" />
                      <div className="h-3 w-1/2 rounded bg-muted skeleton-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            ) : urgentDeadlines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground animate-fade-in">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50 animate-float" />
                <p className="text-sm">No hay alertas urgentes</p>
              </div>
            ) : (
              <div className="space-y-3 stagger-children">
                {urgentDeadlines.map((deadline) => (
                  <div
                    key={deadline.id}
                    className="flex items-start gap-3 p-2 sm:p-3 rounded-lg border border-border/50 hover:border-border cursor-pointer transition-all duration-200 hover:translate-x-1 hover:shadow-sm active:scale-[0.98]"
                    onClick={() => navigate('/deadlines')}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform ${
                      deadline.status === 'OVERDUE' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                    }`}>
                      <Clock className={`h-4 w-4 ${deadline.status === 'OVERDUE' ? 'animate-pulse' : ''}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">{deadline.title}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                        {deadline.document?.title || deadline.description || ''}{deadline.document?.title || deadline.description ? ' · ' : ''}Vence {format(new Date(deadline.dueDate), 'dd MMM', { locale: es })}
                      </p>
                    </div>
                    <StatusBadge
                      variant={deadline.status === 'OVERDUE' ? 'destructive' : 'warning'}
                      className="text-[10px] sm:text-xs shrink-0"
                    >
                      {deadline.status === 'OVERDUE' ? 'Vencido' : 'Urgente'}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Workflow Statistics */}
      <WorkflowStatisticsCard className="mt-6 sm:mt-8 animate-fade-in-up" style={{ animationDelay: '0.5s' } as any} />

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}
