import { type ReactNode } from "react";
import { OnboardingProgress } from "./OnboardingProgress";
import type { OnboardingStepId } from "@/lib/onboarding/steps";
import { cn } from "@/lib/utils";

interface Props {
  currentStep?: OnboardingStepId;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  hideProgress?: boolean;
}

/**
 * The outer frame for every onboarding screen. Mobile-first:
 *   - sticky header with logo + progress bar
 *   - centered scroll area capped at max-w-lg for readability
 *   - sticky footer with gradient fade
 */
export function OnboardingShell({
  currentStep,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  hideProgress,
}: Props) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--surface)] text-[var(--foreground)]">
      {/* Header — clean, minimal */}
      <header className="sticky top-0 z-20 bg-[var(--surface)]">
        <div className="mx-auto max-w-lg px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--foreground)] shadow-[var(--shadow-sm)]">
                <span className="font-mono text-[10px] font-bold tracking-wider text-[var(--background)]">
                  PTL
                </span>
              </div>
              <span className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
                ProTouch Logistics
              </span>
            </div>
            <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
              Onboarding
            </span>
          </div>
          {!hideProgress && currentStep && (
            <div className="pt-5 pb-5">
              <OnboardingProgress currentStep={currentStep} />
            </div>
          )}
          {(hideProgress || !currentStep) && <div className="pb-5" />}
        </div>
      </header>

      {/* Content — card on surface */}
      <main className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-lg flex-1 px-5 pb-8 sm:px-6">
          <div
            key={currentStep ?? "no-step"}
            className={cn(
              "animate-onboarding-in relative overflow-hidden rounded-2xl",
              "border border-[var(--border)]",
              // Proper elevation in both themes:
              //   light: white card floats above f9fafb surface
              //   dark:  #283141 card floats above #1f2937 surface (currently inverted)
              "bg-[var(--background)] dark:bg-[var(--surface-2)]",
              "dark:border-white/[0.06]",
              "p-6 sm:p-10",
              // Soft lift + 1px inner top highlight (invisible on white, premium on dark)
              "shadow-[0_4px_16px_-4px_rgba(17,24,39,0.08),0_2px_4px_-2px_rgba(17,24,39,0.04)]",
              "dark:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6),0_8px_16px_-8px_rgba(0,0,0,0.4)]",
              "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px",
              "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
              "dark:before:via-white/[0.08]",
            )}
          >
            <div className="space-y-2">
              {eyebrow && (
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
                  {eyebrow}
                </p>
              )}
              <h1 className="text-[1.625rem] font-semibold leading-[1.15] tracking-tight sm:text-[1.875rem]">
                {title}
              </h1>
              {subtitle && (
                <p className="pt-1 text-[14px] leading-relaxed text-[var(--muted-foreground)]">
                  {subtitle}
                </p>
              )}
            </div>
            <div className={cn("pt-8", !eyebrow && !subtitle && "pt-6")}>
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* Footer — gradient fade into sticky bar */}
      {footer && (
        <footer className="sticky bottom-0 z-20">
          <div className="pointer-events-none h-6 bg-gradient-to-t from-[var(--surface)] to-transparent" />
          <div className="bg-[var(--surface)]">
            <div className="mx-auto max-w-lg px-5 pb-5 sm:px-6 sm:pb-6">
              {footer}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
