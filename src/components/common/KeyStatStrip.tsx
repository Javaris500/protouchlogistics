import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface KeyStat {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  /** Render the value in monospace + tabular-nums. Good for money, miles, ratios. */
  mono?: boolean;
  /** Highlight as the "hero" stat — slightly larger, copper-tinted. */
  emphasis?: boolean;
  /** Optional icon tile to the left of the label. */
  icon?: ReactNode;
}

interface KeyStatStripProps {
  stats: KeyStat[];
  className?: string;
}

/**
 * Compact horizontal strip of 2–4 key metrics.
 *
 * Sits directly under the PageHeader on detail pages — the "at a glance"
 * row. Distinct from KpiCard (used on dashboards): tighter padding, smaller
 * tile, usually read-only metrics derived from the entity itself.
 */
export function KeyStatStrip({ stats, className }: KeyStatStripProps) {
  const cols =
    stats.length === 2
      ? "grid-cols-2"
      : stats.length === 3
        ? "grid-cols-2 sm:grid-cols-3"
        : "grid-cols-2 sm:grid-cols-4";

  return (
    <div className={cn("grid gap-2", cols, className)}>
      {stats.map((stat, i) => (
        <div
          key={`${stat.label}-${i}`}
          className={cn(
            "flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--border)]",
            "bg-[var(--background)] px-4 py-3",
            "transition-shadow duration-150 hover:shadow-[var(--shadow-sm)]",
            stat.emphasis &&
              "border-[var(--primary)]/35 bg-[color-mix(in_oklab,var(--primary)_5%,var(--background))]",
          )}
        >
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {stat.icon && (
              <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-3">
                {stat.icon}
              </span>
            )}
            <span className="truncate">{stat.label}</span>
          </div>
          <div
            className={cn(
              "leading-tight tracking-tight",
              stat.emphasis
                ? "text-2xl font-bold text-[var(--primary)]"
                : "text-lg font-semibold text-[var(--foreground)]",
              stat.mono && "font-mono tabular-nums",
            )}
          >
            {stat.value}
          </div>
          {stat.sublabel && (
            <div className="text-[11px] leading-tight text-muted-foreground">
              {stat.sublabel}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
