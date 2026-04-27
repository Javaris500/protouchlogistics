# Admin Wiring Prep Sketches — Session 2

Worktree-local design drafts. These are **not** committed implementations — sub-tasks 3.1+ ship after orchestrator promotes 12-CONTRACTS-LOCK §1–6 to LOCKED.

---

## 1. `<QueryBoundary>` — brief §3.1

Wrapper that owns the four-state pattern. Single source of truth for pending/error/empty handling so every admin route looks the same.

**Path:** `src/components/common/QueryBoundary.tsx` (new file; admin-routes-only consumer in this sprint)

### Signature

```ts
import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { EmptyState, type EmptyStateVariant } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { Skeleton } from "./Skeleton";
import { EMPTY_COPY, type SurfaceKey } from "@/lib/empty-copy";

interface QueryBoundaryProps<TData> {
  query: UseQueryResult<TData>;

  /** Render data when present and non-empty. */
  children: (data: TData) => ReactNode;

  /**
   * Treat `data` as empty. Defaults:
   *   - Array.isArray(data) → data.length === 0
   *   - data == null → true
   *   - else → false
   * Pass a custom predicate when the resource shape needs it (e.g. `data.items.length === 0`).
   */
  isEmpty?: (data: TData) => boolean;

  /** Empty-copy lookup key from `src/lib/empty-copy.ts`. */
  emptyKey?: SurfaceKey;

  /** Override the empty-copy variant (defaults to whatever `EMPTY_COPY[emptyKey].variant` is). */
  emptyVariant?: EmptyStateVariant;

  /** Optional CTA in the empty state (e.g. an action button). Wins over `EMPTY_COPY[emptyKey].ctaHref`. */
  emptyAction?: ReactNode;

  /** Skeleton override (defaults to a shared `<Skeleton className="h-32 w-full" />`). */
  skeleton?: ReactNode;

  /** ErrorState title override (default: "Couldn't load this section."). */
  errorTitle?: string;
}
```

### Behavior

```ts
export function QueryBoundary<TData>({
  query,
  children,
  isEmpty,
  emptyKey,
  emptyVariant,
  emptyAction,
  skeleton,
  errorTitle = "Couldn't load this section.",
}: QueryBoundaryProps<TData>) {
  // 1. Loading
  if (query.status === "pending") {
    return skeleton ?? <Skeleton className="h-32 w-full" />;
  }

  // 2. Error
  if (query.status === "error") {
    return (
      <ErrorState
        title={errorTitle}
        description={errorMessage(query.error)}        // see §1.1
        onRetry={() => query.refetch()}
        technicalDetails={errorTechnical(query.error)} // dev-only; gated by NODE_ENV
      />
    );
  }

  // 3. Empty
  const data = query.data!;
  const empty = isEmpty ? isEmpty(data) : defaultIsEmpty(data);
  if (empty && emptyKey) {
    const copy = EMPTY_COPY[emptyKey];
    return (
      <EmptyState
        title={copy.title}
        description={copy.description}
        variant={emptyVariant ?? copy.variant}
        action={emptyAction ?? renderCopyCta(copy)}
      />
    );
  }

  // 4. Data
  return <>{children(data)}</>;
}

function defaultIsEmpty(data: unknown): boolean {
  if (data == null) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === "object" && "items" in data && Array.isArray((data as any).items)) {
    return (data as any).items.length === 0;
  }
  return false;
}
```

### §1.1 Error normalizer (consumed by QueryBoundary + toasts)

`05-TECH-CONTRACTS.md §3` defines the `ApiResponse<T>` wire format. Server functions throw `AppError` subclasses; the runtime serializes them to `{ ok: false, error: { code, message, details } }`. We need a small client-side helper:

