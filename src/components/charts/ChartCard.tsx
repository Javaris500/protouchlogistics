import { Download } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  ChartExplanation,
  type ChartExplanationContent,
} from "./ChartExplanation";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Optional tooltip explaining what the chart means. Rendered via
   *  native `title` attribute on an info dot — keeps DOM minimal. */
  hint?: string;
  /** Small icon rendered next to the title. */
  icon?: ReactNode;
  /** Plain-language explanation popover — what is this, how to read it. */
  explanation?: ChartExplanationContent;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Aria description for the chart region — read by screen readers. */
  "aria-label"?: string;
}

/**
 * Standard chart container. Consistent header with optional title icon,
 * subtitle, hint, and action slot. Body has its own padding.
 */
export function ChartCard({
  title,
  subtitle,
  hint,
  icon,
  explanation,
  actions,
  children,
  className,
  contentClassName,
  "aria-label": ariaLabel,
}: ChartCardProps) {
  return (
    <Card
      role="region"
      aria-label={ariaLabel ?? title}
      className={cn(
        "gap-0 overflow-hidden py-0 transition-shadow duration-200 ease-out",
        "hover:shadow-[var(--shadow-md)]",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 px-5 pb-1 pt-5">
        <div className="flex min-w-0 items-start gap-2">
          {icon && (
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 flex size-7 shrink-0 items-center justify-center",
                "rounded-[var(--radius-sm)] bg-muted text-muted-foreground",
                "[&_svg]:size-3.5",
              )}
            >
              {icon}
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <h3 className="text-sm font-semibold tracking-tight" title={hint}>
                {title}
              </h3>
              {explanation && <ChartExplanation content={explanation} />}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
        )}
      </header>
      <div className={cn("px-5 pb-5 pt-3", contentClassName)}>{children}</div>
    </Card>
  );
}

interface ExportButtonProps {
  onClick?: () => void;
  /** Aria label and tooltip — defaults to "Export chart". */
  label?: string;
}

export function ExportButton({
  onClick,
  label = "Export CSV",
}: ExportButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground"
    >
      <Download className="size-3.5" />
    </Button>
  );
}
