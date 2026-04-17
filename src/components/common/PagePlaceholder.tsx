import { cn } from "@/lib/utils";
import { Construction } from "lucide-react";
import type { ReactNode } from "react";

interface PagePlaceholderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}

/**
 * Temporary page scaffold for routes that don't have content yet.
 * Clean, branded placeholder that looks intentional while pages are built.
 */
export function PagePlaceholder({
  eyebrow,
  title,
  description,
  children,
}: PagePlaceholderProps) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        {eyebrow && (
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
            {eyebrow}
          </span>
        )}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)]">
            {description}
          </p>
        )}
      </header>
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 py-16",
          "rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)]",
          "bg-[var(--surface)]",
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-2)]">
          <Construction className="h-5 w-5 text-[var(--muted-foreground)]" />
        </div>
        <p className="text-sm font-medium text-[var(--muted-foreground)]">
          {children ?? "This page is wired up and ready to build."}
        </p>
      </div>
    </div>
  );
}
