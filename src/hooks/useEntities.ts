import { useQuery } from '@tanstack/react-query';
import { entitiesApi, type Entity } from '@/lib/api/entities.api';

// Query keys
export const entityKeys = {
  all: ['entities'] as const,
  lists: () => [...entityKeys.all, 'list'] as const,
  detail: (id: string) => [...entityKeys.all, 'detail', id] as const,
};

/** All entities (ministries, companies, embassies, citizens...). */
export const useEntities = () => {
  return useQuery<Entity[]>({
    queryKey: entityKeys.lists(),
    queryFn: () => entitiesApi.getAll(),
  });
};

/** A single entity by id. */
export const useEntity = (id: string) => {
  return useQuery<Entity>({
    queryKey: entityKeys.detail(id),
    queryFn: () => entitiesApi.getById(id),
    enabled: Boolean(id),
  });
};
