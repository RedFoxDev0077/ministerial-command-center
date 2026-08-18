import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { DataTableSkeleton } from '@/components/ui/data-table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  FolderOpen,
  Filter,
  Star,
  PenTool,
  AlertTriangle,
} from 'lucide-react';
import { getExpedientes, ExpStatus } from '@/lib/api/expedientes.api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

// Utility function to strip HTML tags
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const savedViews = [
  { id: 'open', label: 'Abiertos', icon: FolderOpen, filter: { status: ExpStatus.OPEN } },
  { id: 'in_progress', label: 'En progreso', icon: AlertTriangle, filter: { status: ExpStatus.IN_PROGRESS } },
];

export default function CasesPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeView, setActiveView] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;

  const debouncedSearch = useDebounce(search, 300);

  // Fetch expedientes with React Query
  const { data, isLoading } = useQuery({
    queryKey: ['expedientes', { page, search: debouncedSearch, status: statusFilter }],
    queryFn: () => getExpedientes({
      page,
      limit,
      search: debouncedSearch || undefined,
      status: statusFilter !== 'all' ? (statusFilter as ExpStatus) : undefined,
    }),
  });

  const expedientes = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;

  const applyView = useCallback((viewId: string) => {
    const view = savedViews.find(v => v.id === viewId);
    if (!view) {
      setActiveView(null);
      setStatusFilter('all');
      setPage(1);
      return;
    }
    setActiveView(viewId);
    if (view.filter.status) setStatusFilter(view.filter.status);
    setPage(1);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const handleNavigateToCase = useCallback((id: string) => {
    navigate(`/cases/${id}`);
  }, [navigate]);

  const handlePreviousPage = useCallback(() => {
    setPage(p => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPage(p => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const statusLabels: Record<string, string> = {
    [ExpStatus.OPEN]: 'Abierto',
    [ExpStatus.IN_PROGRESS]: 'En Progreso',
    [ExpStatus.CLOSED]: 'Cerrado',
    [ExpStatus.ARCHIVED]: 'Archivado',
  };

  const statusVariants: Record<string, 'success' | 'warning' | 'info' | 'muted'> = {
    [ExpStatus.OPEN]: 'info',
    [ExpStatus.IN_PROGRESS]: 'warning',
    [ExpStatus.CLOSED]: 'success',
    [ExpStatus.ARCHIVED]: 'muted',
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in safe-area-inset">
      <PageHeader
        title={t('cases.title')}
        description={t('cases.description')}
        action={
          <Button onClick={() => navigate('/cases/new')} size="sm" className="h-9 sm:h-10">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('cases.create_new')}</span>
          </Button>
        }
      />

      {/* Saved Views - Horizontal scroll on mobile */}
      <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        <span className="text-xs sm:text-sm text-muted-foreground self-center mr-1 sm:mr-2 shrink-0 hidden sm:inline">{t('cases.saved_views')}:</span>
        {savedViews.map(view => (
          <Button
            key={view.id}
            variant={activeView === view.id ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => applyView(activeView === view.id ? '' : view.id)}
            className="shrink-0 h-8 sm:h-9 text-xs sm:text-sm"
          >
            <view.icon className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">{view.label}</span>
          </Button>
        ))}
      </div>

      {/* Filters - Grid on mobile */}
      <div className="flex flex-col gap-3 mb-4 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar expedientes..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-10 text-xs sm:text-sm sm:w-40">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value={ExpStatus.OPEN}>Abierto</SelectItem>
              <SelectItem value={ExpStatus.IN_PROGRESS}>En Progreso</SelectItem>
              <SelectItem value={ExpStatus.CLOSED}>Cerrado</SelectItem>
              <SelectItem value={ExpStatus.ARCHIVED}>Archivado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <DataTableSkeleton columns={5} rows={5} />
      ) : expedientes.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={t('empty.no_cases')}
          description={t('empty.no_cases_desc')}
          action={{
            label: t('cases.create_new'),
            onClick: () => navigate('/cases/new'),
          }}
        />
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {expedientes.map((exp) => (
              <div
                key={exp.id}
                className="relative bg-card rounded-xl border overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => handleNavigateToCase(exp.id)}
              >
                <div className="p-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{exp.title}</p>
                      <p className="text-xs text-muted-foreground font-mono">{exp.code}</p>
                    </div>
                    <StatusBadge variant={statusVariants[exp.status]} className="text-[10px] shrink-0">
                      {statusLabels[exp.status]}
                    </StatusBadge>
                  </div>

                  {/* Description */}
                  {exp.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {stripHtmlTags(exp.description)}
                    </p>
                  )}

                  {/* Footer row */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate">
                      {exp._count?.documents || 0} doc{exp._count?.documents !== 1 ? 's' : ''}
                    </span>
                    <span>{format(new Date(exp.updatedAt), 'dd MMM', { locale: es })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expediente</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Documentos</TableHead>
                  <TableHead>Plazos</TableHead>
                  <TableHead>Actualizado</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expedientes.map((exp) => (
                  <TableRow
                    key={exp.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleNavigateToCase(exp.id)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{exp.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">{exp.code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground line-clamp-1">
                        {exp.description ? stripHtmlTags(exp.description) : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{exp._count?.documents || 0}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{exp._count?.deadlines || 0}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(exp.updatedAt), 'dd MMM yyyy', { locale: es })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={statusVariants[exp.status]}>
                        {statusLabels[exp.status]}
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={page === totalPages}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
