import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Props {
  label: string;
  htmlFor?: string;
  error?: string;
  helper?: string;
  optional?: boolean;
  /** Show a green check next to the label when valid + filled. */
  valid?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Label + input wrapper with consistent spacing.
 * - Error replaces helper (they never stack).
 * - Optional "valid" state shows a small green check next to the label.
 */
export function OnboardingField({
  label,
  htmlFor,
  error,
  helper,
  optional,
  valid,
  children,
  className,
}: Props) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label
            htmlFor={htmlFor}
            className="text-[13px] font-medium text-[var(--foreground)]"
          >
            {label}
          </label>
          {valid && (
            <span
              aria-label="Valid"
              className="flex size-3.5 items-center justify-center rounded-full bg-[var(--success)]/15 text-[var(--success)]"
            >
              <Check className="size-2.5" strokeWidth={3} />
            </span>
          )}
        </div>
        {optional && (
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--subtle-foreground)]">
            Optional
          </span>
        )}
      </div>

      {children}

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-1 pt-0.5 text-[12px] font-medium leading-snug text-[var(--danger)]"
        >
          {error}
        </p>
      ) : helper ? (
        <p className="pt-0.5 text-[12px] leading-snug text-[var(--muted-foreground)]">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * OnboardingInput — 48px, 15px text, soft focus glow.
 * Uses a 4px rgba shadow for a layered focus ring that works on both themes
 * without needing ring-offset acrobatics.
 * -------------------------------------------------------------------------- */

const INPUT_BASE = [
  "flex h-12 w-full rounded-[var(--radius-md)] border bg-[var(--background)]",
  "px-3.5 text-[15px] text-[var(--foreground)]",
  "placeholder:text-[var(--subtle-foreground)]",
  "transition-[border-color,box-shadow,background-color] duration-150 ease-out",
  "focus:outline-none",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

const INPUT_VALID = [
  "border-[var(--border-strong)]",
  "hover:border-[var(--foreground)]/25",
  "focus:border-[var(--primary)]",
  "focus:shadow-[0_0_0_4px_rgb(201_123_58_/_0.14)]",
  "dark:focus:shadow-[0_0_0_4px_rgb(232_166_107_/_0.18)]",
].join(" ");

const INPUT_INVALID = [
  "border-[var(--danger)]",
  "focus:border-[var(--danger)]",
  "focus:shadow-[0_0_0_4px_rgb(220_38_38_/_0.16)]",
].join(" ");

export const OnboardingInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className, type = "text", invalid, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        INPUT_BASE,
        invalid ? INPUT_INVALID : INPUT_VALID,
        className,
      )}
      {...props}
    />
  );
});
OnboardingInput.displayName = "OnboardingInput";

/* --------------------------------------------------------------------------
 * OnboardingSelect — matches Input visually. Chevron rotates on focus.
 * -------------------------------------------------------------------------- */

export const OnboardingSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(({ className, children, invalid, ...props }, ref) => {
  return (
    <div className="group relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          INPUT_BASE,
          "appearance-none pr-10",
          invalid ? INPUT_INVALID : INPUT_VALID,
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className={cn(
          "pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2",
          "text-[var(--muted-foreground)] transition-transform duration-150",
          "group-focus-within:rotate-180 group-focus-within:text-[var(--primary)]",
        )}
      >
        <path
          d="M5 8l5 5 5-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});
OnboardingSelect.displayName = "OnboardingSelect";

/* --------------------------------------------------------------------------
 * OnboardingSegmented — pill radio group. Active option gets copper
 * background + lift shadow. Checkmark fades in for confirmed states.
 * -------------------------------------------------------------------------- */

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  sublabel?: string;
}

interface SegmentProps<T extends string> {
  value: T | undefined;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  name: string;
}

export function OnboardingSegmented<T extends string>({
  value,
  onChange,
  options,
  name,
}: SegmentProps<T>) {
  return (
    <div
      role="radiogroup"
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "group relative flex h-12 flex-col items-center justify-center gap-0.5",
              "rounded-[var(--radius-md)] border px-3 text-[15px] font-semibold tracking-tight",
              "transition-all duration-150 ease-out",
              "focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary)]/18",
              "active:scale-[0.98]",
              selected
                ? [
                    "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)]",
                    "shadow-[var(--shadow-sm)]",
                  ].join(" ")
                : [
                    "border-[var(--border-strong)] bg-[var(--background)]",
                    "text-[var(--muted-foreground)]",
                    "hover:border-[var(--foreground)]/25 hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
                  ].join(" "),
            )}
          >
            <span className="leading-none">{opt.label}</span>
            {opt.sublabel && (
              <span className="text-[10px] font-normal text-[var(--subtle-foreground)]">
                {opt.sublabel}
              </span>
            )}
            {selected && (
              <span
                aria-hidden
                className="absolute right-2 top-2 flex size-3.5 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]"
              >
                <Check className="size-2.5" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}