```ts
// src/lib/errors.ts (admin uses; later shared with driver)
import type { ErrorCode } from "@/server/errors";

export function errorMessage(err: unknown): string {
  // Recognized AppError shape
  if (typeof err === "object" && err && "code" in err && "message" in err) {
    const code = (err as { code: ErrorCode }).code;
    if (code === "VALIDATION_FAILED") return "Some fields were invalid. Check the form and try again.";
    if (code === "FORBIDDEN")         return "You don't have access to this action.";
    if (code === "NOT_FOUND")         return "We couldn't find what you were looking for.";
    if (code === "BUSINESS_RULE_VIOLATED") return (err as { message: string }).message;
    if (code === "RATE_LIMITED")      return "Too many requests. Try again in a few seconds.";
    if (code === "UNAUTHORIZED")      return "Your session expired. Sign in again.";
  }
  return "Something went wrong. Try again.";
}

export function errorTechnical(err: unknown): string | undefined {
  if (process.env.NODE_ENV === "production") return undefined;
  return JSON.stringify(err, null, 2);
}
```

> Note: `import type { ErrorCode } from "@/server/errors"` is a **type-only import**. TypeScript erases it at compile time, so no runtime dep on `src/server/**` is created. This is the only place admin code reaches into server types pre-unblock — keep it `import type` only.

### §1.2 Usage example (sketch only — do not commit yet)

```tsx
// src/routes/admin/drivers/index.tsx (post-conversion)
const driversQuery = useQuery({
  queryKey: ["drivers", { status }],
  queryFn: () => listDrivers({ status, paging: { cursor, limit: 50 } }),
});

return (
  <QueryBoundary
    query={driversQuery}
    emptyKey="drivers.filter"
    isEmpty={(d) => d.drivers.length === 0}
  >
    {(data) => <DriversTable drivers={data.drivers} nextCursor={data.nextCursor} />}
  </QueryBoundary>
);
```

### §1.3 Open questions for orchestrator (track; resolve before §3.1 ships)

1. Does Session 1 export `AppError` / `ErrorCode` from `src/server/errors.ts` exactly as drafted in `05-TECH-CONTRACTS §3`? If renamed, `errorMessage` switch must follow.
2. Is the ApiResponse wire shape applied automatically by TanStack Start server functions, or do callers unwrap `{ ok, data, error }` themselves? Affects the `errorMessage` input shape — adjust the type guard once Session 1 fills §2 of the contract lock.

---

## 2. Server-function file outlines (no imports yet — brief §3.2)

One file per resource under `src/server/functions/{resource}.ts`. All admin-scoped (driver-scoped variants live under `src/server/functions/driver/` and belong to Session 3 per `12-CONTRACTS-LOCK §5`).

**Pattern for every file:**

```ts
// src/server/functions/{resource}.ts
//
// Imports (post-unblock):
//   import { createServerFn } from "@tanstack/start";          // framework
//   import { z } from "zod";                                   // validation
//   import { db } from "@/server/db";                          // Session 1
//   import { requireAdmin } from "@/server/auth";              // Session 1
//   import { auditService } from "@/server/services/audit.service"; // Session 1 (or co-located here per brief §2)
//   import { AppError, BusinessRuleError, ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
//
// Pattern for every public fn:
//   1. createServerFn({ method: "POST" })
//   2. .validator(z.object({ ... }).parse)
//   3. .handler(async ({ data }) => { … })
//
// Inside .handler:
//   const ctx = await requireAdmin();          // throws Unauthorized/Forbidden
//   // resource-level authz check if scoped
//   // business-rule preconditions → throw BusinessRuleError
//   // db.transaction(async (tx) => { … }) for multi-row writes
//   // auditService.record({ userId: ctx.user.id, action, entityType, entityId, changes, … });
//   // return shaped data
```

### 2.1 `drivers.ts`

| Fn | Schema | Returns | Notes |
|---|---|---|---|
| `listDrivers` | `PaginationSchema & { status?: DriverStatus }` | `{ drivers, nextCursor }` | cursor paging; default 50 |
| `getDriver` | `{ driverId: uuid }` | `{ driver, documents, stats }` | join `documents` filtered to `owner_kind='driver'`; stats = `{ activeLoads, completedLoadsLast30, payYTDCents }` |
| `inviteDriver` | `{ email: emailZ, hireDate?: isoDate }` | `{ invite }` | calls Session 1 `inviteDriver` from `auth/`; audit `driver.invited` |
| `updateDriver` | partial `DriverProfileSchema` | `{ driver }` | audit `driver.updated` with changes diff |
| `approveDriver` | `{ driverId }` | `{ driver }` | only when status=`pending_review`; audit `driver.approved` |
| `rejectDriver` | `{ driverId, reason: nonEmptyString }` | `{ driver }` | audit `driver.rejected` |
| `suspendDriver` | `{ driverId, reason }` | `{ driver }` | audit `driver.suspended` |
| `reinstateDriver` | `{ driverId }` | `{ driver }` | audit `driver.reinstated` |
| `listPendingApprovals` | `PaginationSchema` | `{ drivers, nextCursor }` | filter status=`pending_review` |

