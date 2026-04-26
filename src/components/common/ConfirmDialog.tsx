import {
  AlertOctagon,
  AlertTriangle,
  Info,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Tone = "danger" | "warning" | "primary";

interface ConfirmInputSpec {
  label: string;
  placeholder?: string;
  /** Render a textarea instead of a single-line input. */
  multiline?: boolean;
  rows?: number;
  /** Block confirmation when the input is empty. */
  required?: boolean;
  /** Prefill. */
  defaultValue?: string;
}

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Drives icon, ring color, and default confirm button variant. */
  tone?: Tone;
  /** Override the default icon for the tone. */
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  /** Extra content below the description (e.g. a tip or meta line). */
  body?: ReactNode;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  cancelLabel?: string;
  /** Receives the input value when `input` is set. Can be async. */
  onConfirm: (value?: string) => void | Promise<void>;
  /** Extra work when cancel is clicked (dialog closes automatically). */
  onCancel?: () => void;
  /** External submit state. If omitted, the dialog tracks its own. */
  isSubmitting?: boolean;
  /** Optional text/textarea field — for reason prompts. */
  input?: ConfirmInputSpec;
}

const TONE_ICON: Record<Tone, LucideIcon> = {
  danger: AlertOctagon,
  warning: AlertTriangle,
  primary: Info,
};

const TONE_CLASSES: Record<Tone, string> = {
  danger:
    "bg-[color-mix(in_oklab,var(--danger)_16%,transparent)] text-[var(--danger)] ring-1 ring-[var(--danger)]/20",
  warning:
    "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[var(--warning)] ring-1 ring-[var(--warning)]/20",
  primary:
    "bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-[var(--primary)] ring-1 ring-[var(--primary)]/20",
};

/**
 * Replacement for native window.confirm() / window.prompt().
 *
 * - tone drives icon + default button variant (danger → danger button).
 * - `input` adds a labeled text or textarea for reason-style prompts.
 * - Prevents close while submitting (escape / outside click / cancel).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  tone = "danger",
  icon,
  title,
  description,
  body,
  confirmLabel,
  confirmVariant,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isSubmitting: externalSubmitting,
  input,
}: ConfirmDialogProps) {
  const Icon = icon ?? TONE_ICON[tone];
  const resolvedConfirmVariant =
    confirmVariant ?? (tone === "danger" ? "danger" : "primary");

  const inputId = useId();
  const [value, setValue] = useState(input?.defaultValue ?? "");
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null,
  );

  const submitting = externalSubmitting ?? internalSubmitting;

  // Reset input when dialog opens so stale values don't leak between uses.
  useEffect(() => {
    if (open) {
      setValue(input?.defaultValue ?? "");
      if (input) {
        // Defer so the dialog has mounted before focusing.
        window.setTimeout(() => firstFieldRef.current?.focus(), 30);
      }
    }
  }, [open, input?.defaultValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const trimmed = value.trim();
  const inputBlocksSubmit = !!input?.required && trimmed === "";
  const disableConfirm = submitting || inputBlocksSubmit;

  const handleConfirm = async () => {
    if (disableConfirm) return;
    if (externalSubmitting === undefined) setInternalSubmitting(true);
    try {
      await onConfirm(input ? trimmed : undefined);
    } finally {
      if (externalSubmitting === undefined) setInternalSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (submitting) return;
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && submitting) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        size="sm"
        className="flex flex-col p-0"
        onInteractOutside={(e) => {
          if (submitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (submitting) e.preventDefault();
        }}
      >
        <DialogHeader className="relative pr-12">
          <div className="flex items-start gap-3.5">
            <div
              aria-hidden="true"
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-[18px]",
                TONE_CLASSES[tone],
              )}
            >
              <Icon />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <DialogTitle>{title}</DialogTitle>
              {description && (
                <DialogDescription>{description}</DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {body && (
            <div className="text-xs text-muted-foreground">{body}</div>
          )}
          {input && (
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor={inputId}
                className="text-[13px] font-medium text-[var(--foreground)]"
              >
                {input.label}
                {input.required && (
                  <span
                    aria-hidden="true"
                    className="ml-0.5 text-[var(--danger)]"
                  >
                    *
                  </span>
                )}
              </Label>
              {input.multiline ? (
                <Textarea
                  id={inputId}
                  ref={(el) => {
                    firstFieldRef.current = el;
                  }}
                  rows={input.rows ?? 3}
                  placeholder={input.placeholder}
                  value={value}
                  disabled={submitting}
                  onChange={(e) => setValue(e.target.value)}
                />
              ) : (
                <Input
                  id={inputId}
                  ref={(el) => {
                    firstFieldRef.current = el;
                  }}
                  placeholder={input.placeholder}
                  value={value}
                  disabled={submitting}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !disableConfirm) {
                      e.preventDefault();
                      void handleConfirm();
                    }
                  }}
                />
              )}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={handleCancel}
            disabled={submitting}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={resolvedConfirmVariant}
            size="md"
            onClick={handleConfirm}
            disabled={disableConfirm}
            className="h-10 min-w-[120px] font-semibold shadow-[var(--shadow-sm)]"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
