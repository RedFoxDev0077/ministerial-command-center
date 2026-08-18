import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, type QueryNotificationDto } from '@/lib/api';
import { toast } from 'sonner';

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: QueryNotificationDto) => [...notificationKeys.lists(), filters] as const,
  unreadCount: () => [...notificationKeys.all, 'unreadCount'] as const,
};

// Fetch notifications
export const useNotifications = (params?: QueryNotificationDto) => {
  return useQuery({
    queryKey: notificationKeys.list(params || {}),
    queryFn: () => notificationsApi.findAll(params),
  });
};

// Fetch unread count
export const useUnreadNotificationsCount = () => {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

// Mark as read mutation
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
};

// Mark all as read mutation
export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      toast.success('Todas las notificaciones marcadas como leídas');
    },
  });
};

// Delete notification mutation
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      toast.success('Notificación eliminada');
    },
  });
};

// Delete all read notifications mutation
export const useDeleteAllReadNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.removeAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      toast.success('Notificaciones leídas eliminadas');
    },
  });
};

// Mute notification mutation
export const useMuteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.muteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      toast.success('Notificación silenciada');
    },
    onError: (error: any) => {
      toast.error('Error al silenciar notificación', {
        description: error.message || 'No se pudo silenciar la notificación',
      });
    },
  });
};

// Unmute notification mutation
export const useUnmuteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.unmuteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      toast.success('Notificación reactivada');
    },
    onError: (error: any) => {
      toast.error('Error al reactivar notificación', {
        description: error.message || 'No se pudo reactivar la notificación',
      });
    },
  });
};

// Mute all notifications mutation
export const useMuteAllNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.muteAllNotifications(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      toast.success('Todas las notificaciones silenciadas');
    },
    onError: (error: any) => {
      toast.error('Error al silenciar notificaciones', {
        description: error.message || 'No se pudieron silenciar las notificaciones',
      });
    },
  });
};
