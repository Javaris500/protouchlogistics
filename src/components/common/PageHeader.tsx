import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3",
        "sm:flex-row sm:items-end sm:justify-between sm:gap-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow && (
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
            {eyebrow}
          </span>
        )}
        <h1 className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl lg:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div
          className={cn(
            // Mobile: wrap to next row if content overflows, left-align
            "flex flex-wrap items-center gap-2",
            // Tablet+: don't wrap, hug right
            "sm:shrink-0 sm:flex-nowrap",
          )}
        >
          {actions}
        </div>
      )}
    </header>
  );
}
