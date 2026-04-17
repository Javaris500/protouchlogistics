import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ViewOption<T extends string = string> {
  value: T;
  label: string;
  icon: LucideIcon;
}

interface Props<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ViewOption<T>[];
  className?: string;
}

/**
 * Segmented pill toggle for switching between data views (Table / Grid / Board).
 * Active option gets a white card with soft shadow; inactive is muted.
 */
export function ViewSwitcher<T extends string>({
  value,
  onChange,
  options,
  className,
}: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label="View mode"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-[var(--border)]",
        "bg-[var(--surface)] p-0.5 shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      {options.map(({ value: v, label, icon: Icon }) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            title={label}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5",
              "text-[12px] font-semibold tracking-tight",
              "transition-all duration-150",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30",
              active
                ? "bg-[var(--background)] text-[var(--foreground)] shadow-[var(--shadow-sm)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
            )}
          >
            <Icon className="size-3.5" strokeWidth={2} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
