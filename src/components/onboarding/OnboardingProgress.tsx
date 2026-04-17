import { cn } from "@/lib/utils";
import {
  ONBOARDING_STEPS,
  TOTAL_STEPS,
  getStepIndex,
  type OnboardingStepId,
} from "@/lib/onboarding/steps";

interface Props {
  currentStep: OnboardingStepId;
  className?: string;
}

/**
 * Step progress indicator with labeled dots connected by bars.
 * Active step gets an orange fill + pulse ring. Completed steps
 * are solid orange. Future steps are gray.
 */
export function OnboardingProgress({ currentStep, className }: Props) {
  const currentIndex = getStepIndex(currentStep);

  return (
    <div className={cn("w-full", className)}>
      {/* Step dots + connecting lines */}
      <div
        className="flex items-center"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={currentIndex + 1}
      >
        {ONBOARDING_STEPS.map((step, i) => {
          const isComplete = i < currentIndex;
          const isActive = i === currentIndex;
          const isFuture = i > currentIndex;
          return (
            <div
              key={step.id}
              className="flex flex-1 items-center last:flex-none"
            >
              {/* Dot */}
              <div className="relative flex items-center justify-center">
                <div
                  className={cn(
                    "h-2.5 w-2.5 rounded-full transition-all duration-300",
                    isComplete && "bg-[var(--primary)]",
                    isActive &&
                      "bg-[var(--primary)] ring-[3px] ring-[var(--primary)]/20",
                    isFuture && "bg-[var(--border-strong)]",
                  )}
                />
              </div>
              {/* Connecting line (skip after last) */}
              {i < ONBOARDING_STEPS.length - 1 && (
                <div className="mx-1.5 h-[2px] flex-1 rounded-full">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isComplete ? "bg-[var(--primary)]" : "bg-[var(--border)]",
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Step labels — shown on sm+ */}
      <div className="mt-3 hidden justify-between sm:flex">
        {ONBOARDING_STEPS.map((step, i) => {
          const isComplete = i < currentIndex;
          const isActive = i === currentIndex;
          return (
            <span
              key={step.id}
              className={cn(
                "text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors",
                isActive && "text-[var(--primary)]",
                isComplete && "text-[var(--foreground)]",
                !isComplete && !isActive && "text-[var(--subtle-foreground)]",
                i === 0 && "text-left",
                i === ONBOARDING_STEPS.length - 1 && "text-right",
                i > 0 && i < ONBOARDING_STEPS.length - 1 && "text-center",
              )}
            >
              {step.label}
            </span>
          );
        })}
      </div>

      {/* Mobile: show current step only */}
      <div className="mt-2.5 flex items-baseline justify-between sm:hidden">
        <p className="text-[11px] font-semibold text-[var(--muted-foreground)]">
          Step {currentIndex + 1}{" "}
          <span className="text-[var(--subtle-foreground)]">
            of {TOTAL_STEPS}
          </span>
        </p>
        <p className="text-xs font-semibold text-[var(--primary)]">
          {ONBOARDING_STEPS[currentIndex]?.label}
        </p>
      </div>
    </div>
  );
}
