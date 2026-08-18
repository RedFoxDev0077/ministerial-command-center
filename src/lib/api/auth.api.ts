import { axiosInstance } from './axios';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  departmentId: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export const authApi = {
  // Login
  login: async (data: LoginDto) => {
    const response = await axiosInstance.post('/auth/login', data);
    return response.data;
  },

  // Register
  register: async (data: RegisterDto) => {
    const response = await axiosInstance.post('/auth/register', data);
    return response.data;
  },

  // Get current user profile
  getProfile: async () => {
    const response = await axiosInstance.get('/auth/profile');
    return response.data;
  },

  // Change password
  changePassword: async (data: ChangePasswordDto) => {
    const response = await axiosInstance.patch('/auth/change-password', data);
    return response.data;
  },

  // Refresh token
  refresh: async (refreshToken: string) => {
    const response = await axiosInstance.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
};
