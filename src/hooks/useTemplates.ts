import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templatesApi, TemplateType, CreateTemplateDto, UpdateTemplateDto } from '@/lib/api/templates.api';
import { toast } from 'sonner';

// Query keys
export const templateKeys = {
  all: ['templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (type?: TemplateType) => [...templateKeys.lists(), type] as const,
  detail: (id: string) => [...templateKeys.all, 'detail', id] as const,
};

// Get all templates
export const useTemplates = (type?: TemplateType) => {
  return useQuery({
    queryKey: templateKeys.list(type),
    queryFn: () => templatesApi.getTemplates(type),
  });
};

// Get single template
export const useTemplate = (id: string) => {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => templatesApi.getTemplate(id),
    enabled: !!id,
  });
};

// Create template
export const useCreateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateTemplateDto) => templatesApi.createTemplate(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      toast.success('Plantilla creada', {
        description: 'La plantilla ha sido creada correctamente',
      });
    },
    onError: (error: any) => {
      toast.error('Error al crear plantilla', {
        description: error.message || 'No se pudo crear la plantilla',
      });
    },
  });
};

// Update template
export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateTemplateDto }) =>
      templatesApi.updateTemplate(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
      toast.success('Plantilla actualizada', {
        description: 'Los cambios han sido guardados',
      });
    },
    onError: (error: any) => {
      toast.error('Error al actualizar plantilla', {
        description: error.message || 'No se pudo actualizar la plantilla',
      });
    },
  });
};

// Delete template
export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => templatesApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      toast.success('Plantilla eliminada', {
        description: 'La plantilla ha sido eliminada correctamente',
      });
    },
    onError: (error: any) => {
      toast.error('Error al eliminar plantilla', {
        description: error.message || 'No se pudo eliminar la plantilla',
      });
    },
  });
};

// Duplicate template
export const useDuplicateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => templatesApi.duplicateTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      toast.success('Plantilla duplicada', {
        description: 'Se ha creado una copia de la plantilla',
      });
    },
    onError: (error: any) => {
      toast.error('Error al duplicar plantilla', {
        description: error.message || 'No se pudo duplicar la plantilla',
      });
    },
  });
};
