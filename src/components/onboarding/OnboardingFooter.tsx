import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

interface Props {
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
  onBack?: () => void;
  onSkip?: () => void;
  helperText?: string;
}

/**
 * Sticky footer action bar for onboarding. Primary CTA is full-width
 * on mobile with a bold orange fill. Back button sits to the left
 * as a subtle outlined square.
 */
export function OnboardingFooter({
  onNext,
  nextLabel = "Continue",
  nextDisabled,
  loading,
  onBack,
  onSkip,
  helperText,
}: Props) {
  const isDev = import.meta.env.DEV;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {onBack && (
          <Button
            variant="outline"
            size="lg"
            onClick={onBack}
            className="h-12 w-12 shrink-0 p-0 sm:w-auto sm:px-5"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Back</span>
          </Button>
        )}
        <Button
          size="lg"
          onClick={onNext}
          disabled={nextDisabled || loading}
          className="h-12 flex-1 text-[15px] font-semibold shadow-[var(--shadow)]"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Saving…</span>
            </>
          ) : (
            <>
              <span>{nextLabel}</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        {helperText ? (
          <p className="text-[12px] leading-snug text-[var(--muted-foreground)]">
            {helperText}
          </p>
        ) : (
          <span />
        )}
        {isDev && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-[var(--subtle-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            Skip (dev)
          </button>
        )}
      </div>
    </div>
  );
}
