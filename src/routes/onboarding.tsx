import { Outlet, createFileRoute } from "@tanstack/react-router";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";

/**
 * Layout route for /onboarding/*. Phase 1 has no auth guard yet — the
 * real route will add `beforeLoad` that requires a driver session whose
 * user.status is not "active" (active drivers should land on /dashboard).
 */
export const Route = createFileRoute("/onboarding")({
  component: OnboardingLayout,
});

function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Outlet />
    </OnboardingProvider>
  );
}
