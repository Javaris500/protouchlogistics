import { Search, X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface SearchInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  value: string;
  onValueChange: (value: string) => void;
  onClear?: () => void;
}

/**
 * Canonical search input for list pages (Trucks, Drivers, Loads, Invoices,
 * Documents, Audit, Integrations).
 *
 * Design notes:
 *  - Rounded-full pill reads as "search/filter" vs the rounded-md form inputs
 *    used for data entry. Visually distinct = less eye strain when scanning.
 *  - Copper focus glow (4px rgba shadow) matches the onboarding field focus
 *    treatment so the brand accent is consistent everywhere.
 *  - Icon + clear button are always centered, padded away from the edges.
 *  - Clear button only appears when there's a value — keeps the pill quiet
 *    at rest.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      value,
      onValueChange,
      onClear,
      placeholder = "Search…",
      ...props
    },
    ref,
  ) => {
    return (
      <div className="group relative flex w-full items-center">
        <Search
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-3.5 size-4",
            "text-[var(--muted-foreground)] transition-colors duration-150",
            "group-focus-within:text-[var(--primary)]",
          )}
        />
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "flex h-9 w-full rounded-full border bg-[var(--background)]",
            "pl-10 pr-10 text-[13px] text-[var(--foreground)]",
            "placeholder:text-[var(--subtle-foreground)]",
            // Default + hover
            "border-[var(--border)]",
            "hover:border-[var(--border-strong)]",
            // Focus: copper border + soft 4px ring glow (matches onboarding fields)
            "focus:outline-none focus:border-[var(--primary)]",
            "focus:shadow-[0_0_0_4px_rgb(242_122_26_/_0.12)]",
            "dark:focus:shadow-[0_0_0_4px_rgb(251_168_92_/_0.16)]",
            "transition-[border-color,box-shadow] duration-150 ease-out",
            // Kill WebKit's built-in search decorations that don't match our design
            "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
            className,
          )}
          {...props}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onValueChange("");
              onClear?.();
            }}
            aria-label="Clear search"
            className={cn(
              "absolute right-1.5 flex size-6 items-center justify-center rounded-full",
              "text-[var(--muted-foreground)]",
              "transition-colors duration-150",
              "hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
              "active:scale-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40",
            )}
          >
            <X className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
          </button>
        )}
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";
