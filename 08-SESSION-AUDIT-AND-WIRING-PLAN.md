# ProTouch Logistics — Session Audit + Revised Backend Wiring Plan

**Date:** 2026-04-23
**Scope:** Mock-data strip, pay-model removal, new `load.driverPayCents` field, production empty-state foundation.
**Execution:** 6 agents via Task Master (`.taskmaster/tasks/tasks.json`), dependency path `1 → 4 → 2,5,6 parallel → 3`.
**Final state:** Typecheck + build green on merged tree.

---

## Part 1 — What shipped

| Area | State |
|---|---|
| Drivers | 3 real drivers (Reeves, Holloway, Chen); Pay column / Pay stat removed |
| Trucks | 3 (one per driver) |
| Brokers | 3 (CH Robinson, TQL, XPO) |
| Loads | 5 mixed statuses, `driverPayCents` populated (one null to exercise soft-warn) |
| Pay model | Removed everywhere — `payModel`, `payRate`, `PAY_MODEL_LABEL`, `formatPayRate` all gone |
| New pay field | `load.driverPayCents` + `driverPayUpdatedAt` — inline editable when status ≠ completed, read-only after, soft-warn on assign if blank, blocks Mark Complete if null |
| Empty states | 3-variant system live (`first-time` / `filter` / `caught-up`). All 23 surfaces wired through `EMPTY_COPY` |
| Dashboard | All 5 widgets empty, KPIs show 0 with no trend pills |
| Invoices / Pay / Docs / Analytics | All stripped, empty states (analytics page reduced from 1,730 lines to ~30) |
| Notifications + popover | Empty state wired |
| Settings / audit | Empty state wired |
| Integrations | 7 inline "Not connected" cards, `src/lib/fixtures/integrations.ts` deleted |
| Tech contracts | 7 edits + 1 bonus (auto-complete-loads cron aligned with completion gate) |

### Foundation components shipped (Agent 1)

- `src/components/common/EmptyState.tsx` — adds `variant: "first-time" | "filter" | "caught-up"`
- `src/components/common/Skeleton.tsx` — new: `Skeleton`, `TableSkeleton`, `KpiSkeleton`, `CardSkeleton`, `ChartSkeleton`
- `src/components/common/ErrorState.tsx` — new: retry button + collapsed technical details
- `src/components/common/KpiCard.tsx` — trend prop widened to `Trend | null`; exports `Trend` type
- `src/lib/empty-copy.ts` — new: `EMPTY_COPY` dictionary covering 23 surfaces

---

## Part 2 — Pay model change (locked decisions)

### Rules

- `load.driverPayCents` is admin-editable while `load.status !== 'completed'`.
- Transition to `'completed'` is blocked when `driverPayCents === null`.
- Driver view is read-only (contract — driver app not yet built).
- No adjustments / bonuses / deductions in v1. Gary edits the pay number directly until load closes.
- Pay visible to driver from the moment the load is assigned.

### Removed

- `driver_profiles.payModel`, `driver_profiles.payRate`
- `FixtureDriver.payModel`, `FixtureDriver.payRate`
- `PAY_MODEL_LABEL`, `formatPayRate()`
- `InviteDriverDialog` payModel + payRate fields (form now: email + hireDate)
- `DriversTable` Pay column, `DriverCard` Pay stat quadrant
- `driver_pay_records` table concept (replaced with read-model aggregate)

### Added

- `load.driverPayCents: int | null` (admin-editable)
- `load.driverPayUpdatedAt: timestamptz | null` (tracks edits after creation)
- Driver pay input on `/admin/loads/new` (optional)
- Driver pay display + inline edit on `/admin/loads/$loadId` (editable iff status ≠ completed)
- Soft-warning confirmation dialog on assign when `driverPayCents === null`
- Mark-Complete blocks with `toast.error` when `driverPayCents === null`
- "Updated Xh ago" meta on load detail admin side

### Deferred to backend-wiring phase (documented in contracts, not coded)

- Driver-side "Pay pending — Gary sets before pickup" empty copy
- "Updated Xh ago" display on driver view
- `pay_changed` notification fire on `driverPayCents` edit

---

## Part 3 — Verification audit

Commands run on the merged tree:

