import { Download } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * Standard chart container. Consistent header with title + optional
 * export button, padded body for the chart. No extra border — Card
 * supplies it.
 */
export function ChartCard({
  title,
  subtitle,
  actions,
  children,
  className,
  contentClassName,
}: ChartCardProps) {
  return (
    <Card
      className={cn(
        "gap-0 py-0 overflow-hidden transition-shadow duration-200 ease-out hover:shadow-[var(--shadow-md)]",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-1">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
        )}
      </header>
      <div className={cn("px-5 pb-5 pt-3", contentClassName)}>{children}</div>
    </Card>
  );
}

export function ExportButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Export chart"
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground"
    >
      <Download className="size-3.5" />
    </Button>
  );
}
