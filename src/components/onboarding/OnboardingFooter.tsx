import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

interface Props {
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
  onBack?: () => void;
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
  helperText,
}: Props) {
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

      {helperText && (
        <p className="text-[12px] leading-snug text-[var(--muted-foreground)]">
          {helperText}
        </p>
      )}
    </div>
  );
}
