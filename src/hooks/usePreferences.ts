import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { preferencesApi, UpdatePreferencesDto } from '@/lib/api/preferences.api';
import { toast } from 'sonner';

// Query keys
export const preferencesKeys = {
  all: ['preferences'] as const,
  detail: () => [...preferencesKeys.all, 'detail'] as const,
};

// Get preferences
export const usePreferences = () => {
  return useQuery({
    queryKey: preferencesKeys.detail(),
    queryFn: () => preferencesApi.getPreferences(),
  });
};

// Update preferences
export const useUpdatePreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdatePreferencesDto) => preferencesApi.updatePreferences(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preferencesKeys.all });
      toast.success('Preferencias actualizadas', {
        description: 'Los cambios han sido guardados correctamente',
      });
    },
    onError: (error: any) => {
      toast.error('Error al actualizar preferencias', {
        description: error.message || 'No se pudieron guardar los cambios',
      });
    },
  });
};

// Reset preferences
export const useResetPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => preferencesApi.resetPreferences(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preferencesKeys.all });
      toast.success('Preferencias restablecidas', {
        description: 'Se han restaurado los valores predeterminados',
      });
    },
    onError: (error: any) => {
      toast.error('Error al restablecer preferencias', {
        description: error.message || 'No se pudieron restablecer las preferencias',
      });
    },
  });
};
