import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Skeleton placeholder for a chart card's body. Static — no shimmer
 * animation per page-level guidance.
 */
export function ChartSkeleton({
  height = 240,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading chart"
      style={{ height }}
      className={cn(
        "flex w-full items-end gap-1.5 rounded-[var(--radius-sm)]",
        "bg-muted/40 p-3",
        className,
      )}
    >
      {/* Stylized bars standing in for the chart content */}
      {[0.35, 0.55, 0.45, 0.7, 0.6, 0.8, 0.65, 0.9, 0.75].map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-[3px] bg-muted-foreground/20"
          style={{ height: `${h * 100}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Empty state for a chart with no data. Friendlier than a blank card.
 */
export function ChartEmpty({
  icon,
  title = "No data yet",
  description,
  action,
  height = 240,
  className,
}: {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  height?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      style={{ height }}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)]",
        "border border-dashed border-[var(--border)] bg-muted/10 p-6 text-center",
        className,
      )}
    >
      {icon && (
        <div className="text-muted-foreground [&_svg]:size-6">{icon}</div>
      )}
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
