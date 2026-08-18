import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, type QueryDocumentDto, type CreateDocumentDto, type UpdateDocumentDto, type DecreeDocumentDto, type AssignDocumentDto, type CreateDocumentFromTemplateDto } from '@/lib/api';
import { toast } from 'sonner';

// Query keys
export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (filters: QueryDocumentDto) => [...documentKeys.lists(), filters] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
  inbox: (filters?: QueryDocumentDto) => [...documentKeys.all, 'inbox', filters] as const,
  outbox: (filters?: QueryDocumentDto) => [...documentKeys.all, 'outbox', filters] as const,
  myDocuments: (filters?: QueryDocumentDto) => [...documentKeys.all, 'my', filters] as const,
  stats: () => [...documentKeys.all, 'stats'] as const,
};

// Fetch documents with filters
export const useDocuments = (params?: QueryDocumentDto) => {
  return useQuery({
    queryKey: documentKeys.list(params || {}),
    queryFn: () => documentsApi.findAll(params),
  });
};

// Fetch single document
export const useDocument = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => documentsApi.findOne(id),
    enabled: enabled && !!id,
  });
};

// Fetch inbox documents
export const useInboxDocuments = (params?: QueryDocumentDto) => {
  return useQuery({
    queryKey: documentKeys.inbox(params),
    queryFn: () => documentsApi.getInbox(params),
  });
};

// Fetch outbox documents
export const useOutboxDocuments = (params?: QueryDocumentDto) => {
  return useQuery({
    queryKey: documentKeys.outbox(params),
    queryFn: () => documentsApi.getOutbox(params),
  });
};

// Fetch my documents
export const useMyDocuments = (params?: QueryDocumentDto) => {
  return useQuery({
    queryKey: documentKeys.myDocuments(params),
    queryFn: () => documentsApi.getMyDocuments(params),
  });
};

// Full-text search documents
export const useSearchDocuments = (query: string, params?: Omit<QueryDocumentDto, 'search'>, enabled: boolean = true) => {
  return useQuery({
    queryKey: [...documentKeys.all, 'search', query, params] as const,
    queryFn: () => documentsApi.search(query, params),
    enabled: enabled && query.length > 0,
  });
};

// Fetch dashboard stats
export const useDashboardStats = () => {
  return useQuery({
    queryKey: documentKeys.stats(),
    queryFn: () => documentsApi.getStats(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

// Create document mutation
export const useCreateDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDocumentDto) => documentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
      toast.success('Documento creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear documento');
    },
  });
};

// Update document mutation
export const useUpdateDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDocumentDto }) =>
      documentsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
      toast.success('Documento actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar documento');
    },
  });
};

// Decree document mutation
export const useDecreeDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DecreeDocumentDto }) =>
      documentsApi.decree(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      toast.success('Documento decretado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al decretar documento');
    },
  });
};

// Assign document mutation
export const useAssignDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignDocumentDto }) =>
      documentsApi.assign(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      toast.success('Documento asignado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al asignar documento');
    },
  });
};

// Archive document mutation
export const useArchiveDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentKeys.stats() });
      toast.success('Documento archivado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al archivar documento');
    },
  });
};

// Permanent delete document mutation
export const useDeleteDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => documentsApi.permanentDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentKeys.stats() });
      toast.success('Documento eliminado permanentemente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar documento');
    },
  });
};

// Create document from template
export const useCreateDocumentFromTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDocumentFromTemplateDto) => documentsApi.createFromTemplate(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentKeys.inbox() });
      queryClient.invalidateQueries({ queryKey: documentKeys.outbox() });
      queryClient.invalidateQueries({ queryKey: documentKeys.stats() });
      toast.success('Documento creado desde plantilla', {
        description: `Documento ${data.documentNumber} generado exitosamente`,
      });
    },
    onError: (error: any) => {
      toast.error('Error al crear documento', {
        description: error.response?.data?.message || 'No se pudo generar el documento desde la plantilla',
      });
    },
  });
};
