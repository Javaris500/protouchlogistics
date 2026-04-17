import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * Generic titled section wrapper for dashboard widgets and list pages.
 * Uses Card for the surface so it inherits border/radius/shadow tokens.
 */
export function Section({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: SectionProps) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      <header
        className={cn(
          "flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5",
          "border-b border-border px-4 py-3 sm:px-5 sm:py-4",
        )}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </header>
      <div className={cn("px-4 py-4 sm:px-5", contentClassName)}>
        {children}
      </div>
    </Card>
  );
}