| Check | Result |
|---|---|
| `payModel` / `payRate` / `PAY_MODEL_LABEL` / `formatPayRate` residue in `src/` | **0 matches** |
| `driverPayCents` / `driverPayUpdatedAt` in `src/` | 26 refs across fixture + 3 admin routes |
| `FIXTURE_DRIVERS.length` | 3 (`dr_01`, `dr_02`, `dr_03`) |
| `FIXTURE_LOADS.length` | 5 (one with `driverPayCents: null`) |
| `FIXTURE_BROKERS.length` | 3 (`br_01`, `br_02`, `br_03`) |
| `FIXTURE_TRUCKS.length` | 3 (`tr_01`, `tr_02`, `tr_03`) |
| `EmptyState` variants present | all 3 |
| `EMPTY_COPY` required surfaces | all 23 present, 0 missing |
| `05-TECH-CONTRACTS.md` new pay contracts | 13 refs to new machinery |
| `src/lib/fixtures/integrations.ts` | deleted, no importers |
| `npm run typecheck` | clean |
| `npm run build` | success (7.27s) |

### Doc drift (follow-up, not blocking)

Pre-session docs that still reference removed pay model:

- `02-DATA-MODEL.md`
- `03-ROUTES-AND-FEATURES.md`
- `04-CREATIVE-FEATURES.md`
- `06-BACKEND-WIRING-PLAN.md`
- `06-FRONTEND-COMPONENTS.md`

Agents were strictly scoped; only `05-TECH-CONTRACTS.md` got updates. Sync these during Day 0 of backend wiring.

---

## Part 4 — Revised backend wiring plan

### 4.1 What gets simpler (from existing `06-BACKEND-WIRING-PLAN.md`)

**Day 6 (Invoices + Pay) shrinks.**

- No pay-model math — the amount is `load.driverPayCents`.
- No `driver_pay_records` snapshot table — a read model (SQL view or `payService.aggregateForDriver(driverId, period)` helper) does the grouping.
- Schema Migration 0005 becomes just `invoices` + `invoice_line_items`.
- Day 9 mandatory tests drop the "pay-model rounding" and "pay calculation" tests. Replace with:
  - `updateLoadDriverPay` forbidden on completed load
  - `updateLoadStatus` to `completed` asserts `driverPayCents != null`

### 4.2 What gets added that the plan doesn't cover

**Four-state query pattern.** Now that Agent 1 shipped `Skeleton` + `ErrorState`, every query site needs a disciplined wrapper:

```
status === 'pending'  → <Skeleton />
status === 'error'    → <ErrorState onRetry={refetch} />
data.length === 0     → <EmptyState variant=... />
else                  → <Data />
```

Build a `<QueryBoundary>` wrapper once, use everywhere. ~half a day of work, massive polish payoff.

**Server-side mirrors of admin-UI rules (Day 4).** Today's UI rules are client-side only. Server must replicate so a direct API call can't bypass:

- `updateLoadStatus → completed` throws `BusinessRuleError` when `driverPayCents is null`
- `updateLoadDriverPay` throws `ForbiddenError` when `load.status === 'completed'`
- `updateLoadDriverPay` fires `pay_changed` notification to assigned driver on value change

