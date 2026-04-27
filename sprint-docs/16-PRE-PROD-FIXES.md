# Pre-Production Fixes — `main`

**Branch:** `main` (driver-portal commit `2c16d64` cherry-picked 2026-04-27)
**Filed:** 2026-04-26
**Updated:** 2026-04-27 — orchestrator pass on Tier-1 blockers
**Source:** Code-review audit before going to production

Two tiers below. Tier 1 must be fixed before the first real driver touches the app. Tier 2 should be fixed before scaling beyond Gary plus one trusted test driver.

## Status (2026-04-27)

| # | Item | Status |
|---|---|---|
| 1 | DISPATCH_PHONE placeholder | ✓ FIXED — no separate dispatch role exists yet (Gary IS dispatch). `DISPATCH_PHONE` is now `null`, the topbar "Call dispatch" button is gated on `hasDispatch()` and hides until a real number lands. Phase 2: move onto `company_settings` so it's editable from the admin UI. |
| 2 | Onboarding draft hydration race | ✓ FIXED — `HydrationGate` in `routes/onboarding.tsx` |
| 3 | Submit-twice not guarded | ✓ FIXED — server-side idempotency check in `submitOnboardingProfileFn` returns the existing `driverProfileId` instead of erroring |
| 4 | base64 photo upload (33% inflation) | ✓ FIXED — multipart `FormData` everywhere; no JSON inflation. `uploadOnboardingPhotoFn` and `uploadDriverLoadDocFn` now take raw files |
| 5 | No rate limit on AI endpoints | ✓ FIXED — `userRateLimit` middleware (`src/server/middleware/rate-limit.ts`) applied to `uploadOnboardingPhotoFn`. Per-user bucket: 20 calls/hour. Bounds spam at ~$0.20/hour/user; legit onboarding (2–4 calls typical) sails through. In-memory single-replica per contract §5; swap to Redis when scaling horizontally. |
| 6 | No GPS verification on arrive_pickup/delivery | OPEN — Tier 2 (Phase 2 if no detention pay) |
| 7 | Driver-scoped queries fetch full `loads` row | ✓ FIXED — both `loadSummariesFor` and `getDriverLoadFn` now use explicit column projection (id, loadNumber, status, commodity, miles, driverPayCents, specialInstructions, referenceNumber, bolNumber, updatedAt + safe joins). `loads.rate`, `loads.brokerId`, `loads.createdByUserId` never enter server memory on driver queries — physical safeguard per contract §6.1. |
| 8 | Orphan blob accumulation | OPEN — Tier 2 |
| 9 | `users.status` flow not E2E verified | OPEN — needs manual smoke |
| 10 | Session driverId stale after submit | OPEN — manual smoke |

---

## 🔴 Tier 1 — Production blockers (fix tonight)

### 1. `DISPATCH_PHONE` is a placeholder

**File:** `src/lib/dispatch.ts:9`
**Current:** `export const DISPATCH_PHONE = "+15555550100";`
**Impact:** Tapping "Call dispatch" on any driver page dials a fake number.
**Fix:** Replace with Gary's real dispatch number.

### 2. Onboarding draft hydration race — "resume on any device" is half-broken

**Files:** `src/components/onboarding/OnboardingProvider.tsx`, all `src/routes/onboarding/*.tsx` step pages
**Bug:** Each step initializes local form state via `useState(data.X ?? "")`. `useState` runs the initializer once at mount — *before* the async `getOnboardingDraftFn` resolves. When the provider hydrates `data` from the server-stored draft, the form fields don't pre-fill because local state was already locked to "".
**Impact:** A returning user (different browser, different device, or just a tab close) sees an empty form even though the server has their draft.
**Fix:** The provider already exposes `hydrated: boolean`. Either:
- Render a skeleton until `hydrated === true`, then mount the step component (simplest), OR
- Add a `useEffect` in each step that syncs local state when `data` changes.

This breaks the headline feature of the schema change orchestrator just landed. Don't ship without fixing.

### 3. Submit-twice not guarded

**File:** `src/server/functions/driver/onboarding.ts` — `submitOnboardingProfileFn`
**Bug:** A double-tap on the review-page submit button (or a flaky-network retry) hits the `driver_profiles_user_id_key` unique constraint and surfaces a raw Postgres error to the user.
**Fix:** Either guard the UI (disable button + idempotency token), guard the server fn (check for existing `driver_profiles` row before insert and return its id), or wrap the unique-violation in a friendlier error.

---

## 🟡 Tier 2 — Important (fix before scaling beyond first test driver)

### 4. 25 MB photo → ~33 MB JSON body via base64

**Files:** `src/server/functions/driver/onboarding.ts` (`uploadOnboardingPhotoFn`), `src/server/functions/driver/loads.ts` (`uploadDriverLoadDocFn`)
**Bug:** Both fns accept the file as `contentBase64: string`. base64 inflates by 33%. Vercel function body limits will reject larger uploads, and the buffer round-trips through V8 string heap on the server.
**Impact:** CDL/medical photos (1–5 MB) sneak through. BOL/POD photos from a phone camera (8–15 MB common) will sometimes fail.
**Fix:** Switch to client-direct uploads. `@vercel/blob` `put({ access: "private" })` returns a signed URL that the browser uploads to directly; the server then only persists the resulting blob URL.

