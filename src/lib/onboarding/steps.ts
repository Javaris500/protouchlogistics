/**
 * Single source of truth for onboarding step metadata.
 * Progress bar, route guards, and review-screen cards all read from this.
 */

export const ONBOARDING_STEPS = [
  { id: "about", label: "About you", path: "/onboarding/about" },
  { id: "contact", label: "Contact", path: "/onboarding/contact" },
  { id: "cdl", label: "CDL", path: "/onboarding/cdl" },
  { id: "medical", label: "Medical card", path: "/onboarding/medical" },
  { id: "review", label: "Review", path: "/onboarding/review" },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

export const TOTAL_STEPS = ONBOARDING_STEPS.length;

export function getStepIndex(id: OnboardingStepId): number {
  return ONBOARDING_STEPS.findIndex((s) => s.id === id);
}

export function getNextStep(id: OnboardingStepId) {
  const i = getStepIndex(id);
  return i >= 0 && i < ONBOARDING_STEPS.length - 1
    ? ONBOARDING_STEPS[i + 1]
    : null;
}

export function getPrevStep(id: OnboardingStepId) {
  const i = getStepIndex(id);
  return i > 0 ? ONBOARDING_STEPS[i - 1] : null;
}
