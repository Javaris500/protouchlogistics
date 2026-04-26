# Session 3 — Driver Portal + Upload UX

**Owner:** Claude Session 3
**Worktree:** `../ptl-driver` on branch `feat/driver-portal`
**Estimate:** 6–8 hours
**Status:** Blocked on Session 1 contract lock
**Depends on:** `./12-CONTRACTS-LOCK.md` §1–6 marked LOCKED
**Read first:** `./00-ROADMAP.md`, `../06-ONBOARDING-FLOW.md`, `./12-CONTRACTS-LOCK.md`

---

## 1. Scope

Build the driver-facing app from scratch. Replace the fake `PhotoCapture` with real upload + OCR. Move onboarding draft from sessionStorage to server.

**In:**
- New routes: `/driver`, `/driver/loads`, `/driver/loads/$id`, `/driver/documents`, `/driver/pay`
- New `DriverLayout` mirroring `AdminLayout` style (sidebar + topbar variants)
- Real `PhotoCapture.tsx` calling Session 1's storage helper + OCR helper
- `OnboardingProvider` server-backed via `submitOnboardingProfile` server fns
- Driver-side empty copy variants ("Pay pending — Gary sets before pickup", "Updated Xh ago")
- Hard-cap retries on OCR; fall back to manual form

**Out:**
- Admin routes (Session 2)
- Schema, auth, storage helper internals (Session 1)
- Notifications delivery, GPS, tracking pings (Phase 2)

---

## 2. Files owned

**Exclusive write access:**
- `src/routes/driver/**` (new directory)
- `src/components/driver/**` (new)
- `src/components/onboarding/PhotoCapture.tsx` (rewrite)
- `src/components/onboarding/OnboardingProvider.tsx` (move state to server)
- `src/server/functions/driver/**` (new)

**Read-only:**
- All Session 1 surfaces (`src/server/db|auth|storage|ai/**`)
- `src/components/common/**`
- `src/lib/empty-copy.ts` — append driver-side keys via orchestrator request only
- `src/routes/admin/**`, `src/components/admin/**`

---

## 3. Sub-tasks

### 3.1 Driver shell + auth gate

- `DriverLayout` reusing existing common components
- Route guard: redirect to `/login` if no session, redirect to `/admin` if `role !== 'driver'`
- Topbar: driver name, today's load card, sign out

### 3.2 Driver routes

| Route | Purpose |
|---|---|
| `/driver` | Today's load, status pill, pay (or "Pay pending" copy if null), "Updated Xh ago" |
| `/driver/loads` | Active + completed history |
| `/driver/loads/$id` | Stops, status transitions (Accept → Picked up → Delivered), BOL/POD upload |
| `/driver/documents` | Own CDL, medical, expiration warnings, replace upload |
| `/driver/pay` | Read-only weekly stub list |

Driver-scoped server functions live in `src/server/functions/driver/{resource}.ts`. Each calls `requireDriver()` and scopes queries to the session driver only.

### 3.3 Real PhotoCapture

- Replace fake "Reading…" badge
- Camera capture + file fallback
- POST to upload server fn → call Session 1's `uploadDoc(...)`
- On upload success, call OCR helper (`extractCdl` or `extractMedicalCard`) for the matching doc type
- Patch `OnboardingProvider` data with extracted fields
- Hard cap retries to 2; on failure, leave manual fields visible and clear the OCR-pending state

### 3.4 OnboardingProvider on server

- Replace `sessionStorage` with `getOnboardingDraft()` / `patchOnboardingDraft(patch)` server fns
- Tied to invited driver's session
- Resume on any device

### 3.5 Driver empty copy

File a request to orchestrator (PR comment, Slack, however we communicate) to add to `src/lib/empty-copy.ts`:

| Key | Title | Description |
|---|---|---|
| `driver.todayLoad.none` | "No loads assigned yet" | "Gary will dispatch you when one comes in." |
| `driver.pay.pending` | "Pay pending" | "Gary sets your pay before pickup." |
| `driver.documents.firstTime` | "Finish your DOT file" | "Upload your CDL and medical card to finish onboarding." |
| `driver.loads.history.empty` | "No completed loads yet" | "Your delivered loads will show up here as you run them." |

Orchestrator updates the lock + ships the keys. Do not edit `empty-copy.ts` yourself.

---

## 4. Verification

**Per-task:** `npm run typecheck && npm run build`.

**Final smoke (against deployed preview):**
- Gary invites a test driver from `/admin/drivers`
- Test driver logs in via invite link, hits onboarding
- Upload a CDL JPG → OCR fires, fields prefilled
- Upload a deliberately-blurry photo → 2 retries, then manual form fallback
- Onboarding draft resumes on a fresh browser session
- Approved driver lands on `/driver`, sees today's load (Gary assigns from admin)
- Driver marks load Picked Up → admin sees status update on next refresh
- Driver uploads BOL → blob created, document row, admin sees it on load detail

---

## 5. Coordination

- Need a schema change? Through orchestrator.
- Need a new server helper? Through orchestrator.
- Need empty-copy keys? File via orchestrator (see §3.5).
- Need a shared component edited (`EmptyState`, `Skeleton`, `KpiCard`)? Through orchestrator.
