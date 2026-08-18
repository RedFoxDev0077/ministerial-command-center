import { axiosInstance } from './axios';

export interface QueryNotificationDto {
  page?: number;
  limit?: number;
  type?: string;
  isRead?: boolean;
}

export const notificationsApi = {
  // Get all notifications
  findAll: async (params?: QueryNotificationDto) => {
    const response = await axiosInstance.get('/notifications', { params });
    return response.data;
  },

  // Get unread count
  getUnreadCount: async () => {
    const response = await axiosInstance.get('/notifications/unread-count');
    return response.data;
  },

  // Mark as read
  markAsRead: async (id: string) => {
    const response = await axiosInstance.patch(`/notifications/${id}/read`);
    return response.data;
  },

  // Mark all as read
  markAllAsRead: async () => {
    const response = await axiosInstance.patch('/notifications/read-all');
    return response.data;
  },

  // Delete notification
  remove: async (id: string) => {
    const response = await axiosInstance.delete(`/notifications/${id}`);
    return response.data;
  },

  // Delete all read notifications
  removeAllRead: async () => {
    const response = await axiosInstance.delete('/notifications/read/all');
    return response.data;
  },

  // Mute notification
  muteNotification: async (id: string) => {
    const response = await axiosInstance.patch(`/notifications/${id}/mute`);
    return response.data;
  },

  // Unmute notification
  unmuteNotification: async (id: string) => {
    const response = await axiosInstance.patch(`/notifications/${id}/unmute`);
    return response.data;
  },

  // Mute all notifications
  muteAllNotifications: async () => {
    const response = await axiosInstance.patch('/notifications/mute-all');
    return response.data;
  },
};
