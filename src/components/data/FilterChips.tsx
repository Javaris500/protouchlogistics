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
 * Clean pill-group selector. Inactive chips are outlined; the active chip
 * picks up the brand copper — soft tinted fill, orange inset ring, orange
 * label, and a filled count pip. Interactions animate with ease-out.
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
              "transition-[background-color,box-shadow,color,transform] duration-200 ease-out",
              "active:scale-[0.96]",
              // Focus
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
              active
                ? [
                    "bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]",
                    "text-[var(--primary)]",
                    "shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_32%,transparent),0_2px_6px_-2px_color-mix(in_oklab,var(--primary)_40%,transparent)]",
                  ].join(" ")
                : [
                    "bg-transparent text-muted-foreground",
                    "shadow-[inset_0_0_0_1px_var(--border-strong)]",
                    "hover:text-foreground hover:bg-[var(--surface-2)]",
                    "hover:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_24%,transparent),0_1px_2px_rgba(0,0,0,0.04)]",
                  ].join(" "),
            )}
          >
            <span className="relative">{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  "inline-flex min-w-[1.125rem] h-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums leading-none",
                  "transition-[background-color,color] duration-200 ease-out",
                  active
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_1px_2px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.18)]"
                    : "bg-[var(--surface-2)] text-muted-foreground group-hover:bg-[var(--surface-3)] group-hover:text-foreground",
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
