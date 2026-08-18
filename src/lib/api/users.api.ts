import axios from './axios';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  position?: string;
  phone?: string;
  whatsapp?: string;
  role: 'ADMIN' | 'GABINETE' | 'REVISOR' | 'LECTOR';
  departmentId: string;
  department?: {
    id: string;
    name: string;
    shortName?: string;
  };
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  position?: string;
  phone?: string;
  whatsapp?: string;
  role: 'ADMIN' | 'GABINETE' | 'REVISOR' | 'LECTOR';
  departmentId: string;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  phone?: string;
  whatsapp?: string;
  role?: 'ADMIN' | 'GABINETE' | 'REVISOR' | 'LECTOR';
  departmentId?: string;
}

export const usersApi = {
  // Get all users
  getAll: async (): Promise<User[]> => {
    const response = await axios.get('/users');
    return response.data;
  },

  // Get user by ID
  getById: async (id: string): Promise<User> => {
    const response = await axios.get(`/users/${id}`);
    return response.data;
  },

  // Create new user
  create: async (data: CreateUserDto): Promise<User> => {
    const response = await axios.post('/users', data);
    return response.data;
  },

  // Update user
  update: async (id: string, data: UpdateUserDto): Promise<User> => {
    const response = await axios.patch(`/users/${id}`, data);
    return response.data;
  },

  // Deactivate user (soft delete)
  deactivate: async (id: string): Promise<{ message: string }> => {
    const response = await axios.delete(`/users/${id}`);
    return response.data;
  },

  // Reactivate user
  activate: async (id: string): Promise<{ message: string }> => {
    const response = await axios.post(`/users/${id}/activate`);
    return response.data;
  },
};
