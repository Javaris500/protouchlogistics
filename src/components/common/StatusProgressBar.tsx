import { Check, XCircle } from "lucide-react";
import { Fragment } from "react";

import type { LoadStatus, InvoiceStatus } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";

export interface ProgressStep {
  id: string;
  label: string;
  /** Short variant rendered on narrow viewports. Defaults to `label`. */
  shortLabel?: string;
}

interface StatusProgressBarProps {
  steps: ProgressStep[];
  /** Zero-based index of the current step. Steps before are "done." */
  currentStepIndex: number;
  /** When true, the whole bar is rendered in the danger state (cancelled/void). */
  cancelled?: boolean;
  /** Accessible label for the bar. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Horizontal progress bar for entity lifecycles.
 *
 * Visual: circles for each step connected by thin connector bars. Done steps
 * are copper-filled with a check; current step is ringed in copper; future
 * steps are outlined in the strong-border gray. On cancellation, the bar
 * dims and current index renders as a red X.
 */
export function StatusProgressBar({
  steps,
  currentStepIndex,
  cancelled,
  ariaLabel,
  className,
}: StatusProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={steps.length - 1}
      aria-valuenow={currentStepIndex}
      className={cn(
        "flex items-start gap-0",
        cancelled && "opacity-80",
        className,
      )}
    >
      {steps.map((step, i) => {
        const isDone = !cancelled && i < currentStepIndex;
        const isCurrent = i === currentStepIndex;
        const isFuture = !cancelled && i > currentStepIndex;
        const connectorDone = !cancelled && i < currentStepIndex;

        return (
          <Fragment key={step.id}>
            <div className="flex min-w-0 flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                  isDone &&
                    "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-sm)]",
                  isCurrent &&
                    !cancelled &&
                    "border-2 border-[var(--primary)] bg-[var(--background)] text-[var(--primary)] ring-4 ring-[var(--primary)]/15",
                  isCurrent &&
                    cancelled &&
                    "border-2 border-[var(--danger)] bg-[var(--background)] text-[var(--danger)] ring-4 ring-[var(--danger)]/15",
                  isFuture &&
                    "border-2 border-[var(--border-strong)] bg-[var(--background)] text-[var(--subtle-foreground)]",
                )}
              >
                {isDone ? (
                  <Check className="size-3.5" aria-hidden="true" />
                ) : isCurrent && cancelled ? (
                  <XCircle className="size-3.5" aria-hidden="true" />
                ) : (
                  i + 1
                )}
              </div>
              <div className="flex flex-col items-center gap-0 text-center">
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider leading-tight",
                    isCurrent && !cancelled && "text-[var(--primary)]",
                    isCurrent && cancelled && "text-[var(--danger)]",
                    isDone && "text-[var(--foreground)]",
                    isFuture && "text-muted-foreground",
                  )}
                >
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">
                    {step.shortLabel ?? step.label}
                  </span>
                </span>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                aria-hidden="true"
                className={cn(
                  "mx-1 mt-3 h-0.5 flex-1 rounded-full transition-colors sm:mx-2",
                  connectorDone
                    ? "bg-[var(--primary)]"
                    : "bg-[var(--border-strong)]",
                )}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Load lifecycle mapping                                                    */
/* -------------------------------------------------------------------------- */

export const LOAD_PROGRESS_STEPS: ProgressStep[] = [
  { id: "dispatched", label: "Dispatched", shortLabel: "Disp" },
  { id: "pickup", label: "Pickup", shortLabel: "PU" },
  { id: "delivery", label: "Delivery", shortLabel: "Del" },
  { id: "closed", label: "Closed", shortLabel: "Done" },
];

export function loadStatusToProgress(status: LoadStatus): {
  index: number;
  cancelled: boolean;
} {
  if (status === "cancelled") {
    // Render at whatever stage we were at; admin may want to see where it died.
    return { index: 0, cancelled: true };
  }
  if (["draft", "assigned", "accepted"].includes(status)) {
    return { index: 0, cancelled: false };
  }
  if (["en_route_pickup", "at_pickup", "loaded"].includes(status)) {
    return { index: 1, cancelled: false };
  }
  if (["en_route_delivery", "at_delivery", "delivered"].includes(status)) {
    return { index: 2, cancelled: false };
  }
  if (["pod_uploaded", "completed"].includes(status)) {
    return { index: 3, cancelled: false };
  }
  return { index: 0, cancelled: false };
}

/* -------------------------------------------------------------------------- */
/*  Invoice lifecycle mapping                                                 */
/* -------------------------------------------------------------------------- */

export const INVOICE_PROGRESS_STEPS: ProgressStep[] = [
  { id: "draft", label: "Draft" },
  { id: "sent", label: "Sent" },
  { id: "paid", label: "Paid" },
];

export function invoiceStatusToProgress(status: InvoiceStatus): {
  index: number;
  cancelled: boolean;
} {
  if (status === "void") return { index: 0, cancelled: true };
  if (status === "draft") return { index: 0, cancelled: false };
  if (status === "sent" || status === "overdue")
    return { index: 1, cancelled: false };
  if (status === "paid") return { index: 2, cancelled: false };
  return { index: 0, cancelled: false };
}
