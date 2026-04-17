import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 3, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "flex w-full rounded-[var(--radius-md)] border border-[var(--border)]",
        "bg-[var(--background)] px-3 py-2 text-sm",
        "placeholder:text-[var(--muted-foreground)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:border-transparent",
        "aria-[invalid=true]:border-[var(--danger)] aria-[invalid=true]:focus-visible:ring-[var(--danger)]/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "resize-none min-h-[72px]",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