### 5. No rate limit on AI-spending endpoints

**File:** `src/server/functions/driver/onboarding.ts` (`uploadOnboardingPhotoFn`)
**Bug:** The fn calls `extractCdl` / `extractMedicalCard` (Anthropic via AI Gateway, paid per call). No per-user / per-IP rate limit.
**Impact:** A logged-in driver session can spam OCR. Real money.
**Fix:** Add a `rateLimit` middleware before the handler. Contract §5 punted this to "Session 2 builds them when wiring real feature endpoints" — but we're shipping AI-spending endpoints to production tonight without it. The OnboardingProvider's `>4` console.warn is a developer signal, not a money-saving control.

### 6. Status pipeline allows fake check-ins (no GPS verification)

**File:** `src/server/functions/driver/loads.ts` — `updateDriverLoadStatusFn`
**Bug:** `arrive_pickup` / `arrive_delivery` stamp `load_stops.arrivedAt`. A driver can claim arrival from anywhere — no GPS confirmation.
**Impact:** If detention pay ever depends on `arrivedAt`, this is a fraud vector.
**Fix:** When transitioning into `at_pickup` / `at_delivery`, require a client-side geolocation payload, persist into `driver_locations`, and reject the transition if the lat/lng is more than a threshold away from the stop address.
**Skip if:** detention pay isn't a current item. Flag as Phase 2.

### 7. Driver-scoped queries fetch the full `loads` row

**File:** `src/server/functions/driver/loads.ts:103-107` (`loadSummariesFor`) and line 198 (`getDriverLoadFn`)
**Bug:** Both queries `.select({ load: loads, ... })` which pulls every column from `loads` into server memory — including `loads.rate` (broker→admin amount). The DTO mapper strips it before returning so the wire response is clean, but per contract §1.x: *"Driver-scoped queries select only driver-safe columns ... physical column selection beats runtime stripping."*
**Impact:** Acceptable runtime backstop today; not contract-compliant. Future leak risk if a future change adds a field to `loads` and the DTO mapper isn't updated in lock-step.
**Fix:** Replace `load: loads` with an explicit column projection of the driver-safe fields only (`{ id: loads.id, loadNumber: loads.loadNumber, status: loads.status, commodity: loads.commodity, miles: loads.miles, driverPayCents: loads.driverPayCents, ...timestamps }`).

### 8. Orphan blob accumulation

**Files:** `src/server/functions/driver/onboarding.ts` (retake path), `submitOnboardingProfileFn` (transaction rollback)
**Bug:** Two leak paths:
- **Photo retake during onboarding** — new blob uploaded, `draft.cdlPhotoKey` overwritten, old blob never deleted.
- **Submit transaction rollback** — if `documents` insert fails after `uploadDoc` succeeded, the blob is orphaned (upload runs outside the transaction by design — that's a Vercel Blob constraint, not a Drizzle one).
**Impact:** Phase 1 leaks a small number of blobs. Costs accumulate slowly.
**Fix (Phase 2):** Reaper job that scans blobs without a corresponding `documents.blob_key` row and deletes them. Document for now.

### 9. `users.status` advancement on submit not verified end-to-end

**File:** `src/server/functions/driver/onboarding.ts` — `submitOnboardingProfileFn`
**Status:** I leave `users.status='pending_approval'` (set during accept-invite). The admin approval flow on Session 2's side is responsible for flipping it to `active`.
**Impact:** If admin approval doesn't actually flip it, drivers stay locked out of `/driver`.
**Fix:** Smoke test the full invite → onboard → admin-approve → driver-portal flow before opening to real drivers.

### 10. Session driverId not refreshed after submit

**File:** `src/server/functions/driver/onboarding.ts` — `submitOnboardingProfileFn`
**Bug:** After submit, the user's session still has `driverId: null` until the next request. `requireDriver` recomputes `driverId` from `driver_profiles.userId` on each call, so subsequent server fns work correctly. But any client-side cached session state may be stale until a navigation.
**Impact:** Edge case. TanStack Start's loader refetch handles this in practice — the user navigates to `/onboarding/pending` after submit, which is a fresh loader run.
**Fix:** Verify with a manual test. If sticky, add an explicit `refreshSession()` call after submit returns.

---

## Suggested ordering for tonight

1. Edit `src/lib/dispatch.ts` — replace `DISPATCH_PHONE`. (1 minute.)
2. Fix onboarding hydration — gate step components on `hydrated`. (15–30 minutes.)
3. Guard submit double-tap — disable the button while submitting + idempotency check on the server. (15 minutes.)
4. Smoke test the full flow end-to-end on the deployed preview before handing the URL to anyone.

Tier 2 can land in a follow-up commit on `feat/driver-portal` or as a separate hotfix branch after the demo.
