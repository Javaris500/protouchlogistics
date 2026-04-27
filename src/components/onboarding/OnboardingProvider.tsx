import * as React from "react";

/**
 * Shape of the onboarding draft. Phase 1 lives in sessionStorage only —
 * swap the persistence layer for a `saveOnboardingStep` server function
 * once Better Auth + TanStack Start are wired.
 */
export type OnboardingData = {
  // Step 1: About you
  firstName?: string;
  lastName?: string;
  dob?: string;
  phone?: string;

  // Step 2: Contact
  address?: {
    line1: string;
    city: string;
    state: string;
    zip: string;
  };
  emergency?: {
    name: string;
    phone: string;
    relation: string;
  };

  // Step 3: CDL
  cdlPhotoKey?: string;
  cdlNumber?: string;
  cdlClass?: "A" | "B" | "C";
  cdlState?: string;
  cdlExpiration?: string;

  // Step 4: Medical card
  medicalPhotoKey?: string;
  medicalExpiration?: string;
};

interface OnboardingCtx {
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => void;
  reset: () => void;
  /** Total AI helper calls used in this session — cost guardrail per contract §4. */
  aiCallsCount: number;
  recordAiCall: () => void;
}

const Context = React.createContext<OnboardingCtx | null>(null);

const STORAGE_KEY = "ptl-onboarding-draft";
const AI_CALL_WARN_THRESHOLD = 4;

function loadDraft(): OnboardingData {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OnboardingData) : {};
  } catch {
    return {};
  }
}

function persist(data: OnboardingData) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Quota exceeded or Safari private mode — non-fatal.
  }
}

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, setData] = React.useState<OnboardingData>(() => loadDraft());
  const [aiCallsCount, setAiCallsCount] = React.useState(0);

  const update = React.useCallback((patch: Partial<OnboardingData>) => {
    setData((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, []);

  const reset = React.useCallback(() => {
    setData({});
    setAiCallsCount(0);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const recordAiCall = React.useCallback(() => {
    setAiCallsCount((n) => {
      const next = n + 1;
      if (next > AI_CALL_WARN_THRESHOLD) {
        // eslint-disable-next-line no-console
        console.warn(
          `[onboarding] AI helper call count = ${next} (>${AI_CALL_WARN_THRESHOLD}). Cost guardrail per contract §4.`,
        );
      }
      return next;
    });
  }, []);

  const value = React.useMemo(
    () => ({ data, update, reset, aiCallsCount, recordAiCall }),
    [data, update, reset, aiCallsCount, recordAiCall],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useOnboarding() {
  const ctx = React.useContext(Context);
  if (!ctx) {
    throw new Error("useOnboarding must be used inside <OnboardingProvider>");
  }
  return ctx;
}
