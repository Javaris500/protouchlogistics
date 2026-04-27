import * as React from "react";

import {
  getOnboardingDraftFn,
  patchOnboardingDraftFn,
  submitOnboardingProfileFn,
} from "@/server/functions/driver/onboarding";

/**
 * Shape of the onboarding draft. Persisted server-side in
 * `onboarding_drafts` (one row per user) so the user can resume on any
 * device. Mutations are debounced (~500ms) so rapid typing doesn't fan
 * out into a request per keystroke.
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
  cdlFile?: { fileName: string; mimeType: string; fileSizeBytes: number };
  cdlNumber?: string;
  cdlClass?: "A" | "B" | "C";
  cdlState?: string;
  cdlExpiration?: string;

  // Step 4: Medical card
  medicalPhotoKey?: string;
  medicalFile?: { fileName: string; mimeType: string; fileSizeBytes: number };
  medicalExpiration?: string;
};

interface OnboardingCtx {
  data: OnboardingData;
  /** True until the initial draft fetch resolves. */
  hydrated: boolean;
  update: (patch: Partial<OnboardingData>) => void;
  /** Submit the final profile. Resolves with the new driverProfileId on success. */
  submit: () => Promise<{ driverProfileId: string }>;
  reset: () => void;
  /** Total AI helper calls used in this session — cost guardrail per contract §4. */
  aiCallsCount: number;
  recordAiCall: () => void;
}

const Context = React.createContext<OnboardingCtx | null>(null);

const AI_CALL_WARN_THRESHOLD = 4;
const PATCH_DEBOUNCE_MS = 500;

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, setData] = React.useState<OnboardingData>({});
  const [hydrated, setHydrated] = React.useState(false);
  const [aiCallsCount, setAiCallsCount] = React.useState(0);

  // Patches that have been applied to local state but not yet flushed to
  // the server. Debounce the round-trip so typing into a phone field
  // doesn't fire 10 requests.
  const pendingPatchRef = React.useRef<Partial<OnboardingData>>({});
  const flushTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    getOnboardingDraftFn()
      .then((draft) => {
        if (cancelled) return;
        if (draft) setData(draft as OnboardingData);
        setHydrated(true);
      })
      .catch(() => {
        if (cancelled) return;
        setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const flush = React.useCallback(() => {
    const patch = pendingPatchRef.current;
    pendingPatchRef.current = {};
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (Object.keys(patch).length === 0) return;
    void patchOnboardingDraftFn({
      data: { patch: patch as Record<string, unknown> },
    }).catch((err) => {
      // Non-fatal — local state is still correct, the server will catch
      // up on the next flush. Log so we notice persistent failures.
      // eslint-disable-next-line no-console
      console.warn("[onboarding] patch failed", err);
    });
  }, []);

  const update = React.useCallback(
    (patch: Partial<OnboardingData>) => {
      setData((prev) => ({ ...prev, ...patch }));
      pendingPatchRef.current = {
        ...pendingPatchRef.current,
        ...patch,
      };
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
      }
      flushTimerRef.current = window.setTimeout(flush, PATCH_DEBOUNCE_MS);
    },
    [flush],
  );

  const reset = React.useCallback(() => {
    setData({});
    setAiCallsCount(0);
    pendingPatchRef.current = {};
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  const submit = React.useCallback(async () => {
    flush();
    // Give the in-flight patch a beat to land before submit reads the row.
    await new Promise((r) => setTimeout(r, 50));
    return submitOnboardingProfileFn();
  }, [flush]);

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

  // Best-effort flush on unmount so navigating away with a pending patch
  // still persists. (The Promise from a fire-and-forget RPC will continue
  // even after this component unmounts.)
  React.useEffect(() => {
    return () => {
      flush();
    };
  }, [flush]);

  const value = React.useMemo(
    () => ({
      data,
      hydrated,
      update,
      submit,
      reset,
      aiCallsCount,
      recordAiCall,
    }),
    [data, hydrated, update, submit, reset, aiCallsCount, recordAiCall],
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
