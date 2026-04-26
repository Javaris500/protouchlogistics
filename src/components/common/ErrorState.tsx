import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title: string;
  description?: string;
  onRetry?: () => void;
  technicalDetails?: string;
  className?: string;
}

export function ErrorState({
  title,
  description,
  onRetry,
  technicalDetails,
  className,
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-[var(--border)] bg-muted/20 px-6 py-12 text-center",
        className,
      )}
      role="alert"
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] text-[var(--danger)]">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">{title}</p>
        {description && (
          <p className="max-w-sm text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {onRetry && (
        <div className="mt-1">
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
      {technicalDetails && (
        <div className="mt-2 w-full max-w-md">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            aria-expanded={showDetails}
          >
            {showDetails ? (
              <ChevronDown className="size-3" aria-hidden="true" />
            ) : (
              <ChevronRight className="size-3" aria-hidden="true" />
            )}
            Technical details
          </button>
          {showDetails && (
            <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3 text-left text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-all">
              {technicalDetails}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
