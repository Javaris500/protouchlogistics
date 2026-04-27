# Session 3 — Orchestrator Requests

**From:** Session 3 (Driver Portal)
**To:** Orchestrator
**Filed:** 2026-04-26
**Status:** Open

Two requests filed during driver-portal sprint per `11-DRIVER-PORTAL.md` §3.5 + §5.

---

## 1. Empty-copy keys (per brief §3.5)

Append to `src/lib/empty-copy.ts`. Used by the driver portal already — currently shimmed via `src/components/driver/driver-empty-copy.ts`. Once these land, swap the imports:

| Key | Variant | Title | Description |
|---|---|---|---|
| `driver.todayLoad.none` | first-time | No loads assigned yet | Gary will dispatch you when one comes in. |
| `driver.pay.pending` | first-time | Pay pending | Gary sets your pay before pickup. |
| `driver.documents.firstTime` | first-time | Finish your DOT file | Upload your CDL and medical card to finish onboarding. |
| `driver.loads.history.empty` | caught-up | No completed loads yet | Your delivered loads will show up here as you run them. |

These match the contract lock §7 draft. Adding them lets us delete the local `driver-empty-copy.ts` shim and import from `EMPTY_COPY` directly.

---

## 2. Schema change for server-backed onboarding draft (blocks brief §3.4)

`11-DRIVER-PORTAL.md` §3.4 calls for `getOnboardingDraft()` / `patchOnboardingDraft(patch)` server fns "tied to invited driver's session" with "Resume on any device" semantics.

**Blocker:** `driver_profiles` requires firstName/lastName/dob/phone/address/cdl/medical fields as `NOT NULL` (per `src/server/db/schema/drivers.ts`). We can't create a draft profile row incrementally as the user advances through steps. There is no `onboarding_drafts` table to hold partial state, and there is no JSON column on `users`. This means the draft has no server-side home today.

**Proposed addition:** new `onboarding_drafts` table.

```ts
// src/server/db/schema/drivers.ts (or a new file imported by index.ts)
export const onboardingDrafts = pgTable("onboarding_drafts", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** JSON-encoded OnboardingData (see src/components/onboarding/OnboardingProvider.tsx). */
  data: jsonb("data").notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

Once the table lands, Session 3 will:
- Add `getOnboardingDraftFn` / `patchOnboardingDraftFn` under `src/server/functions/driver/onboarding.ts`.
- Swap `OnboardingProvider`'s sessionStorage layer for these fns (it currently persists to `window.sessionStorage`).
- Add a final-step `submitOnboardingProfileFn` that reads the draft, creates the `driver_profiles` row, creates `documents` rows for the uploaded blobs (CDL + medical), and deletes the draft.

**Impact of deferral:** sessionStorage works for tonight's demo (single browser session). Cross-device resume is the only smoke-test bullet that fails.

**Orchestrator action:** approve schema addition, generate migration via `npm run db:generate`, push to Railway, then ping Session 3 to wire the server fns.

---

## 3. Note: photo upload during onboarding uses userId as the path namespace

For visibility, not action. Onboarding photo uploads call `uploadDoc({ ownerKind: "driver", ownerId: userId, ... })` because no `driver_profiles` row exists yet (see #2). Path becomes `drivers/{userId}/driver_cdl/...` rather than the `{driverId}` convention.

When `submitOnboardingProfileFn` lands, the `documents` rows it creates will reference the existing blobKey (no re-upload). The path remains `drivers/{userId}/...` even after the driverProfile is created — once #2 lands we can decide whether that needs reconciling or if it's fine to leave (the blob URL is opaque to consumers).
