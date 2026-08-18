import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  entitiesApi,
  Entity,
  EntityType,
  Classification,
  getEntityTypeLabel,
  getClassificationLabel
} from '@/lib/api/entities.api';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, MoreVertical, Edit, Trash2, Search, Building2, ExternalLink, Mail, Phone, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { CreateEntityDialog } from '@/components/entities/CreateEntityDialog';
import { EditEntityDialog } from '@/components/entities/EditEntityDialog';
import { TablePagination } from '@/components/ui/table-pagination';
import { ScrollToTop } from '@/components/ui/scroll-to-top';

export default function EntitiesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [classificationFilter, setClassificationFilter] = useState<string>('ALL');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch entities
  const { data: entities = [], isLoading } = useQuery({
    queryKey: ['entities'],
    queryFn: entitiesApi.getAll,
  });

  // Delete entity mutation
  const deleteMutation = useMutation({
    mutationFn: (entityId: string) => entitiesApi.remove(entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      toast.success('Entidad eliminada exitosamente');
      setDeleteDialogOpen(false);
      setSelectedEntity(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar entidad');
    },
  });

  // Filter entities
  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      const matchesSearch =
        entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entity.shortName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entity.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === 'ALL' || entity.type === typeFilter;
      const matchesClassification = classificationFilter === 'ALL' || entity.classification === classificationFilter;

      return matchesSearch && matchesType && matchesClassification && entity.isActive;
    });
  }, [entities, searchQuery, typeFilter, classificationFilter]);

  // Paginated entities
  const paginatedEntities = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredEntities.slice(startIndex, endIndex);
  }, [filteredEntities, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredEntities.length / pageSize);

  // Reset to first page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, classificationFilter]);

  // Calculate stats
  const stats = {
    total: entities.filter(e => e.isActive).length,
    internal: entities.filter(e => e.isActive && e.classification === Classification.INTERNAL).length,
    external: entities.filter(e => e.isActive && e.classification === Classification.EXTERNAL).length,
    ministries: entities.filter(e => e.isActive && e.type === EntityType.GOVERNMENT_MINISTRY).length,
  };

  const handleEdit = (entity: Entity) => {
    setSelectedEntity(entity);
    setEditDialogOpen(true);
  };

  const handleDelete = (entity: Entity) => {
    setSelectedEntity(entity);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedEntity) {
      deleteMutation.mutate(selectedEntity.id);
    }
  };

  // Get type badge color
  const getTypeBadgeColor = (type: EntityType) => {
    const colors: Record<EntityType, string> = {
      [EntityType.GOVERNMENT_MINISTRY]: 'bg-blue-500',
      [EntityType.PUBLIC_COMPANY]: 'bg-green-500',
      [EntityType.PRIVATE_COMPANY]: 'bg-purple-500',
      [EntityType.INTERNAL_DEPARTMENT]: 'bg-orange-500',
      [EntityType.INTERNATIONAL_ORG]: 'bg-cyan-500',
      [EntityType.CITIZEN]: 'bg-gray-500',
      [EntityType.OTHER]: 'bg-slate-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Entidades</h1>
          <p className="text-muted-foreground">
            Gestión de entidades internas y externas
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Entidad
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entidades</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ministerios</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ministries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Internas</CardTitle>
            <Building2 className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.internal}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Externas</CardTitle>
            <Building2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.external}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Buscar y filtrar entidades</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, siglas o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los tipos</SelectItem>
                <SelectItem value={EntityType.GOVERNMENT_MINISTRY}>Ministerios</SelectItem>
                <SelectItem value={EntityType.PUBLIC_COMPANY}>Empresas Públicas</SelectItem>
                <SelectItem value={EntityType.PRIVATE_COMPANY}>Empresas Privadas</SelectItem>
                <SelectItem value={EntityType.INTERNAL_DEPARTMENT}>Departamentos Internos</SelectItem>
                <SelectItem value={EntityType.INTERNATIONAL_ORG}>Organizaciones Internacionales</SelectItem>
                <SelectItem value={EntityType.CITIZEN}>Ciudadanos</SelectItem>
                <SelectItem value={EntityType.OTHER}>Otros</SelectItem>
              </SelectContent>
            </Select>

            {/* Classification Filter */}
            <Select value={classificationFilter} onValueChange={setClassificationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las clasificaciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las clasificaciones</SelectItem>
                <SelectItem value={Classification.INTERNAL}>Internas</SelectItem>
                <SelectItem value={Classification.EXTERNAL}>Externas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Entities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Entidades ({filteredEntities.length})</CardTitle>
          <CardDescription>
            Lista de todas las entidades activas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden md:block border rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="text-center py-10">Cargando entidades...</div>
            ) : filteredEntities.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                No se encontraron entidades
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Siglas</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Clasificación</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEntities.map((entity) => (
                      <TableRow key={entity.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">
                          <div>
                            <div className="flex items-center gap-2">
                              {entity.name}
                              {entity.website && (
                                <a
                                  href={entity.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            {entity.description && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {entity.description.substring(0, 60)}
                                {entity.description.length > 60 && '...'}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {entity.shortName && (
                            <Badge variant="outline">{entity.shortName}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeBadgeColor(entity.type)}>
                            {getEntityTypeLabel(entity.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={entity.classification === Classification.INTERNAL ? 'default' : 'secondary'}>
                            {getClassificationLabel(entity.classification)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {entity.email && (
                              <div className="text-muted-foreground">{entity.email}</div>
                            )}
                            {entity.phone && (
                              <div className="text-muted-foreground text-xs">{entity.phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEdit(entity)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(entity)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              <div className="text-center py-10">Cargando entidades...</div>
            ) : filteredEntities.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                No se encontraron entidades
              </div>
            ) : (
              paginatedEntities.map((entity) => (
                <Card key={entity.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{entity.name}</p>
                              {entity.website && (
                                <a
                                  href={entity.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-700 flex-shrink-0"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            {entity.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {entity.description}
                              </p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEdit(entity)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(entity)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Badges and Info */}
                        <div className="flex flex-wrap gap-2 mb-2">
                          {entity.shortName && (
                            <Badge variant="outline" className="text-xs">{entity.shortName}</Badge>
                          )}
                          <Badge className={`${getTypeBadgeColor(entity.type)} text-xs`}>
                            {getEntityTypeLabel(entity.type)}
                          </Badge>
                          <Badge variant={entity.classification === Classification.INTERNAL ? 'default' : 'secondary'} className="text-xs">
                            {getClassificationLabel(entity.classification)}
                          </Badge>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-1">
                          {entity.email && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{entity.email}</span>
                            </div>
                          )}
                          {entity.phone && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {entity.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {filteredEntities.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredEntities.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateEntityDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Edit Dialog */}
      {selectedEntity && (
        <EditEntityDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          entity={selectedEntity}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar entidad?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar la entidad "{selectedEntity?.name}"?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}
