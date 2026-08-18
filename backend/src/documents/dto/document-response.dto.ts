import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Array of items' })
  data: T[];

  @ApiProperty({ description: 'Total count of items' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages: number;

  @ApiProperty({ description: 'Has next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Has previous page' })
  hasPrev: boolean;
}

export class DashboardStatsDto {
  @ApiProperty({ description: 'Number of documents entered today' })
  entriesToday: number;

  @ApiProperty({ description: 'Number of documents sent out today' })
  exitsToday: number;

  @ApiProperty({ description: 'Number of pending documents' })
  pending: number;

  @ApiProperty({ description: 'Number of documents in progress' })
  inProgress: number;

  @ApiProperty({ description: 'Number of completed documents' })
  completed: number;

  @ApiProperty({ description: 'Number of open cases' })
  openCases: number;

  @ApiProperty({ description: 'Number of upcoming deadlines' })
  upcomingDeadlines: number;

  @ApiProperty({ description: 'Number of pending signatures' })
  pendingSignatures: number;
}
