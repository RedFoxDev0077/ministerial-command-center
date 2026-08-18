import axios from './axios';

export enum EntityType {
  INTERNAL_DEPARTMENT = 'INTERNAL_DEPARTMENT',
  PUBLIC_COMPANY = 'PUBLIC_COMPANY',
  PRIVATE_COMPANY = 'PRIVATE_COMPANY',
  GOVERNMENT_MINISTRY = 'GOVERNMENT_MINISTRY',
  INTERNATIONAL_ORG = 'INTERNATIONAL_ORG',
  EMBASSY = 'EMBASSY',
  CITIZEN = 'CITIZEN',
  OTHER = 'OTHER',
}

export enum Classification {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

export interface Entity {
  id: string;
  name: string;
  shortName?: string;
  type: EntityType;
  classification: Classification;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEntityDto {
  name: string;
  shortName?: string;
  type: EntityType;
  classification: Classification;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
}

export interface UpdateEntityDto {
  name?: string;
  shortName?: string;
  type?: EntityType;
  classification?: Classification;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
}

export const entitiesApi = {
  // Get all entities
  getAll: async (): Promise<Entity[]> => {
    const response = await axios.get('/entities');
    return response.data;
  },

  // Get entity by ID
  getById: async (id: string): Promise<Entity> => {
    const response = await axios.get(`/entities/${id}`);
    return response.data;
  },

  // Create new entity
  create: async (data: CreateEntityDto): Promise<Entity> => {
    const response = await axios.post('/entities', data);
    return response.data;
  },

  // Update entity
  update: async (id: string, data: UpdateEntityDto): Promise<Entity> => {
    const response = await axios.patch(`/entities/${id}`, data);
    return response.data;
  },

  // Delete entity (soft delete)
  remove: async (id: string): Promise<{ message: string }> => {
    const response = await axios.delete(`/entities/${id}`);
    return response.data;
  },
};

// Helper function to get entity type label
export const getEntityTypeLabel = (type: EntityType): string => {
  const labels: Record<EntityType, string> = {
    [EntityType.INTERNAL_DEPARTMENT]: 'Departamento Interno',
    [EntityType.PUBLIC_COMPANY]: 'Empresa Pública',
    [EntityType.PRIVATE_COMPANY]: 'Empresa Privada',
    [EntityType.GOVERNMENT_MINISTRY]: 'Ministerio',
    [EntityType.INTERNATIONAL_ORG]: 'Organización Internacional',
    [EntityType.EMBASSY]: 'Embajada',
    [EntityType.CITIZEN]: 'Ciudadano',
    [EntityType.OTHER]: 'Otro',
  };
  return labels[type] || type;
};

// Helper function to get classification label
export const getClassificationLabel = (classification: Classification): string => {
  const labels: Record<Classification, string> = {
    [Classification.INTERNAL]: 'Interna',
    [Classification.EXTERNAL]: 'Externa',
  };
  return labels[classification] || classification;
};