No `createDriver` / `deleteDriver` per `05-TECH-CONTRACTS §4.1` (no self-serve signup; Phase 1 has no hard delete).

### 2.2 `trucks.ts`

| Fn | Schema | Returns | Notes |
|---|---|---|---|
| `listTrucks` | `PaginationSchema & { status? }` | `{ trucks, nextCursor }` | |
| `getTruck` | `{ truckId }` | `{ truck, documents, assignedDriver }` | |
| `createTruck` | `CreateTruckInputSchema` | `{ truck }` | audit `truck.created` |
| `updateTruck` | partial `TruckSchema` | `{ truck }` | audit `truck.updated` |
| `deleteTruck` | `{ truckId }` | `{ ok }` | soft delete; audit `truck.deleted` |
| `assignTruckToDriver` | `{ truckId, driverId }` | `{ truck }` | audit `truck.assigned` |

### 2.3 `brokers.ts`

| Fn | Schema | Returns |
|---|---|---|
| `listBrokers` | `PaginationSchema & { search? }` | `{ brokers, nextCursor }` |
| `getBroker` | `{ brokerId }` | `{ broker, scorecard, recentLoads, invoices }` |
| `createBroker` | `CreateBrokerInputSchema` | `{ broker }` |
| `updateBroker` | partial `BrokerSchema` | `{ broker }` |
| `deleteBroker` | `{ brokerId }` | `{ ok }` (soft) |

### 2.4 `loads.ts` — biggest file. Owns the rule mirrors.

| Fn | Schema | Returns | Rule mirror |
|---|---|---|---|
| `listLoadsAdmin` | `LoadListFilterSchema` | `{ loads, nextCursor }` | — |
| `getLoadAdmin` | `{ loadId }` | `{ load, stops, history, documents, breadcrumbs? }` | — |
| `createLoad` | `CreateLoadInputSchema` (incl. `driverPayCents int \| null`) | `{ load }` | audit `load.created` |
| `updateLoad` | partial `LoadSchema` (excludes `driverPayCents`) | `{ load }` | audit `load.updated` |
| `updateLoadDriverPay` | `{ loadId: uuid, driverPayCents: int.nonneg().nullable() }` | `{ load }` | **§3.4 Rule 2:** if `load.status === 'completed'` → throw `ForbiddenError("Pay is locked after a load is completed")`. **§3.4 Rule 3:** if `cents !== load.driverPayCents` → stamp `driverPayUpdatedAt = now()` AND insert `notifications` row `{ kind: 'pay_changed', userId: load.assignedDriver.userId, meta: { loadId, prior, next } }` (skip when unassigned or unchanged). audit `load.pay_updated`. |
| `assignLoad` | `AssignLoadInputSchema` | `{ load }` | preconditions per `services/loads.service.ts` excerpt: status must be `draft\|assigned`; driver compliance gate. audit `load.assigned`. |
| `unassignLoad` | `{ loadId, reason }` | `{ load }` | audit `load.unassigned` |
| `updateLoadStatus` | `UpdateLoadStatusInputSchema` | `{ load, history }` | **§3.4 Rule 1:** when transitioning to `'completed'`, assert `load.driverPayCents != null` else throw `BusinessRuleError("driver pay required before close")`. audit `load.status_changed`. |
| `cancelLoad` | `{ loadId, reason }` | `{ load }` | audit `load.cancelled` |
| `deleteLoad` | `{ loadId }` | `{ ok }` | soft delete; only when `status==='draft'` else `BusinessRuleError`. audit `load.deleted`. |

### 2.5 `documents.ts`

