import { useQuery } from '@tanstack/react-query';
import { usersApi, type User } from '@/lib/api/users.api';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};

/** All users, used to populate responsible/assignee pickers. */
export const useUsers = () => {
  return useQuery<User[]>({
    queryKey: userKeys.lists(),
    queryFn: () => usersApi.getAll(),
  });
};

/** A single user by id. */
export const useUser = (id: string) => {
  return useQuery<User>({
    queryKey: userKeys.detail(id),
    queryFn: () => usersApi.getById(id),
    enabled: Boolean(id),
  });
};
