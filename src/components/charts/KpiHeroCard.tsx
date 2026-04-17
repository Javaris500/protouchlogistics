import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  ChartExplanation,
  type ChartExplanationContent,
} from "./ChartExplanation";
import { Sparkline } from "./Sparkline";

interface KpiHeroCardProps {
  label: string;
  /** Pre-formatted display value (e.g. "$1.12M" or "17.8%"). */
  value: string;
  /** Pre-formatted delta (e.g. "+$132K" or "−2.1pts"). */
  delta: string;
  /** Direction of delta for color + arrow. */
  trend: "up" | "down" | "flat";
  /** Whether `up` is positive for this metric. Drives color. */
  upIsGood: boolean;
  /** Sub-label under delta, like "vs. prior month". */
  deltaLabel: string;
  /** Raw sparkline values — any unit; we normalize. */
  sparkline: number[];
  /** Optional leading icon inside the small chip. */
  icon?: ReactNode;
  /** Optional tooltip shown on the card title. */
  hint?: string;
  /** Plain-language explanation popover — "what is this, how do I read it?" */
  explanation?: ChartExplanationContent;
}

/**
 * Hero KPI card — single metric lead. Big value, delta pill, compact
 * sparkline. Six of these sit at the top of the Analytics page.
 */
export function KpiHeroCard({
  label,
  value,
  delta,
  trend,
  upIsGood,
  deltaLabel,
  sparkline,
  icon,
  hint,
  explanation,
}: KpiHeroCardProps) {
  const isPositive =
    trend === "flat" ? null : trend === "up" ? upIsGood : !upIsGood;

  const DeltaIcon =
    trend === "flat" ? Minus : trend === "up" ? ArrowUpRight : ArrowDownRight;

  const deltaColorCls =
    isPositive === null
      ? "text-muted-foreground bg-muted"
      : isPositive
        ? "text-[var(--success)] bg-[color-mix(in_oklab,var(--success)_14%,transparent)]"
        : "text-[var(--danger)] bg-[color-mix(in_oklab,var(--danger)_14%,transparent)]";

  const sparkColor = !upIsGood ? "var(--muted-foreground)" : "var(--primary)";

  return (
    <Card
      className={cn(
        "gap-3 px-4 py-4",
        "transition-shadow duration-150 ease-out",
        "hover:shadow-[var(--shadow-md)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {icon && (
            <span className="flex size-4 items-center justify-center [&_svg]:size-3.5">
              {icon}
            </span>
          )}
          <span title={hint}>{label}</span>
        </div>
        {explanation && <ChartExplanation content={explanation} size="xs" />}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-[26px] font-bold leading-none tracking-tight tabular-nums">
            {value}
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5",
                "text-[10px] font-semibold tabular-nums",
                deltaColorCls,
              )}
            >
              <DeltaIcon className="size-3" strokeWidth={2.5} />
              {delta}
            </span>
            <span className="truncate text-[10px] text-muted-foreground">
              {deltaLabel}
            </span>
          </div>
        </div>

        <div className="shrink-0">
          <Sparkline
            values={sparkline}
            width={64}
            height={28}
            stroke={sparkColor}
            fill={`color-mix(in oklab, ${sparkColor} 14%, transparent)`}
            strokeWidth={1.5}
          />
        </div>
      </div>
    </Card>
  );
}
