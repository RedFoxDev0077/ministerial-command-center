import { PaginatedResponseDto } from '../dto/document-response.dto';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

/**
 * Create paginated response
 * @param data Array of items
 * @param meta Pagination metadata
 * @returns PaginatedResponseDto
 */
export function createPaginatedResponse<T>(
  data: T[],
  meta: PaginationMeta,
): PaginatedResponseDto<T> {
  const totalPages = Math.ceil(meta.total / meta.limit);

  return {
    data,
    total: meta.total,
    page: meta.page,
    limit: meta.limit,
    totalPages,
    hasNext: meta.page < totalPages,
    hasPrev: meta.page > 1,
  };
}

/**
 * Calculate skip value for Prisma queries
 * @param page Current page number (1-indexed)
 * @param limit Items per page
 * @returns number Skip value for Prisma
 */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}
