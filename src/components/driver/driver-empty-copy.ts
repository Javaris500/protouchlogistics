import type { EmptyCopy } from "@/lib/empty-copy";

/**
 * Driver-side empty-state copy. Mirrors the four keys the orchestrator will
 * append to `src/lib/empty-copy.ts` (per `12-CONTRACTS-LOCK.md` §7 and the
 * driver brief §3.5). Kept local for now to avoid touching the shared file
 * — swap imports to `EMPTY_COPY` once the keys land.
 */
export type DriverEmptyKey =
  | "driver.todayLoad.none"
  | "driver.pay.pending"
  | "driver.documents.firstTime"
  | "driver.loads.history.empty";

export const DRIVER_EMPTY_COPY: Record<DriverEmptyKey, EmptyCopy> = {
  "driver.todayLoad.none": {
    title: "No loads assigned yet",
    description: "Gary will dispatch you when one comes in.",
    variant: "first-time",
  },
  "driver.pay.pending": {
    title: "Pay pending",
    description: "Gary sets your pay before pickup.",
    variant: "first-time",
  },
  "driver.documents.firstTime": {
    title: "Finish your DOT file",
    description:
      "Upload your CDL and medical card to finish onboarding.",
    variant: "first-time",
  },
  "driver.loads.history.empty": {
    title: "No completed loads yet",
    description: "Your delivered loads will show up here as you run them.",
    variant: "caught-up",
  },
};
