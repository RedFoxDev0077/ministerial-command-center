import { axiosInstance } from './axios';

// TypeScript Interfaces
export interface Department {
  id: string;
  name: string;
  shortName?: string;
  level: number;
  parentId?: string;
  order: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: Department;
  children?: DepartmentNode[];
  _count?: {
    users: number;
  };
}

export interface DepartmentNode {
  id: string;
  name: string;
  shortName?: string;
  level: number;
  description?: string;
  userCount: number;
  children: DepartmentNode[];
}

export interface DepartmentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  position?: string;
  role: string;
  phone?: string;
  whatsapp?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface DepartmentUsersResponse {
  department: {
    id: string;
    name: string;
    shortName?: string;
    level: number;
  };
  users: DepartmentUser[];
  totalUsers: number;
}

export interface CreateDepartmentDto {
  name: string;
  shortName?: string;
  level: number;
  parentId?: string;
  order?: number;
  description?: string;
}

export interface UpdateDepartmentDto {
  name?: string;
  shortName?: string;
  level?: number;
  parentId?: string;
  order?: number;
  description?: string;
  isActive?: boolean;
}

export const departmentsApi = {
  // Get all departments (flat list)
  findAll: async (): Promise<Department[]> => {
    const response = await axiosInstance.get('/departments');
    return response.data;
  },

  // Get department by ID
  findOne: async (id: string): Promise<Department> => {
    const response = await axiosInstance.get(`/departments/${id}`);
    return response.data;
  },

  // Get department hierarchy (tree structure)
  getHierarchy: async (): Promise<Department[]> => {
    const response = await axiosInstance.get('/departments/hierarchy');
    return response.data;
  },

  // Get users by department ID
  getUsersByDepartment: async (id: string): Promise<DepartmentUsersResponse> => {
    const response = await axiosInstance.get(`/departments/${id}/users`);
    return response.data;
  },

  // Get department tree (subtree starting from specific department)
  getDepartmentTree: async (id: string): Promise<DepartmentNode> => {
    const response = await axiosInstance.get(`/departments/${id}/tree`);
    return response.data;
  },

  // Create department
  create: async (data: CreateDepartmentDto): Promise<Department> => {
    const response = await axiosInstance.post('/departments', data);
    return response.data;
  },

  // Update department
  update: async (id: string, data: UpdateDepartmentDto): Promise<Department> => {
    const response = await axiosInstance.patch(`/departments/${id}`, data);
    return response.data;
  },

  // Delete department (soft delete)
  remove: async (id: string): Promise<void> => {
    const response = await axiosInstance.delete(`/departments/${id}`);
    return response.data;
  },
};
