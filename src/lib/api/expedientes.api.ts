import { axiosInstance } from './axios';

export enum ExpStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface Expediente {
  id: string;
  code: string;
  title: string;
  description?: string;
  status: ExpStatus;
  priority: Priority;
  startDate: string;
  closedDate?: string;
  createdAt: string;
  updatedAt: string;
  documents?: any[];
  deadlines?: any[];
  _count?: {
    documents: number;
    deadlines: number;
  };
}

export interface CreateExpedienteDto {
  title: string;
  description?: string;
  priority?: Priority;
  startDate?: string;
}

export interface UpdateExpedienteDto {
  title?: string;
  description?: string;
  status?: ExpStatus;
  closedDate?: string;
  startDate?: string;
}

export interface QueryExpedienteDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: ExpStatus;
  sort?: string;
}

export interface ExpedientesResponse {
  data: Expediente[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ExpedientesStats {
  total: number;
  open: number;
  inProgress: number;
  closed: number;
  archived: number;
}

// Create expediente
export async function createExpediente(data: CreateExpedienteDto): Promise<Expediente> {
  const response = await axiosInstance.post('/expedientes', data);
  return response.data;
}

// Get all expedientes with pagination and filters
export async function getExpedientes(params?: QueryExpedienteDto): Promise<ExpedientesResponse> {
  // Remove React Query parameters
  const cleanParams = params && typeof params === 'object' && !('queryKey' in params) ? params : undefined;
  const response = await axiosInstance.get('/expedientes', { params: cleanParams });
  return response.data;
}

// Get expediente by ID
export async function getExpediente(id: string): Promise<Expediente> {
  const response = await axiosInstance.get(`/expedientes/${id}`);
  return response.data;
}

// Update expediente
export async function updateExpediente(id: string, data: UpdateExpedienteDto): Promise<Expediente> {
  const response = await axiosInstance.patch(`/expedientes/${id}`, data);
  return response.data;
}

// Delete (archive) expediente
export async function deleteExpediente(id: string): Promise<Expediente> {
  const response = await axiosInstance.delete(`/expedientes/${id}`);
  return response.data;
}

// Get expedientes statistics
export async function getExpedientesStats(): Promise<ExpedientesStats> {
  const response = await axiosInstance.get('/expedientes/stats');
  return response.data;
}
