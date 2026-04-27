import { Outlet, createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import {
  OnboardingProvider,
  useOnboarding,
} from "@/components/onboarding/OnboardingProvider";

/**
 * Layout route for /onboarding/*. The hydration gate below is the fix for
 * pre-prod blocker #2 (sprint-docs/16-PRE-PROD-FIXES.md): each step's
 * useState initializers run once at mount, before getOnboardingDraftFn
 * resolves. Without the gate, returning users on a different device see
 * empty form fields even though the server has their draft. Gating the
 * step components on `hydrated` makes "resume on any device" actually work.
 */
export const Route = createFileRoute("/onboarding")({
  component: OnboardingLayout,
});

function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <HydrationGate>
        <Outlet />
      </HydrationGate>
    </OnboardingProvider>
  );
}

function HydrationGate({ children }: { children: React.ReactNode }) {
  const { hydrated } = useOnboarding();
  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--surface)] text-[var(--foreground)]">
        <Loader2
          className="size-6 animate-spin text-[var(--primary)]"
          aria-label="Loading your progress"
        />
      </div>
    );
  }
  return <>{children}</>;
}