| Fn | Schema | Returns | Notes |
|---|---|---|---|
| `listDocuments` | `{ ownerKind?, ownerId?, type?, expiringWithinDays?: int }` | `{ documents, nextCursor }` | filter param feeds dashboard expiring widget too |
| `getDocument` | `{ documentId }` | `{ document, signedUrl }` | calls Session 1 `getSignedUrl(document.blobKey, 600)` |
| `createDocument` | `{ ownerKind, ownerId, type: DocType, file: File\|Buffer, fileName, mimeType, expirationDate?: isoDate }` | `{ document }` | calls Session 1 `uploadDoc({ ownerKind, ownerId, type, file, fileName, mimeType })` → insert row → audit `document.uploaded` |
| `replaceDocument` | `{ documentId, file, fileName, mimeType, expirationDate? }` | `{ document }` | upload new → `deleteBlob(oldKey)` → update row → audit `document.replaced`. Must run inside `db.transaction`; deleteBlob is post-commit (storage call after tx commits to avoid orphan-on-rollback). |
| `deleteDocument` | `{ documentId }` | `{ ok }` | `deleteBlob(blobKey)` after row delete. audit `document.deleted` |

### 2.6 `notifications.ts`

| Fn | Schema | Returns |
|---|---|---|
| `listNotifications` | `PaginationSchema & { unreadOnly?: bool }` | `{ notifications, nextCursor, unreadCount }` |
| `markNotificationRead` | `{ notificationId }` | `{ ok }` |
| `markAllNotificationsRead` | — | `{ ok, count }` |

(All admin-scoped. Driver-scoped variants under `src/server/functions/driver/` are Session 3.)

### 2.7 `audit.ts`

| Fn | Schema | Returns |
|---|---|---|
| `listAudit` | `{ userId?, entityType?, entityId?, action?, since?, until?, paging }` | `{ entries, nextCursor }` |

### 2.8 `invoices.ts` — read aggregates only (Phase 2 owns full lifecycle)

| Fn | Schema | Returns |
|---|---|---|
| `listInvoices` | `InvoiceFilterSchema` | `{ invoices, nextCursor }` |
| `getInvoice` | `{ invoiceId }` | `{ invoice, lineItems, broker, loads }` |
| `listCompletedLoadsForBroker` | `{ brokerId }` | `{ loads }` |

`createInvoice`, `sendInvoice`, `markInvoicePaid`, `voidInvoice`, `regenerateInvoicePdf` deferred — brief §3.2 says read-stub only.

### 2.9 `pay.ts` — read aggregates only

| Fn | Schema | Returns |
|---|---|---|
| `listPayRecordsAdmin` | `PayFilterSchema` (`{ periodStart, periodEnd, driverId? }`) | `{ records, nextCursor, totals }` |
| `exportPayCsv` | `{ periodStart, periodEnd, driverId? }` | `{ csvUrl, expiresAt }` |

### 2.10 `dashboard.ts`

| Fn | Schema | Returns |
|---|---|---|
| `getAdminDashboard` | — | `{ kpis, expiringDocs, activeLoads, recentActivity, pendingOnboardingCount }` |

(Composes from drivers/trucks/loads/documents/audit services. Implemented late so the underlying services exist first.)

---

## 3. Pending decisions / asks for orchestrator

1. **Rate limiting on writes** — `05-TECH-CONTRACTS §5/§12` lists `rate-limit` middleware. Is the limiter live in v1 or stub? Affects whether admin functions need a `rate-limit` decorator.
2. **`audit.service` location** — `05-TECH-CONTRACTS §2` puts services under `src/server/services/**`; brief §2 grants Session 2 only `src/server/functions/**`. Need confirmation that Session 1 ships `audit.service.ts` (or equivalent helper) under read-only `src/server/**`.
3. **`AppError` import path** — `@/server/errors` per the contract. Confirm Session 1 lands it there exactly.
4. **`ApiResponse<T>` envelope** — does TanStack Start auto-envelope server-fn returns, or do callers wrap manually? Same question pinged in §1.1 above — needs Session 1 answer before route wiring (3.3) starts.
5. **`getAdminDashboard` Phase 1 scope** — `tracking` widget shows live driver locations; per `00-ROADMAP §8` real GPS is Phase 2. Confirm dashboard returns an empty `liveFleet` array in Phase 1 so the empty state fires.

These don't block prep but each one becomes a real blocker the moment we start implementing. File answers in this file as orchestrator responds.
