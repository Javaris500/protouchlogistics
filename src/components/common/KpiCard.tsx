import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  sublabel?: string;
  icon?: ReactNode;
  trend?: {
    direction: "up" | "down" | "flat";
    value: string;
    /** When true, "up" is green / "down" is red. When false, inverted (e.g. outstanding AR). */
    positiveIsGood?: boolean;
  };
  className?: string;
}

export function KpiCard({
  label,
  value,
  sublabel,
  icon,
  trend,
  className,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        "gap-3 py-5 transition-shadow duration-200 ease-out hover:shadow-[var(--shadow-md)]",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between !gap-0 px-5">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {icon && (
          <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-1 px-5">
        <div className="text-3xl font-semibold tracking-tight tabular-nums">
          {value}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {trend && <TrendPill trend={trend} />}
          {sublabel && <span>{sublabel}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function TrendPill({ trend }: { trend: NonNullable<KpiCardProps["trend"]> }) {
  const positiveIsGood = trend.positiveIsGood ?? true;
  const isGood =
    trend.direction === "flat"
      ? undefined
      : positiveIsGood
        ? trend.direction === "up"
        : trend.direction === "down";

  const toneClass =
    isGood === undefined
      ? "text-muted-foreground bg-muted"
      : isGood
        ? "text-[var(--success)] bg-[color-mix(in_oklab,var(--success)_14%,transparent)]"
        : "text-[var(--danger)] bg-[color-mix(in_oklab,var(--danger)_14%,transparent)]";

  const Icon =
    trend.direction === "up"
      ? ArrowUpRight
      : trend.direction === "down"
        ? ArrowDownRight
        : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium",
        toneClass,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {trend.value}
    </span>
  );
}
