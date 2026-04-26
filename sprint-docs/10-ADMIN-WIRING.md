# Session 2 — Admin Portal Wiring

**Owner:** Claude Session 2
**Worktree:** `../ptl-admin` on branch `feat/admin-wiring`
**Estimate:** 8–10 hours
**Status:** Blocked on Session 1 contract lock
**Depends on:** `./12-CONTRACTS-LOCK.md` §1–6 marked LOCKED
**Read first:** `./00-ROADMAP.md`, `../05-TECH-CONTRACTS.md`, `./12-CONTRACTS-LOCK.md`

---

## 1. Scope

Replace every fixture import in `src/routes/admin/**` with a TanStack Start server function call. Wire the four-state query pattern. Do nothing else.

**In:**
- Server functions for all admin CRUD: drivers, trucks, brokers, loads, documents (admin upload), invoices (read-stub OK), pay (read-stub OK), notifications, audit
- `<QueryBoundary>` wrapper component
- Replace fixtures call-site by call-site
- Server-side mirrors of admin UI rules (completion gate, soft-warn, pay edit forbidden after completion, `pay_changed` notification fire)
- CSV export wired to real data (helper already exists from commit `31d5804`)
- Document upload from `/admin/documents` and from inside load/driver/truck details
- Admin-side document list, expiration warnings, replace flow

**Out:**
- Driver portal routes (Session 3)
- OCR (Session 3 owns the call sites; helper from Session 1 is already wired)
- Onboarding `PhotoCapture` (Session 3)
- Schema changes (orchestrator only)
- Auth UI (Session 1 owns `/login`, `/accept-invite/$token`)

---

## 2. Files owned

**Exclusive write access:**
- `src/server/functions/**` (new directory; admin-side only — driver-scoped fns belong to Session 3)
- `src/routes/admin/**` (every existing file)
- `src/components/common/QueryBoundary.tsx` (new)
- New admin-only components under `src/components/admin/**`

**Read-only:**
- `src/server/db/**`, `src/server/auth/**`, `src/server/storage/**`, `src/server/ai/**`
- `src/components/onboarding/**`
- `src/components/common/EmptyState.tsx`, `Skeleton.tsx`, `ErrorState.tsx`, `KpiCard.tsx`
- `src/lib/empty-copy.ts`
- `src/lib/fixtures/**` (delete only after every importer is converted; see §3.6)

---

## 3. Sub-tasks

### 3.1 QueryBoundary

Build the wrapper that owns the four-state pattern:

```
status === 'pending'  → <Skeleton />
status === 'error'    → <ErrorState onRetry={refetch} />
data.length === 0     → <EmptyState variant=... />
else                  → <Data />
```

Reuse Skeleton, ErrorState, EmptyState (already shipped). One day every admin route uses it.

### 3.2 Server functions per resource

One file per resource under `src/server/functions/{resource}.ts`. Pattern:

- `list{Resource}({ filters, paging })`
- `get{Resource}(id)`
- `create{Resource}(input)`
- `update{Resource}(id, patch)`
- `delete{Resource}(id)` — only where the contract permits

Every write wraps `requireAdmin()` + audit log entry.

**Resource priority (top first):**
1. drivers + trucks
2. brokers
3. loads (includes pay edit + completion gate + soft-warn)
4. documents (upload, list, expiration query)
5. notifications, audit
6. invoices, pay (read aggregates only — full invoice/pay logic is Phase 2)

### 3.3 Wire admin routes

Convert each route file to call its server function via TanStack Query + `QueryBoundary`. Delete the fixture import at the end of each conversion. Verify the empty state still fires on an empty DB.

Order matches §3.2 priority.

### 3.4 Server-side rule mirrors

Replicate UI rules so a direct API call cannot bypass them:

- `updateLoadStatus → 'completed'` throws `BusinessRuleError` when `driverPayCents IS NULL`
- `updateLoadDriverPay` throws `ForbiddenError` when `load.status === 'completed'`
- `updateLoadDriverPay` writes a `pay_changed` notification row to assigned driver on value change

All from `../05-TECH-CONTRACTS.md`. Read it before writing.

### 3.5 Document upload (admin side)

- Multi-doc-type uploader on `/admin/documents`, on `/admin/drivers/$id`, on `/admin/trucks/$id`, on `/admin/loads/$id`
- POST to a server function that calls Session 1's `uploadDoc` helper
- Insert `documents` row, return updated list
- Expiration date input where doc type is expiring (driver_cdl, driver_medical, truck_*)
- Replace flow: upload new → `deleteBlob(oldKey)` → update row

### 3.6 Fixture cleanup

Once every admin importer is converted:
- Delete `src/lib/fixtures/*` files
- Confirm no remaining importers via `grep -r 'from.*fixtures' src/`
- The `pay-period.ts` date helpers, if used, move to `src/lib/date.ts`

---

## 4. Verification

**Per-task:** `npm run typecheck && npm run build`.

**Final smoke (against deployed preview):**
- Log in as Gary
- Empty admin shell renders, every route shows an empty state
- Add a broker → it appears in list
- Add a truck → it appears in list
- Invite a driver via UI → invite token row written; URL surfaced in UI/log
- Upload a doc to a driver → blob created, row in `documents`, expiration warning fires when within 30 days
- Create a load with no `driverPayCents`, try to mark complete → blocked with toast
- Edit `driverPayCents` on a completed load → server rejects
- All 23 EMPTY_COPY surfaces still fire when their tables are empty

---

## 5. Coordination

- Need a schema change? File a request with orchestrator. Do **not** edit `src/server/db/schema.ts` yourself.
- Need an auth/storage/AI helper change? Same — orchestrator routes it to Session 1.
- Need an empty-copy key? Orchestrator owns `src/lib/empty-copy.ts`.
