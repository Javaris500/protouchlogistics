import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[var(--surface-2)]",
        className,
      )}
      {...props}
    />
  );
}

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  cols = 4,
  className,
}: TableSkeletonProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid items-center gap-3 border-b border-[var(--border)] py-2 last:border-b-0"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn(
                "h-4",
                colIndex === 0 ? "w-3/4" : "w-1/2",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface KpiSkeletonProps {
  className?: string;
}

export function KpiSkeleton({ className }: KpiSkeletonProps) {
  return (
    <div
      className={cn(
        "flex h-[84px] w-full flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-5 py-4",
        className,
      )}
      aria-busy="true"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="size-9 rounded-lg" />
      </div>
      <Skeleton className="h-6 w-24" />
    </div>
  );
}

interface CardSkeletonProps {
  className?: string;
}

export function CardSkeleton({ className }: CardSkeletonProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5",
        className,
      )}
      aria-busy="true"
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

interface ChartSkeletonProps {
  aspect?: string;
  className?: string;
}

export function ChartSkeleton({
  aspect = "16/9",
  className,
}: ChartSkeletonProps) {
  return (
    <Skeleton
      className={cn("w-full", className)}
      style={{ aspectRatio: aspect } as CSSProperties}
      aria-busy="true"
    />
  );
}
