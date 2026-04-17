import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;

interface SortButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  children: ReactNode;
  /** Whether this column is the one currently driving sort. */
  active?: boolean;
  /** Direction. `null` = not sorted (rendered even if `active` is true). */
  direction?: SortDirection;
  /** Called when the button is pressed. Caller owns cycling logic. */
  onToggle?: () => void;
  className?: string;
}

/**
 * Table-header sort button. Drop-in replacement for the ad-hoc
 * `<button>Label <ArrowUpDown/></button>` pattern that was sprinkled across
 * list pages.
 *
 * Visual states:
 *   - Inactive     : muted label, double-arrow icon, subtle hover brighten
 *   - Active asc   : foreground label, copper ArrowUp
 *   - Active desc  : foreground label, copper ArrowDown
 *   - Active null  : foreground label, double-arrow (still emphasized as "this
 *                    is the picked column, but in natural order")
 *
 * The `active` state also gets a thin copper underline so scanning the header
 * row makes it obvious which column is sorted.
 */
export function SortButton({
  children,
  active = false,
  direction = null,
  onToggle,
  className,
  onClick,
  type = "button",
  ...props
}: SortButtonProps) {
  const Icon =
    active && direction === "asc"
      ? ArrowUp
      : active && direction === "desc"
        ? ArrowDown
        : ArrowUpDown;

  return (
    <button
      type={type}
      onClick={(e) => {
        onClick?.(e);
        onToggle?.();
      }}
      aria-sort={
        active && direction === "asc"
          ? "ascending"
          : active && direction === "desc"
            ? "descending"
            : "none"
      }
      data-active={active || undefined}
      className={cn(
        // Base — matches the parent TableHead cell typography so nothing
        // shifts when a column moves between sorted/unsorted
        "group relative inline-flex h-7 items-center gap-1.5",
        "-mx-1 rounded-sm px-1",
        "text-[11px] font-semibold uppercase tracking-wider",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]",
        active
          ? "text-[var(--foreground)]"
          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
        // Copper underline under the active column — thin, rounded, only
        // fully visible when active; a ghost of it fades in on hover
        "after:pointer-events-none after:absolute after:inset-x-1 after:-bottom-[3px]",
        "after:h-[2px] after:rounded-full after:transition-opacity after:duration-150",
        active
          ? "after:bg-[var(--primary)] after:opacity-100"
          : "after:bg-[var(--border-strong)] after:opacity-0 group-hover:after:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
      <Icon
        aria-hidden="true"
        className={cn(
          "size-3 shrink-0 transition-colors",
          active && direction
            ? "text-[var(--primary)]"
            : "text-[var(--subtle-foreground)] group-hover:text-[var(--muted-foreground)]",
        )}
      />
    </button>
  );
}
