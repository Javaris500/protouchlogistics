import { cn } from "@/lib/utils";

interface FilterChipOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface FilterChipsProps<T extends string> {
  options: ReadonlyArray<FilterChipOption<T>>;
  value: T;
  onChange: (value: T) => void;
  label?: string;
  className?: string;
}

/**
 * Pill-group selector for list filters.
 *
 * Inactive: soft surface fill with a whisper-border, muted label + count.
 * Active: solid copper fill, white label, white/translucent count pip, a
 *   small lifted shadow. High-confidence "you are here" signal.
 * Hover:   inactive → foreground-toned border + slightly darker fill.
 *
 * Subtle press feedback (scale-95) reinforces tactile feel on touch.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: FilterChipsProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              // Shape
              "group relative inline-flex h-8 items-center gap-1.5 rounded-full px-3.5",
              "text-xs font-medium leading-none select-none",
              // Motion
              "transition-[background-color,color,box-shadow,transform,border-color] duration-150 ease-out",
              "active:scale-[0.97]",
              // Focus
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
              active
                ? [
                    // Solid copper fill, white text
                    "bg-[var(--primary)] text-[var(--primary-foreground)]",
                    "border border-transparent",
                    // Lifted shadow with a subtle copper glow
                    "shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_10px_-4px_color-mix(in_oklab,var(--primary)_55%,transparent)]",
                    // Very subtle press-in on the top
                    "[text-shadow:0_1px_0_rgba(0,0,0,0.08)]",
                  ].join(" ")
                : [
                    // Soft surface pill
                    "bg-[var(--surface)] text-[var(--muted-foreground)]",
                    "border border-[var(--border-strong)]",
                    "shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
                    // Hover: bring it toward the foreground palette
                    "hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
                    "hover:border-[color-mix(in_oklab,var(--foreground)_22%,transparent)]",
                  ].join(" "),
            )}
          >
            <span className="relative">{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  "inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-1",
                  "text-[10px] font-semibold tabular-nums leading-none",
                  "transition-[background-color,color] duration-150 ease-out",
                  active
                    ? [
                        // Frosted-looking pip inside the copper fill
                        "bg-[color-mix(in_oklab,white_28%,transparent)]",
                        "text-[var(--primary-foreground)]",
                        "shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
                      ].join(" ")
                    : [
                        "bg-[var(--surface-2)] text-muted-foreground",
                        "group-hover:bg-[var(--surface-3)] group-hover:text-foreground",
                      ].join(" "),
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
