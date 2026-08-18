import { axiosInstance } from './axios';

export enum TemplateType {
  OFICIO = 'OFICIO',
  MEMORANDO = 'MEMORANDO',
  CIRCULAR = 'CIRCULAR',
  RESPUESTA = 'RESPUESTA',
  DECRETO = 'DECRETO',
  RESOLUCION = 'RESOLUCION',
}

export interface DocumentTemplate {
  id: string;
  name: string;
  type: TemplateType;
  content: string;
  variables: string[];
  isDefault: boolean;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateDto {
  name: string;
  type: TemplateType;
  content: string;
  variables?: string[];
  isDefault?: boolean;
}

export interface UpdateTemplateDto {
  name?: string;
  type?: TemplateType;
  content?: string;
  variables?: string[];
}

export const templatesApi = {
  // Get all templates
  getTemplates: async (type?: TemplateType): Promise<DocumentTemplate[]> => {
    const params = type ? { type } : {};
    const response = await axiosInstance.get('/templates', { params });
    return response.data;
  },

  // Get single template
  getTemplate: async (id: string): Promise<DocumentTemplate> => {
    const response = await axiosInstance.get(`/templates/${id}`);
    return response.data;
  },

  // Create template
  createTemplate: async (dto: CreateTemplateDto): Promise<DocumentTemplate> => {
    const response = await axiosInstance.post('/templates', dto);
    return response.data;
  },

  // Update template
  updateTemplate: async (id: string, dto: UpdateTemplateDto): Promise<DocumentTemplate> => {
    const response = await axiosInstance.patch(`/templates/${id}`, dto);
    return response.data;
  },

  // Delete template
  deleteTemplate: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`/templates/${id}`);
    return response.data;
  },

  // Duplicate template
  duplicateTemplate: async (id: string): Promise<DocumentTemplate> => {
    const response = await axiosInstance.post(`/templates/${id}/duplicate`);
    return response.data;
  },
};