(Already in `05-TECH-CONTRACTS.md` after Agent 6's edits.)

**Seed script = fixture data.** The 3 drivers + 5 loads + 3 brokers + 3 trucks become `seeds/demo.ts` verbatim — don't rewrite.

### 4.3 Revised day-by-day walking order

| Day | Goal | Notable changes vs original plan |
|---|---|---|
| **0 (NEW)** | Pre-flight: doc sync, stack decisions, env keys | New half-day. Clean pay-model drift from 5 docs. Make stack decisions (below). Get env keys for Neon/Blob/Resend/Clerk-or-BetterAuth/Sentry. |
| **1** | DB + Auth + Login | Unchanged. Build missing auth pages: `/accept-invite/$token`, `/login`, `/forgot-password`, `/reset-password`. |
| **2** | Errors + Validation + Audit | Unchanged. |
| **3** | Drivers + Trucks CRUD | **Add:** move `OnboardingProvider` from sessionStorage to server-backed draft (`submitOnboardingProfile` per step). |
| **4** | Brokers + Loads | **Add:** server mirrors of soft-warn and completion-gate rules. Wire `updateLoadDriverPay`. |
| **5** | Documents + Onboarding | **Decision point:** OCR via Claude vision on upload (auto-fill CDL number, class, state, expiration + medical expiration). Add ~3 hours if yes. See §4.5. |
| **6** | Invoices + Pay | **Shrinks.** Read-model aggregate instead of snapshot table. ~2 hours reclaimed. |
| **7** | Tracking + Notifications | **Add:** `pay_changed` notification trigger. Driver-side "Pay pending" copy + "Updated Xh ago" land here with the driver app. |
| **8** | Crons + Dashboard + Polish | Dashboard wires into `<QueryBoundary>` pattern. Auto-complete-loads cron skips loads where `driverPayCents IS NULL`. |
| **9** | Testing + Hardening | Replace pay-model tests with the two new gates. Port fixture data into `seeds/demo.ts`. |
| **10** | Deploy + Handoff | Unchanged. |

### 4.4 Stack decisions that block Day 0

**A. Framework.** TanStack Start vs Next.js App Router.

- TanStack Start: keep the 35 routes as-is. Newer, less battle-tested on Vercel.
- Next.js App Router: rewrite the routes (2-3 days added). Full Vercel ecosystem (Clerk native, AI Gateway, Blob, Cache Components, Vercel Agent).
- **Recommendation:** stay on TanStack Start. The rewrite cost isn't justified for a 5-driver app.

**B. Auth.** Better Auth vs Clerk.

- Better Auth: free, self-hosted, more plumbing.
- Clerk: $25/mo, Vercel Marketplace native, invite flows built in, saves 2-3 days of auth work.
- **Recommendation:** Clerk. Pay for speed.

**C. Storage.** R2 vs Vercel Blob.

- R2: zero egress, two dashboards to manage.
- Blob: private storage now supported, unified with Vercel, tiny cost at this scale.
- **Recommendation:** Blob. Simpler.

**D. OCR on onboarding photos.** Day 5 decision.

- `PhotoCapture.tsx` currently ships a fake "Reading…" badge (`src/components/onboarding/PhotoCapture.tsx:87`).
- Real path: on `confirmDocumentUpload`, Claude vision via AI Gateway reads CDL + medical card, patches driver profile.
- Biggest UX win of the whole wiring pass. Drivers hate re-typing data off their own photo.
- **Recommendation:** do it on Day 5. ~3 hours added.

**E. Notifications delivery.** Email-only vs email + push.

- v1 at 5 drivers: they'll check email.
- **Recommendation:** email-only. Skip push.

### 4.5 Four questions that unblock Day 0

1. TanStack Start or Next.js App Router? *(lean: TanStack Start)*
2. Clerk or Better Auth? *(lean: Clerk)*
3. Vercel Blob or Cloudflare R2? *(lean: Blob)*
4. OCR on Day 5 or defer to Phase 2? *(lean: Day 5)*

Bonus:

5. Vercel CLI not installed locally. Install with `npm i -g vercel` before Day 0 — needed for `vercel env pull`, `vercel deploy`, `vercel logs`.

---

## Part 5 — Task Master execution record

File: `.taskmaster/tasks/tasks.json`

| ID | Agent | Status | Subtasks | Result |
|---|---|---|---|---|
| 1 | Foundation | done | 5 | EmptyState variants + Skeleton + ErrorState + empty-copy + KpiCard null-trend |
| 2 | Dashboard | done | 7 | All 5 widgets empty-stated, KPI trends null |
| 3 | Fleet | done | 3 | Trucks list filter-empty, truck detail 404, tracking empty |
| 4 | Drivers + Dispatch | done | 17 | Fixture trim + pay-model removal + `driverPayCents` lifecycle |
| 5 | Back office | done | 7 | Invoices / pay / docs / analytics stripped |
| 6 | Periphery | done | 6 | Notifications + settings + integrations inlined + contracts doc |

All 6 agents completed within their scope. Verification gate (`npm run typecheck` + `npm run build`) passed on every agent and on the final merged tree.

---

## Part 6 — Immediate next actions

1. **Answer the 4 stack questions** above. Unblocks Day 0.
2. **Install Vercel CLI** — `npm i -g vercel`.
3. **Assign Day 0 doc sync** — strip old pay model from the 5 drifting docs so Day 1 starts on a clean contract.
4. **Rewrite `06-BACKEND-WIRING-PLAN.md`** to reflect the revised day-by-day here (or treat this doc as the authoritative plan going forward).
