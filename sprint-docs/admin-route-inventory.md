# Admin Route Inventory — Session 2 prep

Worktree-local notes. Not committed until orchestrator unblocks (do not import from `src/server/**` until 12-CONTRACTS-LOCK §1–6 are LOCKED).

---

## 1. Routes by resource priority (brief §3.2)

Conversion order. Each row lists: route file → fixture imports it carries today → server function it will call.

### Priority 1 — drivers + trucks

| Route | Today's fixture imports | Target server fn(s) | Empty-copy key(s) |
|---|---|---|---|
| `src/routes/admin/drivers/index.tsx` | `FIXTURE_DRIVERS`, `driverNextExpiration`, `formatPhone` from `@/lib/fixtures/drivers` | `listDrivers({ status?, paging })` | `drivers.filter` |
| `src/routes/admin/drivers/pending.tsx` | (none today; reads `FIXTURE_PENDING_ONBOARDING_COUNT` indirectly through dashboard) — re-verify on conversion | `listPendingApprovals(paging)` | `drivers.pending` |
| `src/routes/admin/drivers/$driverId.tsx` | `FIXTURE_DRIVERS`, `formatPhone` (drivers); `FIXTURE_LOADS` (loads) | `getDriver({ driverId })` (returns `{ driver, documents, stats }`); admin-side load slice via `listLoadsAdmin({ assignedDriverId })` | (detail page; n/a) |
| `src/routes/admin/trucks/index.tsx` | `FIXTURE_TRUCKS`, `FixtureTruck` | `listTrucks({ status?, paging })` | `trucks.firstTime`, `trucks.filter` |
| `src/routes/admin/trucks/$truckId.tsx` | `FIXTURE_TRUCKS` | `getTruck({ truckId })` | (detail) |

### Priority 2 — brokers

| Route | Imports | Target | Empty-copy |
|---|---|---|---|
| `src/routes/admin/brokers/index.tsx` | `FIXTURE_BROKERS`, helpers | `listBrokers({ search?, paging })` | `brokers.firstTime`, `brokers.filter` |
| `src/routes/admin/brokers/$brokerId.tsx` | `FIXTURE_BROKERS` (broker), `FIXTURE_INVOICES`, `FIXTURE_LOADS` | `getBroker({ brokerId })` returns scorecard, recent loads, invoices | (detail) |

### Priority 3 — loads (incl. pay edit + completion gate + soft-warn — §3.4)

| Route | Imports | Target | Empty-copy |
|---|---|---|---|
| `src/routes/admin/loads/index.tsx` | `FIXTURE_LOADS`, `FixtureLoad` | `listLoadsAdmin(LoadListFilterSchema)` | `loads.firstTime`, `loads.filter` |
| `src/routes/admin/loads/$loadId.tsx` | `FIXTURE_LOADS`, `FixtureLoad`; mutates `driverPayCents` + `driverPayUpdatedAt` locally | `getLoadAdmin({ loadId })`, `updateLoadDriverPay`, `assignLoad`, `unassignLoad`, `updateLoadStatus`, `cancelLoad` | `load.breadcrumbs` |
| `src/routes/admin/loads/new.tsx` | `FIXTURE_DRIVERS`, `FIXTURE_LOADS`, `FIXTURE_TRUCKS`; submits `driverPayCents` | `createLoad(CreateLoadInputSchema)` + drop-down sources from `listDrivers`/`listTrucks`/`listBrokers` | n/a |

**Server-side rule mirrors (all from `05-TECH-CONTRACTS.md` §9.5):**

1. `updateLoadStatus → 'completed'` MUST throw `BusinessRuleError("driver pay required before close")` when `load.driverPayCents IS NULL`. Mapped to a toast by the error normalizer.
2. `updateLoadDriverPay` MUST throw `ForbiddenError` when `load.status === 'completed'`.
3. `updateLoadDriverPay` MUST stamp `driverPayUpdatedAt = now()` on any change to the stored value AND fire a `pay_changed` notification row to the assigned driver (no-op when unassigned or value unchanged). Payload includes `loadId`, prior cents, new cents.
4. `getLoadDriver` (driver-scoped — Session 3 owns the route, but our admin getter must keep its admin-only fields intact) returns `driverPayCents` + `driverPayUpdatedAt` to drivers; broker, rate, admin-only fields remain stripped.

### Priority 4 — documents (admin upload — §3.5)

| Route | Imports | Target | Empty-copy |
|---|---|---|---|
| `src/routes/admin/documents.tsx` | (none; renders empty today) | `listDocuments(filter)`, `createDocument` (calls Session 1 `uploadDoc`), `deleteDocument`, `replaceDocument` | `documents.firstTime` |
| `src/routes/admin/drivers/$driverId.tsx` (uploader inset) | — | `createDocument({ ownerKind: 'driver', ownerId, type, file, expirationDate? })` | — |
| `src/routes/admin/trucks/$truckId.tsx` (uploader inset) | — | `createDocument({ ownerKind: 'truck', … })` | — |
| `src/routes/admin/loads/$loadId.tsx` (uploader inset) | — | `createDocument({ ownerKind: 'load', … })` | — |

**Replace flow:** new upload via `uploadDoc` → `deleteBlob(oldKey)` → update row. Expiration input shows for `driver_cdl`, `driver_medical`, `truck_*` types. 30-day warning is a UI computation against `documents.expirationDate`.

### Priority 5 — notifications + audit

