import { Loader2 } from "lucide-react";
import { type FormEventHandler, type ReactNode, useId } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  /** Icon shown next to the title — any Lucide icon or custom element. */
  icon?: ReactNode;
  children: ReactNode;
  /** Right-aligned footer actions. Defaults to Cancel + Submit. */
  footer?: ReactNode;
  /** Submit handler. Keeps the form semantic and enter-key friendly. */
  onSubmit?: FormEventHandler<HTMLFormElement>;
  submitLabel?: string;
  submitVariant?: "primary" | "danger";
  cancelLabel?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  /** Optional banner at top of body — e.g., form-level error. */
  banner?: ReactNode;
}

/**
 * Opinionated wrapper for any "add / edit X" form in a dialog.
 *
 * Improvements applied:
 *  #5 — Icon treatment: gradient bg, rounded-xl, larger
 *  #6 — Body spacing: space-y-5 with optional group support
 *  #8 — Footer: primary CTA is h-10, cancel stays h-9 for hierarchy
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  eyebrow,
  icon,
  children,
  footer,
  onSubmit,
  submitLabel = "Save",
  submitVariant = "primary",
  cancelLabel = "Cancel",
  isSubmitting = false,
  submitDisabled = false,
  size = "md",
  banner,
}: FormDialogProps) {
  const formId = useId();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Prevent close-by-escape/outside while submitting
        if (!next && isSubmitting) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        size={size}
        className="flex flex-col p-0"
        onInteractOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        <form id={formId} onSubmit={onSubmit} className="contents" noValidate>
          <DialogHeader className="relative pr-12">
            <div className="flex items-start gap-3.5">
              {/* Improvement #5 — premium icon box */}
              {icon && (
                <div
                  aria-hidden="true"
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center",
                    "rounded-xl",
                    "bg-gradient-to-br from-[color-mix(in_oklab,var(--primary)_16%,transparent)] to-[color-mix(in_oklab,var(--primary)_8%,transparent)]",
                    "text-[var(--primary)]",
                    "ring-1 ring-[var(--primary)]/10",
                    "[&_svg]:size-[18px]",
                  )}
                >
                  {icon}
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {eyebrow && (
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--primary)]">
                    {eyebrow}
                  </span>
                )}
                <DialogTitle>{title}</DialogTitle>
                {description && (
                  <DialogDescription>{description}</DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>

          {banner && (
            <div className="border-b border-[var(--border)]/60 px-6 py-3">
              {banner}
            </div>
          )}

          {/* Improvement #6 — space-y-5 gives breathing room between fields */}
          <DialogBody className="space-y-5">{children}</DialogBody>

          {/* Improvement #8 — primary CTA is taller + bolder than cancel */}
          <DialogFooter>
            {footer ?? (
              <>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    disabled={isSubmitting}
                  >
                    {cancelLabel}
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  variant={submitVariant}
                  size="md"
                  disabled={submitDisabled || isSubmitting}
                  form={formId}
                  className="h-10 min-w-[120px] font-semibold shadow-[var(--shadow-sm)]"
                >
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  {isSubmitting ? "Saving…" : submitLabel}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
