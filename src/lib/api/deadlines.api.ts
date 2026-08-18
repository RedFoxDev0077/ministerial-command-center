import { axiosInstance } from './axios';

export type DeadlineType = 'BUSINESS_HOURS' | 'CALENDAR_DAYS';

export interface CalculateDeadlineDto {
  deadlineType: DeadlineType;
  quantity: number;
}

export interface CalculatedDeadline {
  deadlineType: DeadlineType;
  quantity: number;
  startDate: string;
  dueDate: string;
  calculatedAt: string;
}

export interface CreateDeadlineDto {
  title: string;
  description?: string;
  dueDate: string; // ISO 8601 format
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  documentId?: string;
  expedienteId?: string;
}

export interface UpdateDeadlineDto {
  title?: string;
  description?: string;
  dueDate?: string; // ISO 8601 format
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  documentId?: string;
  expedienteId?: string;
}

export interface QueryDeadlineDto {
  documentId?: string;
  expedienteId?: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDateFrom?: string; // ISO 8601 format
  dueDateTo?: string; // ISO 8601 format
}

export interface Deadline {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  documentId?: string;
  expedienteId?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  document?: {
    id: string;
    title: string;
    correlativeNumber: string;
  };
  expediente?: {
    id: string;
    code: string;
    title: string;
  };
}

/**
 * Create a new deadline
 */
export async function createDeadline(data: CreateDeadlineDto): Promise<Deadline> {
  const response = await axiosInstance.post('/deadlines', data);
  return response.data;
}

/**
 * Get all deadlines with optional filters
 */
export async function getDeadlines(params?: QueryDeadlineDto): Promise<Deadline[]> {
  // Filter out React Query context parameters if passed
  const cleanParams = params && typeof params === 'object' && !('queryKey' in params) ? params : undefined;
  const response = await axiosInstance.get('/deadlines', { params: cleanParams });
  return response.data;
}

/**
 * Get a single deadline by ID
 */
export async function getDeadlineById(id: string): Promise<Deadline> {
  const response = await axiosInstance.get(`/deadlines/${id}`);
  return response.data;
}

/**
 * Update a deadline
 */
export async function updateDeadline(id: string, data: UpdateDeadlineDto): Promise<Deadline> {
  const response = await axiosInstance.patch(`/deadlines/${id}`, data);
  return response.data;
}

/**
 * Delete a deadline
 */
export async function deleteDeadline(id: string): Promise<{ message: string }> {
  const response = await axiosInstance.delete(`/deadlines/${id}`);
  return response.data;
}

/**
 * Mark a deadline as completed
 */
export async function completeDeadline(id: string): Promise<Deadline> {
  const response = await axiosInstance.post(`/deadlines/${id}/complete`);
  return response.data;
}

/**
 * Update overdue deadlines (admin only)
 */
export async function updateOverdueDeadlines(): Promise<{ count: number }> {
  const response = await axiosInstance.post('/deadlines/update-overdue');
  return response.data;
}

/**
 * Calculate deadline based on business hours or calendar days
 */
export async function calculateDeadline(data: CalculateDeadlineDto): Promise<CalculatedDeadline> {
  const response = await axiosInstance.post('/deadlines/calculate', data);
  return response.data;
}