| Route | Imports | Target | Empty-copy |
|---|---|---|---|
| `src/routes/admin/notifications.tsx` | (none) | `listNotifications`, `markNotificationRead`, `markAllRead` | `notifications.firstTime` |
| `src/routes/admin/settings/audit.tsx` | (none) | `listAudit({ filter, paging })` | `settings.audit.firstTime` |

### Priority 6 — invoices + pay (read aggregates only)

| Route | Imports | Target | Empty-copy |
|---|---|---|---|
| `src/routes/admin/invoices/index.tsx` | (none today) | `listInvoices(InvoiceFilterSchema)` | `invoices.firstTime` |
| `src/routes/admin/invoices/new.tsx` | (none) | `listCompletedLoadsForBroker({ brokerId })` (read-stub) | `invoiceNew.noUnbilled` |
| `src/routes/admin/invoices/$invoiceId.tsx` | `FIXTURE_INVOICES` | `getInvoice({ invoiceId })` (read-stub) | (detail) |
| `src/routes/admin/pay.tsx` | (none today) | `listPayRecordsAdmin(PayFilterSchema)` (read-aggregate) | `pay.firstTime` |
| `src/routes/admin/pay.$periodId.tsx` | (none) | `listPayRecordsAdmin({ periodStart, periodEnd })` + `exportPayCsv` (already wired client-side via commit `31d5804`) | (detail) |

### Other routes (no fixture imports today, but still need server-fn wiring)

| Route | Target | Empty-copy |
|---|---|---|
| `src/routes/admin/dashboard.tsx` | `getAdminDashboard()` returns `{ kpis, expiringDocs, activeLoads, recentActivity }` | `dashboard.activeLoads`, `dashboard.expiringDocs`, `dashboard.activity`, `dashboard.onboardingQueue`, `dashboard.liveFleet` |
| `src/routes/admin/index.tsx` | redirect → `/admin/dashboard` | n/a |
| `src/routes/admin/analytics.tsx` | (analytics fixtures already empty arrays — verify, then either point at a stub `getAnalytics()` server fn or leave-as-is per §1) | `analytics.needsData` |
| `src/routes/admin/tracking.tsx` | `getActiveDriverLocations()` (Phase 1 stub) | `tracking.firstTime` |
| `src/routes/admin/settings.tsx` + `settings/{index,integrations,preferences}.tsx` | static / `getCompanySettings`, `updateCompanySettings` (read-stub fine) | `settings.integrations.none` |

---

## 2. Fixture file → who still uses it

`grep -rln "FIXTURE_\|fixtures/" src/routes/admin src/components` (run 2026-04-26):

- `brokers.ts` → `brokers/{index,$brokerId}.tsx`
- `dashboard.ts` → `dashboard.tsx`
- `documents.ts` → no admin importers (types only — `DocType`, `DOC_TYPE_LABELS`, `docCategory` are referenced widely)
- `drivers.ts` → `drivers/{index,$driverId}.tsx`, `loads/new.tsx`
- `invoices.ts` → `invoices/$invoiceId.tsx`, `brokers/$brokerId.tsx`
- `loads.ts` → `loads/{index,$loadId,new}.tsx`, `drivers/$driverId.tsx`, `brokers/$brokerId.tsx`
- `trucks.ts` → `trucks/{index,$truckId}.tsx`, `loads/new.tsx`
- `analytics.ts` → none in admin routes today (verify before delete)

**Type bleed risk:** `BrokerGrade`, `PaymentTerms`, `FixtureBroker`, `FixtureDriver`, `FixtureLoad`, `FixtureStop`, `FixtureTruck`, `FixtureInvoice`, `FixtureDocument`, `DocType`, `DocCategory`, `DOC_TYPE_LABELS`, `docCategory`, `formatPhone`, `gradeTone`, `formatRatePerMile`, `brokerById`, `driverNextExpiration`, `PAYMENT_TERMS_LABEL` are exported from fixtures and consumed by routes/components. When deleting fixtures (§3.6):
- Domain types (`Broker`, `Driver`, `Load`, `Truck`, `Invoice`, `Document`, `DocType`) come from `src/server/db/schema.ts` (Session 1) — re-export through a shared types module the routes can import.
- Pure helpers (`formatPhone`, `gradeTone`, `formatRatePerMile`, `driverNextExpiration`) move to `src/lib/format.ts` or `src/lib/date.ts`.
- `brokerById` is a fixture-only lookup; replaced by `getBroker`.

---

## 3. CSV export (brief §1, in-scope)

Helper from commit `31d5804`. Audit caller sites:

```
grep -rln "downloadCsv\|exportPay\|exportCsv" src/
```

Wire the data sources through `listPayRecordsAdmin` / `exportPayCsv` once unblocked. Today they reference fixtures or empty arrays — verify per call site.

---

## 4. Out-of-scope reminders

- Driver routes: Session 3 (do not touch `src/routes/driver/**` if it appears).
- OCR call sites: Session 3 owns; AI helper from Session 1 already wired by contract.
- Onboarding `PhotoCapture`: Session 3.
- Schema changes: orchestrator only (file request via brief §5).
- `/login`, `/accept-invite/$token`: Session 1 owns.
- Empty-copy keys: orchestrator owns `src/lib/empty-copy.ts`. If a new key is needed, file via orchestrator.

---

## 5. Verification gate per task

`npm run typecheck && npm run build` before marking any sub-task done. Push to `feat/admin-wiring`. Do not merge to main.
