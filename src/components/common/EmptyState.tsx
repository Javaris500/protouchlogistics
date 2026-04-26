import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type EmptyStateVariant = "first-time" | "filter" | "caught-up";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  variant?: EmptyStateVariant;
}

const CONTAINER_VARIANT: Record<EmptyStateVariant, string> = {
  "first-time":
    "border-dashed border-[var(--border-strong)] bg-muted/30",
  filter: "border-solid border-[var(--border)] bg-muted/20",
  "caught-up": "border-solid border-[var(--border)] bg-muted/20",
};

const ICON_VARIANT: Record<EmptyStateVariant, string> = {
  "first-time":
    "bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-[var(--primary)]",
  filter: "bg-muted text-muted-foreground",
  "caught-up":
    "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[var(--success)]",
};

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  variant = "first-time",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border px-6 py-12 text-center",
        CONTAINER_VARIANT[variant],
        className,
      )}
    >
      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-full",
          ICON_VARIANT[variant],
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">{title}</p>
        {description && (
          <p className="max-w-sm text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
