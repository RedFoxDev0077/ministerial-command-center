import { Skeleton } from './skeleton';

interface DataTableSkeletonProps {
  columns: number;
  rows?: number;
}

export function DataTableSkeleton({ columns, rows = 5 }: DataTableSkeletonProps) {
  return (
    <div className="w-full">
      <div className="rounded-lg border">
        <div className="border-b bg-muted/50 px-4 py-3">
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-24" />
            ))}
          </div>
        </div>
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-4 px-4 py-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton 
                  key={colIndex} 
                  className="h-4" 
                  style={{ width: `${Math.random() * 40 + 60}px` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
