import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { departmentsApi, Department, DepartmentUser } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import {
  ChevronRight,
  ChevronDown,
  Building2,
  Users,
  Search,
  User,
  Mail,
  Phone,
  Briefcase,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Tree Node Component
interface TreeNodeProps {
  department: Department;
  level: number;
  onSelect: (id: string) => void;
  selectedId: string | null;
  searchQuery: string;
}

function TreeNode({ department, level, onSelect, selectedId, searchQuery }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const hasChildren = department.children && department.children.length > 0;
  const isSelected = selectedId === department.id;

  // Check if this node or any children match the search
  const matchesSearch = searchQuery === '' ||
    department.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    department.shortName?.toLowerCase().includes(searchQuery.toLowerCase());

  // Auto-expand if search matches
  const shouldShow = searchQuery === '' || matchesSearch;

  if (!shouldShow) return null;

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer hover:bg-accent transition-colors",
          isSelected && "bg-accent border-l-4 border-primary"
        )}
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
        onClick={() => onSelect(department.id)}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="hover:bg-muted rounded p-0.5"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-5" />}

        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium truncate",
              isSelected && "text-primary"
            )}>
              {department.name}
            </span>
            {department.shortName && (
              <Badge variant="outline" className="text-xs">
                {department.shortName}
              </Badge>
            )}
          </div>
        </div>

        {department._count && (
          <Badge variant="secondary" className="ml-auto flex-shrink-0">
            <Users className="h-3 w-3 mr-1" />
            {department._count.users}
          </Badge>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-1">
          {department.children?.map((child) => (
            <TreeNode
              key={child.id}
              department={child}
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Department Details Panel Component
interface DepartmentDetailsPanelProps {
  departmentId: string;
}

function DepartmentDetailsPanel({ departmentId }: DepartmentDetailsPanelProps) {
  const { data: department, isLoading: isDeptLoading } = useQuery({
    queryKey: ['department', departmentId],
    queryFn: () => departmentsApi.findOne(departmentId),
  });

  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ['department-users', departmentId],
    queryFn: () => departmentsApi.getUsersByDepartment(departmentId),
  });

  if (isDeptLoading || isUsersLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!department || !usersData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            No se pudo cargar la información del departamento
          </p>
        </CardContent>
      </Card>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      ADMIN: 'bg-red-500/10 text-red-500 border-red-200',
      GABINETE: 'bg-purple-500/10 text-purple-500 border-purple-200',
      REVISOR: 'bg-blue-500/10 text-blue-500 border-blue-200',
      LECTOR: 'bg-gray-500/10 text-gray-500 border-gray-200',
    };
    return colors[role as keyof typeof colors] || colors.LECTOR;
  };

  return (
    <div className="space-y-6">
      {/* Department Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {department.name}
              </CardTitle>
              <CardDescription className="mt-2">
                {department.shortName && (
                  <Badge variant="outline" className="mr-2">
                    {department.shortName}
                  </Badge>
                )}
                Nivel {department.level} {department.parent && `• Pertenece a: ${department.parent.name}`}
              </CardDescription>
            </div>
            <Badge variant="secondary">
              <Users className="h-3 w-3 mr-1" />
              {usersData.totalUsers} usuarios
            </Badge>
          </div>
        </CardHeader>
        {department.description && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{department.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Subdepartments Card */}
      {department.children && department.children.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subdepartamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {department.children.map((child: Department) => (
                <div
                  key={child.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{child.name}</span>
                    {child.shortName && (
                      <Badge variant="outline" className="text-xs">
                        {child.shortName}
                      </Badge>
                    )}
                  </div>
                  {child._count && (
                    <Badge variant="secondary">
                      {child._count.users} usuarios
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Usuarios ({usersData.totalUsers})
          </CardTitle>
          <CardDescription>
            Personal asignado a este departamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersData.users.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No hay usuarios asignados a este departamento
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {usersData.users.map((user: DepartmentUser) => (
                  <div
                    key={user.id}
                    className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          <Shield className="h-3 w-3 mr-1" />
                          {user.role}
                        </Badge>
                      </div>
                      {user.position && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                          <Briefcase className="h-3 w-3" />
                          {user.position}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </span>
                        {user.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Main Departments Page
export default function DepartmentsPage() {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch department hierarchy
  const { data: hierarchy = [], isLoading } = useQuery({
    queryKey: ['departments-hierarchy'],
    queryFn: departmentsApi.getHierarchy,
  });

  // Calculate stats
  const calculateStats = (depts: Department[]): { total: number; users: number } => {
    let total = 0;
    let users = 0;

    const traverse = (dept: Department) => {
      if (dept.isActive) {
        total++;
        users += dept._count?.users || 0;
      }
      if (dept.children) {
        dept.children.forEach(traverse);
      }
    };

    depts.forEach(traverse);
    return { total, users };
  };

  const stats = calculateStats(hierarchy);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Estructura Organizacional</h1>
        <p className="text-muted-foreground">
          Visualiza la jerarquía de departamentos y su personal asignado
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Departamentos
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Departamentos activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Personal
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users}</div>
            <p className="text-xs text-muted-foreground">
              Usuarios asignados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Niveles Jerárquicos
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hierarchy.length}</div>
            <p className="text-xs text-muted-foreground">
              Departamentos raíz (nivel 1)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Tree View Panel */}
        <div className="md:col-span-5">
          <Card className="h-[calc(100vh-20rem)]">
            <CardHeader>
              <CardTitle className="text-lg">Árbol de Departamentos</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar departamento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-28rem)]">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : hierarchy.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No hay departamentos registrados
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {hierarchy.map((dept) => (
                      <TreeNode
                        key={dept.id}
                        department={dept}
                        level={0}
                        onSelect={setSelectedDepartmentId}
                        selectedId={selectedDepartmentId}
                        searchQuery={searchQuery}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Details Panel */}
        <div className="md:col-span-7">
          {selectedDepartmentId ? (
            <DepartmentDetailsPanel departmentId={selectedDepartmentId} />
          ) : (
            <Card className="h-[calc(100vh-20rem)]">
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">
                    Selecciona un departamento
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Haz clic en cualquier departamento del árbol para ver sus detalles
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}
