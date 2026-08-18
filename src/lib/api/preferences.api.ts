import { axiosInstance } from './axios';

export interface UserPreferences {
  id: string;
  userId: string;
  language: string;
  timezone: string;
  reminder48hBefore: boolean;
  escalateOverdue: boolean;
  emailNotifications: boolean;
  dailySummary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePreferencesDto {
  language?: string;
  timezone?: string;
  reminder48hBefore?: boolean;
  escalateOverdue?: boolean;
  emailNotifications?: boolean;
  dailySummary?: boolean;
}

export const preferencesApi = {
  // Get current user preferences
  getPreferences: async (): Promise<UserPreferences> => {
    const response = await axiosInstance.get('/preferences');
    return response.data;
  },

  // Update preferences
  updatePreferences: async (dto: UpdatePreferencesDto): Promise<UserPreferences> => {
    const response = await axiosInstance.patch('/preferences', dto);
    return response.data;
  },

  // Reset to defaults
  resetPreferences: async (): Promise<UserPreferences> => {
    const response = await axiosInstance.post('/preferences/reset');
    return response.data;
  },
};
