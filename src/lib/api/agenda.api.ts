import { axiosInstance } from './axios';

export interface AgendaEvent {
  id: string;
  title: string;
  description?: string;
  type: 'TRIP' | 'VISIT' | 'MEETING' | 'INVITATION' | 'CONFERENCE' | 'CEREMONY';
  startDate: string;
  endDate?: string;
  location?: string;
  organizer?: string;
  participants?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  notes?: string;
  createdById: string;
  createdBy: { id: string; firstName: string; lastName: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgendaEventDto {
  title: string;
  description?: string;
  type: string;
  startDate: string;
  endDate?: string;
  location?: string;
  organizer?: string;
  participants?: string;
  priority?: string;
  notes?: string;
}

export const agendaApi = {
  getAll: async (filters?: Record<string, string>) => {
    const response = await axiosInstance.get('/agenda', { params: filters });
    return response.data as AgendaEvent[];
  },
  getOne: async (id: string) => {
    const response = await axiosInstance.get(`/agenda/${id}`);
    return response.data as AgendaEvent;
  },
  getUpcoming: async () => {
    const response = await axiosInstance.get('/agenda/upcoming');
    return response.data as AgendaEvent[];
  },
  create: async (dto: CreateAgendaEventDto) => {
    const response = await axiosInstance.post('/agenda', dto);
    return response.data as AgendaEvent;
  },
  update: async (id: string, dto: Partial<CreateAgendaEventDto> & { status?: string }) => {
    const response = await axiosInstance.patch(`/agenda/${id}`, dto);
    return response.data as AgendaEvent;
  },
  remove: async (id: string) => {
    const response = await axiosInstance.delete(`/agenda/${id}`);
    return response.data;
  },
};
