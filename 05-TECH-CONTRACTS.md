# ProTouch Logistics — Technical Contracts & Patterns

The source of truth for how the backend is structured. Read this before writing any server function.

## Table of contents

1. [Core principles](#1-core-principles)
2. [Project structure](#2-project-structure)
3. [Error hierarchy](#3-error-hierarchy)
4. [Session + auth context](#4-session--auth-context)
5. [Middleware stack](#5-middleware-stack)
6. [Authorization helpers](#6-authorization-helpers)
7. [Server function pattern](#7-server-function-pattern)
8. [Validation strategy](#8-validation-strategy)
9. [Full contract catalog](#9-full-contract-catalog)
10. [File upload pattern](#10-file-upload-pattern)
11. [GPS tracking endpoint](#11-gps-tracking-endpoint)
12. [Rate limiting](#12-rate-limiting)
13. [Audit logging](#13-audit-logging)
14. [Error → UI mapping](#14-error--ui-mapping)
15. [Logging & observability](#15-logging--observability)
16. [Testing expectations](#16-testing-expectations)

---

## 1. Core principles

1. **Server functions are the API.** No separate REST layer, no tRPC. TanStack Start server functions are our "endpoints." They're type-safe across the client/server boundary.
2. **Every mutation is a transaction** when it touches more than one row.
3. **Every mutation writes an audit log row.** Not optional.
4. **Every server function has a single responsibility.** No "mega" functions with if/else branching into different flows.
5. **Zod validates every input, every time.** Client validation is for UX; server validation is for correctness.
6. **Money is integer cents or basis points.** No floats, no strings, no BigNumber library in Phase 1.
7. **Fail loudly in dev, gracefully in prod.** Errors bubble to a typed error handler that renders toasts/banners client-side and logs to Sentry server-side.
8. **Authorization is enforced in three places:** route `beforeLoad`, middleware, and explicit helpers inside handlers for resource-level checks.

---

## 2. Project structure

```
src/
├── db/
│   ├── index.ts                    # db client
│   └── schema/                     # Drizzle schema (see separate package)
├── server/
│   ├── auth/
│   │   ├── index.ts                # Better Auth setup
│   │   ├── session.ts              # session helpers
│   │   └── middleware.ts           # auth middleware
│   ├── errors.ts                   # error classes + formatter
│   ├── middleware/
│   │   ├── request-context.ts      # ip extraction (first in stack)
│   │   ├── auth.ts                 # require-session, require-role
│   │   ├── audit.ts                # audit log wrapper
│   │   └── rate-limit.ts
│   ├── authorize/
│   │   ├── loads.ts                # can-driver-access-load, etc
│   │   ├── drivers.ts
│   │   ├── documents.ts
│   │   └── index.ts
│   ├── services/                   # business logic
│   │   ├── loads.service.ts
│   │   ├── drivers.service.ts
│   │   ├── trucks.service.ts
│   │   ├── brokers.service.ts
│   │   ├── documents.service.ts
│   │   ├── invoices.service.ts
│   │   ├── pay.service.ts
│   │   ├── tracking.service.ts
│   │   ├── notifications.service.ts
│   │   └── audit.service.ts
│   ├── schemas/                    # shared Zod schemas
│   │   ├── common.ts               # uuid, money, state, etc
│   │   ├── loads.ts
│   │   ├── drivers.ts
│   │   ├── trucks.ts
│   │   └── ...
│   ├── functions/                  # server functions (the "API")
│   │   ├── loads/
│   │   │   ├── list.ts
│   │   │   ├── get.ts
│   │   │   ├── create.ts
│   │   │   ├── assign.ts
│   │   │   ├── update-status.ts
│   │   │   └── ...
│   │   ├── drivers/
│   │   ├── trucks/
│   │   └── ...
│   ├── jobs/                       # cron + queued jobs
│   │   ├── expiration-check.ts            # nightly: doc expiration alerts
│   │   ├── auto-complete-loads.ts         # hourly: pod_uploaded >24h → completed
│   │   ├── invoice-overdue-check.ts       # nightly: sent invoices past dueDate → overdue
│   │   ├── weekly-settlements.ts          # Friday 5PM: driver settlement PDFs
│   │   ├── pod-delivery.ts                # triggered: assemble + email POD to broker
│   │   ├── orphan-upload-reaper.ts        # nightly 03:00: deletes R2 objects with no documents row >24h old
│   │   ├── cleanup-driver-locations.ts    # Phase 1 stub; Phase 2 enforces retention policy
│   │   └── ...
│   ├── integrations/
│   │   ├── mapbox.ts
│   │   ├── google-places.ts
│   │   ├── resend.ts
│   │   ├── storage.ts              # Cloudflare R2
│   │   └── claude.ts               # AI features
│   └── env.ts                      # typed env vars (via T3 env or similar)
├── lib/
│   ├── money.ts
│   ├── dates.ts
│   ├── phones.ts
│   └── constants.ts
├── routes/                         # TanStack file-based routes
└── components/
```

**Rule: functions are thin, services are fat.** Server functions handle auth, validation, and response shaping. Services contain the business logic. Same service function may be called from a server function, a cron job, or another service.

---

## 3. Error hierarchy

`src/server/errors.ts`

```ts
export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "BUSINESS_RULE_VIOLATED"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;
  readonly cause?: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    details?: Record<string, unknown>,
    cause?: unknown
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.cause = cause;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You must be signed in") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have access to this resource") {
    super("FORBIDDEN", message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("VALIDATION_FAILED", message, 400, details);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("BUSINESS_RULE_VIOLATED", message, 422, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("CONFLICT", message, 409, details);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number) {
    super("RATE_LIMITED", "Too many requests", 429, { retryAfterSeconds });
  }
}

/**
 * The wire format. Everything thrown in a server function is converted to this
 * shape before being sent to the client.
 */
export type ErrorResponse = {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    // eventId is the Sentry event id for support tickets
    eventId?: string;
  };
};

export type SuccessResponse<T> = {
  ok: true;
  data: T;
};

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
```

**Rule: never throw raw Error in server functions.** Always throw a subclass of `AppError`. If you catch an unknown error (DB error, 3rd party API failure), wrap it:

```ts
try {
  await someExternalCall();
} catch (err) {
  throw new AppError("INTERNAL", "Failed to reach external service", 500, { service: "mapbox" }, err);
}
```

---

## 4. Session + auth context

`src/server/auth/session.ts`

```ts
import type { User, DriverProfile } from "@/db/schema";

export type AuthContext =
  | { kind: "unauthenticated" }
  | {
      kind: "admin";
      session: { id: string; userId: string };
      user: User;
    }
  | {
      kind: "driver";
      session: { id: string; userId: string };
      user: User;
      driverProfile: DriverProfile;
    };

export async function getAuthContext(): Promise<AuthContext> {
  const raw = await betterAuth.getSession();
  if (!raw) return { kind: "unauthenticated" };

  const user = await db.query.users.findFirst({ where: eq(users.id, raw.userId) });
  if (!user) return { kind: "unauthenticated" };

  if (user.role === "admin") {
    return { kind: "admin", session: raw, user };
  }

  const driverProfile = await db.query.driverProfiles.findFirst({
    where: eq(driverProfiles.userId, user.id),
  });

  if (!driverProfile) {
    // Driver user without a profile row - onboarding not started
    return { kind: "driver", session: raw, user, driverProfile: null as never };
  }

  return { kind: "driver", session: raw, user, driverProfile };
}
```

**Why a discriminated union:** TypeScript narrows `ctx.kind === "admin"` to guarantee `ctx.user.role === 'admin'` without runtime checks. Narrow once, use everywhere.

### 4.1 No landing page, no self-serve signup

PTL is a private internal platform. There is no public registration endpoint, no landing page, no "Sign up" link anywhere in the UI. The full unauthenticated surface is exactly:

- `/login` (sole entry)
- `/forgot-password`
- `/reset-password?token=...`
- `/invite/$token` (driver-only, via email invite from Gary)

The root path `/` is a server-side redirect, not a rendered page (`06-FRONTEND-COMPONENTS.md §2.0`). Accounts exist only because:

1. **Gary's admin account** is bootstrap-seeded on first deploy (§4.2 below).
2. **Driver accounts** are created by Gary via `inviteDriver`, which inserts a `users` row with `status='invited'` and a one-time `invites` token.

Any server function that could create a `users` row (beyond `acceptInvite` and the bootstrap script) must not exist in Phase 1. Reject at code review. Adding a self-serve path is a Phase 2 scope decision, not a patch.

### 4.2 Bootstrap admin seed (`seeds/bootstrap.ts`)

Gary's admin credentials are not created through the UI and not committed to source. They are provisioned **once** on first production deploy from environment variables, then the env vars are removed.

**Env vars (prod-only, consumed once):**

```
BOOTSTRAP_ADMIN_EMAIL=          # Gary's email, e.g. gary@protouchlogistics.com
BOOTSTRAP_ADMIN_PASSWORD=       # initial password, min 14 chars, high entropy
BOOTSTRAP_ADMIN_FIRST_NAME=     # "Gary"
BOOTSTRAP_ADMIN_LAST_NAME=      # "Tavel"
BOOTSTRAP_COMPANY_NAME=         # "ProTouch Logistics"
BOOTSTRAP_COMPANY_TIMEZONE=     # e.g. "America/Chicago"
```

**Script contract (`seeds/bootstrap.ts`):**

```ts
import { db } from "@/db";
import { users, companySettings } from "@/db/schema";
import { betterAuth } from "@/server/auth";
import { auditService } from "@/server/services/audit.service";
import { env } from "@/server/env";

export async function bootstrap() {
  if (env.NODE_ENV === "development") {
    throw new Error("Refusing to run bootstrap in development. Use seeds/demo.ts.");
  }

  const required = [
    "BOOTSTRAP_ADMIN_EMAIL",
    "BOOTSTRAP_ADMIN_PASSWORD",
    "BOOTSTRAP_ADMIN_FIRST_NAME",
    "BOOTSTRAP_ADMIN_LAST_NAME",
    "BOOTSTRAP_COMPANY_NAME",
    "BOOTSTRAP_COMPANY_TIMEZONE",
  ] as const;
  for (const k of required) {
    if (!process.env[k]) throw new Error(`Bootstrap requires env var ${k}`);
  }

  // Idempotent: if any admin already exists, do nothing.
  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.role, "admin"),
  });
  if (existingAdmin) {
    console.log(`Admin already exists (${existingAdmin.email}); bootstrap is a no-op.`);
    return { created: false };
  }

  // Create admin via Better Auth so the password is hashed the same way as runtime sign-ins.
  const created = await betterAuth.api.signUpEmail({
    body: {
      email: env.BOOTSTRAP_ADMIN_EMAIL,
      password: env.BOOTSTRAP_ADMIN_PASSWORD,
      name: `${env.BOOTSTRAP_ADMIN_FIRST_NAME} ${env.BOOTSTRAP_ADMIN_LAST_NAME}`,
    },
  });

  // Flip role + status after sign-up (Better Auth defaults are driver-safe).
  await db
    .update(users)
    .set({
      role: "admin",
      status: "active",
      emailVerified: true,
      twoFactorEnabled: false,
    })
    .where(eq(users.id, created.user.id));

  await db.insert(companySettings).values({
    name: env.BOOTSTRAP_COMPANY_NAME,
    timezone: env.BOOTSTRAP_COMPANY_TIMEZONE,
  });

  await auditService.record({
    userId: null, // system action
    action: "bootstrap_admin_created",
    entityType: "user",
    entityId: created.user.id,
    changes: { context: "First-run bootstrap. Env-provisioned admin." },
    ipAddress: null,
    userAgent: "seeds/bootstrap.ts",
  });

  return { created: true, userId: created.user.id };
}

if (import.meta.main) {
  bootstrap().then((r) => {
    console.log("Bootstrap complete:", r);
    process.exit(0);
  }).catch((e) => {
    console.error("Bootstrap failed:", e);
    process.exit(1);
  });
}
```

**Operational rules:**

- Bootstrap runs as a one-off Vercel deploy hook or `npm run bootstrap` against prod — **not** on every boot, not inside request handling, not via middleware.
- The script is **idempotent**. A second run with an existing admin exits quietly with `{created: false}`.
- After bootstrap succeeds:
  1. Gary signs in at `/login` with the bootstrap credentials.
  2. He is shown a non-dismissable banner: "Change your password and enable 2FA before using the app."
  3. Both `/settings` password change and 2FA setup are forced before the banner clears (`users.firstLoginCompletedAt` is set when both actions succeed).
  4. Operator deletes `BOOTSTRAP_ADMIN_PASSWORD` from the hosting env (Vercel dashboard).

**Schema addendum to `02-DATA-MODEL.md §1 users`:**
Add `firstLoginCompletedAt` — nullable `timestamptz`. Set when a user (a) has rotated their bootstrap/invite password AND (b) on admins, has enabled 2FA. Middleware `requireAdminReady` redirects admin users to `/settings/force-rotate` when null.

**No self-serve admin creation.** Additional admins (Phase 2) will be added via a `createAdmin` server function callable only by an existing admin — not through sign-up. That function does not exist in Phase 1.

### 4.3 Better Auth → audit_log bridge

Better Auth owns login, logout, password reset, and 2FA flows — our server-function audit middleware never runs on those. Without this bridge, `user.login`, `user.logout`, and `user.password_reset_requested` are listed in the action catalog but nothing writes them. Wire Better Auth's lifecycle hooks to `auditService.record()` at setup:

```ts
// src/server/auth/index.ts
import { betterAuth } from "better-auth";
import * as auditService from "../services/audit.service";

export const auth = betterAuth({
  // ...
  hooks: {
    onSignIn: async ({ user, request }) => {
      await auditService.record({
        userId: user.id,
        action: "user.login",
        entityType: "user",
        entityId: user.id,
        changes: { context: { method: "password" } },
        ipAddress: request.headers.get("x-forwarded-for"),
      });
    },
    onSignOut: async ({ user, request }) => {
      await auditService.record({
        userId: user.id,
        action: "user.logout",
        entityType: "user",
        entityId: user.id,
        ipAddress: request.headers.get("x-forwarded-for"),
      });
    },
    onPasswordResetRequest: async ({ email, request }) => {
      // userId may be null if email doesn't exist - that's intentional (no enumeration)
      await auditService.record({
        userId: null,
        action: "user.password_reset_requested",
        entityType: "user",
        entityId: null,
        changes: { context: { email } },
        ipAddress: request.headers.get("x-forwarded-for"),
      });
    },
    onPasswordReset: async ({ user, request }) => {
      await auditService.record({
        userId: user.id,
        action: "user.password_reset_completed",
        entityType: "user",
        entityId: user.id,
        ipAddress: request.headers.get("x-forwarded-for"),
      });
    },
  },
});
```

**Rule:** if you add a new Better Auth flow (magic link, social login, 2FA enrollment), add the corresponding hook — or the event disappears from the audit trail silently.

---

## 5. Middleware stack

TanStack Start middleware chains via `.middleware([...])` on `createServerFn`. Our stack:

**Stack order (required):** `requestContext → rateLimit → auth → roleNarrow (adminOnly/driverOnly) → audit`. Anything that reads `context.requestContext` (rate-limit keys falling back to IP, audit row IP/UA) must come *after* `requestContext`.

`src/server/middleware/request-context.ts`

```ts
import { createMiddleware } from "@tanstack/react-start";

/**
 * Entry point for every server function. Populates context.requestContext.ipAddress
 * from headers so downstream middleware (rate-limit fallback, audit row) can read it.
 * MUST be first in the middleware chain.
 */
export const requestContextMiddleware = createMiddleware().server(async ({ next, request }) => {
  const ipAddress =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;

  return next({ context: { requestContext: { ipAddress } } });
});
```

`src/server/middleware/auth.ts`

```ts
import { createMiddleware } from "@tanstack/react-start";
import { UnauthorizedError, ForbiddenError } from "../errors";
import { getAuthContext } from "../auth/session";

/**
 * Guarantees authenticated. Populates context.auth.
 */
export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const auth = await getAuthContext();
  if (auth.kind === "unauthenticated") {
    throw new UnauthorizedError();
  }
  return next({ context: { auth } });
});

/**
 * Narrows to admin only. Must come after authMiddleware.
 */
export const adminOnly = createMiddleware()
  .middleware([authMiddleware])
  .server(async ({ context, next }) => {
    if (context.auth.kind !== "admin") {
      throw new ForbiddenError("Admin access required");
    }
    // Narrowing: downstream handlers get context.auth typed as admin variant
    return next({ context: { auth: context.auth } });
  });

/**
 * Narrows to driver with completed onboarding + active status.
 */
export const driverOnly = createMiddleware()
  .middleware([authMiddleware])
  .server(async ({ context, next }) => {
    if (context.auth.kind !== "driver") {
      throw new ForbiddenError("Driver access required");
    }
    if (!context.auth.driverProfile) {
      throw new ForbiddenError("Driver profile required");
    }
    if (context.auth.user.status !== "active") {
      throw new ForbiddenError("Account not active");
    }
    return next({ context: { auth: context.auth } });
  });

/**
 * Allows either admin or driver. Used for shared endpoints like "get load"
 * where both can access but with different data shapes.
 */
export const requireAuth = authMiddleware;
```

`src/server/middleware/audit.ts`

```ts
import { createMiddleware } from "@tanstack/react-start";
import { auditLog } from "@/db/schema";
import { db } from "@/db";

/**
 * Writes to audit_log after a successful handler. Handler can set auditContext
 * on the returned object to enrich the log row.
 *
 * By default logs: userId, action (function name), entityType, entityId, before/after.
 */
export function auditMiddleware(opts: {
  action: string;
  entityType: string;
  // Extract entity id from the result (for creates) or input (for updates/deletes)
  entityIdFromResult?: (result: unknown) => string | null;
  entityIdFromInput?: (input: unknown) => string | null;
  // For updates: service returns { before, after }; middleware records both.
  // When present, overrides the default input+result capture so the audit row
  // stores a proper diff instead of just the patch payload.
  captureBeforeAfter?: (result: unknown) => { before: unknown; after: unknown };
}) {
  return createMiddleware().server(async ({ context, next, data }) => {
    const result = await next();

    try {
      const changes = opts.captureBeforeAfter
        ? (() => {
            const { before, after } = opts.captureBeforeAfter!(result.result);
            return {
              before: sanitizeForAudit(before),
              after: sanitizeForAudit(after),
              context: { input: sanitizeForAudit(data) },
            };
          })()
        : {
            input: sanitizeForAudit(data),
            result: sanitizeForAudit(result.result),
          };

      await db.insert(auditLog).values({
        userId: context.auth?.kind !== "unauthenticated" ? context.auth.user.id : null,
        action: opts.action,
        entityType: opts.entityType,
        entityId:
          opts.entityIdFromResult?.(result.result) ??
          opts.entityIdFromInput?.(data) ??
          null,
        changes,
        ipAddress: context.requestContext?.ipAddress ?? null,
      });
    } catch (err) {
      // Audit failures log to Sentry but don't break the caller.
      Sentry.captureException(err, { extra: { audit_op: opts.action } });
    }

    return result;
  });
}

/**
 * Strips passwords, tokens, anything that shouldn't be in the audit record.
 */
function sanitizeForAudit(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  const BLOCKED = ["password", "passwordHash", "token", "secret", "twoFactorSecret"];
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (BLOCKED.includes(k)) continue;
    cleaned[k] = typeof v === "object" ? sanitizeForAudit(v) : v;
  }
  return cleaned;
}
```

`src/server/middleware/rate-limit.ts`

```ts
import { createMiddleware } from "@tanstack/react-start";
import { RateLimitError } from "../errors";

// Simple in-memory for Phase 1 (single-instance deployment).
// Swap to Upstash Redis at Phase 2 if we scale horizontally.
const buckets = new Map<string, { count: number; resetAt: number }>();

// Periodic eviction of expired buckets so the Map doesn't grow unbounded.
// WARNING: this in-memory store is SINGLE-REPLICA ONLY. Deploying to >1 node
// (horizontal scale, rolling deploy with overlap) gives each replica its own
// bucket state — a 5-req/min limit becomes 5*N. Swap to Upstash Redis or a
// Postgres-backed counter before scaling horizontally.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 60_000).unref();

export function rateLimit(opts: {
  keyPrefix: string;
  limit: number;
  windowMs: number;
  keyFromContext: (ctx: { auth: AuthContext; requestContext?: { ipAddress?: string } }, data: unknown) => string;
}) {
  return createMiddleware().server(async ({ context, data, next }) => {
    const key = `${opts.keyPrefix}:${opts.keyFromContext(context, data)}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }

    if (bucket.count >= opts.limit) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      throw new RateLimitError(retryAfter);
    }

    bucket.count++;
    return next();
  });
}
```

---

## 6. Authorization helpers

Middleware handles coarse access (is logged in, is admin). Resource-level access requires looking at the specific entity, so it's an explicit call inside the handler.

`src/server/authorize/loads.ts`

```ts
import type { AuthContext } from "../auth/session";
import { ForbiddenError, NotFoundError } from "../errors";
import { db } from "@/db";

/**
 * Returns the load if the auth principal is allowed to see it.
 * Throws NotFoundError if it doesn't exist OR the driver doesn't own it
 * (security: don't leak existence to unauthorized parties).
 */
export async function authorizeLoadRead(auth: AuthContext, loadId: string) {
  const load = await db.query.loads.findFirst({
    where: and(eq(loads.id, loadId), isNull(loads.deletedAt)),
    with: { stops: true, broker: true, assignedDriver: true, assignedTruck: true },
  });

  if (!load) throw new NotFoundError("Load");

  if (auth.kind === "admin") return load;

  if (auth.kind === "driver") {
    if (load.assignedDriverId !== auth.driverProfile.id) {
      throw new NotFoundError("Load"); // intentional: don't leak existence
    }
    return stripSensitiveFieldsForDriver(load);
  }

  throw new ForbiddenError();
}

/**
 * For mutations. Stricter - driver can only mutate if assigned AND load is active.
 */
export async function authorizeLoadStatusUpdate(
  auth: AuthContext,
  loadId: string
) {
  const load = await authorizeLoadRead(auth, loadId);

  if (auth.kind === "driver") {
    const terminalStatuses = ["completed", "cancelled", "pod_uploaded"];
    if (terminalStatuses.includes(load.status)) {
      throw new ForbiddenError("Load is already closed");
    }
  }

  return load;
}

/**
 * Fields a driver should never see. Strip before returning.
 */
export function stripSensitiveFieldsForDriver<T extends { rate?: unknown; broker?: unknown }>(
  load: T
): Omit<T, "rate" | "broker"> {
  const { rate, broker, ...rest } = load;
  return rest;
}
```

`src/server/authorize/documents.ts`

```ts
export async function authorizeDocumentRead(auth: AuthContext, docId: string) {
  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, docId),
  });
  if (!doc) throw new NotFoundError("Document");

  if (auth.kind === "admin") return doc;

  if (auth.kind === "driver") {
    // Driver can see their own driver docs, and docs on loads assigned to them
    if (doc.driverProfileId === auth.driverProfile.id) return doc;

    if (doc.loadId) {
      const load = await db.query.loads.findFirst({
        where: eq(loads.id, doc.loadId),
      });
      if (load?.assignedDriverId === auth.driverProfile.id) {
        // But NOT rate confirmations - those are admin-only
        if (doc.type === "load_rate_confirmation") throw new NotFoundError("Document");
        return doc;
      }
    }
  }

  throw new NotFoundError("Document");
}
```

**Rule: `authorizeXRead` / `authorizeXMutate` at the top of every handler that touches resource X.** No exceptions.

### 6.1 Driver-view queries (preferred over runtime strip)

Runtime field-stripping helpers like `stripSensitiveFieldsForDriver` are a **transitional backstop**, not the primary safeguard. Every time a developer adds a new query path and forgets to call the strip helper, rate/broker data leaks to drivers. The existence of the helper doesn't prevent the leak; it just documents that someone remembered.

Preferred pattern: dedicated query functions in the service layer that physically select only driver-safe columns. If the shape never contains `rate` or `broker`, there's nothing to accidentally leak:

```ts
// src/server/services/loads.service.ts

// Admin-facing: full row, all relations
export async function getLoadAdmin(loadId: string) {
  return db.query.loads.findFirst({
    where: and(eq(loads.id, loadId), isNull(loads.deletedAt)),
    with: { stops: true, broker: true, assignedDriver: true, assignedTruck: true },
  });
}

// Driver-facing: explicit column list, NO broker or rate
export async function getLoadDriverView(loadId: string, driverProfileId: string) {
  return db.query.loads.findFirst({
    where: and(
      eq(loads.id, loadId),
      eq(loads.assignedDriverId, driverProfileId),
      isNull(loads.deletedAt),
    ),
    columns: {
      id: true, loadNumber: true, status: true,
      commodity: true, weight: true, pieces: true,
      specialInstructions: true, referenceNumber: true, bolNumber: true,
      assignedTruckId: true,
      createdAt: true, updatedAt: true,
      // NOTE: rate, brokerId, createdByUserId, deletedAt intentionally excluded.
    },
    with: { stops: true, assignedTruck: true }, // NO broker relation
  });
}
```

Apply the same pattern for `documents` (driver never sees rate cons), `invoices` (driver never sees any), `pay_records` (driver sees their own, stripped of broker/rate). The runtime strip helpers remain available for unusual join shapes but are not the default.

### 6.2 Two-factor secret encryption

`users.twoFactorSecret` is sensitive — anyone with DB read access could generate valid TOTP codes and bypass 2FA entirely. Encrypt at the application layer with AES-256-GCM:

```ts
// src/lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const KEY = Buffer.from(process.env.TWO_FACTOR_ENCRYPTION_KEY!, "base64");
if (KEY.length !== 32) {
  throw new Error("TWO_FACTOR_ENCRYPTION_KEY must be 32 bytes (base64-encoded)");
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: v1.<iv>.<tag>.<ciphertext>  (all base64)
  return `v1.${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decryptSecret(stored: string): string {
  const [version, ivB64, tagB64, ctB64] = stored.split(".");
  if (version !== "v1") throw new Error(`Unknown secret version: ${version}`);
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
```

The `v1.` prefix is deliberate — rotating `TWO_FACTOR_ENCRYPTION_KEY` without re-enrolling every 2FA user requires key versioning. Phase 1 ships v1 only; Phase 2 can add v2 + a dual-read/single-write migration window.

Generate a key with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and store in `TWO_FACTOR_ENCRYPTION_KEY`. Never commit it.

---

## 7. Server function pattern

The canonical shape. Copy-paste for every new function.

```ts
// src/server/functions/loads/assign.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminOnly } from "@/server/middleware/auth";
import { auditMiddleware } from "@/server/middleware/audit";
import * as loadsService from "@/server/services/loads.service";
import { AssignLoadInputSchema, AssignLoadResultSchema } from "@/server/schemas/loads";

export const assignLoad = createServerFn({ method: "POST" })
  .middleware([
    adminOnly,
    auditMiddleware({
      action: "load.assign",
      entityType: "load",
      entityIdFromInput: (input: any) => input.loadId,
    }),
  ])
  .validator(AssignLoadInputSchema)
  .handler(async ({ data, context }): Promise<z.infer<typeof AssignLoadResultSchema>> => {
    return loadsService.assignDriverAndTruck({
      loadId: data.loadId,
      driverId: data.driverId,
      truckId: data.truckId,
      actingUserId: context.auth.user.id,
    });
  });
```

And the service, where business rules live:

```ts
// src/server/services/loads.service.ts
import { BusinessRuleError, NotFoundError } from "../errors";
import { db } from "@/db";
import * as driversService from "./drivers.service";
import * as notificationsService from "./notifications.service";

export async function assignDriverAndTruck(input: {
  loadId: string;
  driverId: string;
  truckId?: string;
  actingUserId: string;
}) {
  const result = await db.transaction(async (tx) => {
    const load = await tx.query.loads.findFirst({ where: eq(loads.id, input.loadId) });
    if (!load) throw new NotFoundError("Load");
    if (load.status !== "draft" && load.status !== "assigned") {
      throw new BusinessRuleError("Can only reassign loads in draft or assigned status", {
        currentStatus: load.status,
      });
    }

    const { canAcceptNewLoads, expiredDocs } =
      await driversService.checkComplianceStatus(input.driverId, tx);

    if (!canAcceptNewLoads) {
      throw new BusinessRuleError(
        "Driver has expired documents and cannot accept new loads",
        { expiredDocs }
      );
    }

    const [updated] = await tx
      .update(loads)
      .set({
        assignedDriverId: input.driverId,
        assignedTruckId: input.truckId ?? null,
        status: "assigned",
      })
      .where(eq(loads.id, input.loadId))
      .returning();

    await tx.insert(loadStatusHistory).values({
      loadId: input.loadId,
      fromStatus: load.status,
      toStatus: "assigned",
      changedByUserId: input.actingUserId,
    });

    return updated;
  });

  // Post-commit side effects. Drizzle has NO tx.onCommit hook — if we fire
  // inside the closure and the tx rolls back, the notification has already
  // gone out. Always run side effects AFTER transaction resolution.
  await notificationsService.sendLoadAssigned(result);

  return result;
}
```

**Rules:**
- Handler is <15 lines
- All business logic in service
- Service accepts optional `tx` parameter for composition
- Notifications, emails, and queued jobs fire *after* the transaction resolves, never inside the tx closure. Drizzle has no `tx.onCommit` hook — capture the result, then fire side effects.
- Any service that revokes a user's access (suspend, reject, role-change, account-delete) MUST also call Better Auth's `invalidateUserSessions(userId)` in the same service function. Without it, a suspended driver keeps working until their session cookie naturally expires — up to 30 days.

---

## 8. Validation strategy

### 8.1 Shared schemas

`src/server/schemas/common.ts`

```ts
import { z } from "zod";

export const UuidSchema = z.string().uuid();
export const MoneyCents = z.number().int().nonnegative();
export const UsStateSchema = z.string().length(2).regex(/^[A-Z]{2}$/);
export const ZipSchema = z.string().regex(/^\d{5}(-\d{4})?$/);

export const PhoneE164Schema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "Phone must be in E.164 format (+15551234567)");

export const EmailSchema = z.string().email().transform((s) => s.toLowerCase().trim());

export const AddressSchema = z.object({
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).nullable().default(null),
  city: z.string().min(1).max(100),
  state: UsStateSchema,
  zip: ZipSchema,
});

export const GeoCoordSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
});

export const PaginationSchema = z.object({
  cursor: z.string().nullable().default(null),
  limit: z.number().int().min(1).max(100).default(25),
});

export const DateRangeSchema = z
  .object({
    start: z.coerce.date(),
    end: z.coerce.date(),
  })
  .refine((d) => d.end >= d.start, { message: "end must be >= start" });
```

### 8.2 Domain schemas

Every service/function has a matching `server/schemas/{entity}.ts` file. These schemas are the single source of truth and are imported by both server functions AND client forms.

```ts
// src/server/schemas/loads.ts
import { z } from "zod";
import { UuidSchema, MoneyCents, AddressSchema } from "./common";

export const CreateLoadInputSchema = z.object({
  brokerId: UuidSchema,
  pickup: z.object({
    companyName: z.string().max(200).nullable(),
    address: AddressSchema,
    windowStart: z.coerce.date(),
    windowEnd: z.coerce.date(),
    contactName: z.string().max(200).nullable(),
    contactPhone: z.string().max(20).nullable(),
    notes: z.string().max(1000).nullable(),
  }),
  delivery: z.object({ /* same shape */ }),
  commodity: z.string().min(1).max(200),
  weight: z.number().int().positive().nullable(),
  pieces: z.number().int().positive().nullable(),
  rate: MoneyCents,
  miles: z.number().int().positive().nullable(),
  referenceNumber: z.string().max(100).nullable(),
  bolNumber: z.string().max(100).nullable(),
  specialInstructions: z.string().max(2000).nullable(),
  assignedDriverId: UuidSchema.nullable(),
  assignedTruckId: UuidSchema.nullable(),
}).refine(
  (d) => d.pickup.windowEnd >= d.pickup.windowStart,
  { message: "Pickup window end must be >= start", path: ["pickup", "windowEnd"] }
).refine(
  (d) => d.delivery.windowEnd >= d.delivery.windowStart,
  { message: "Delivery window end must be >= start", path: ["delivery", "windowEnd"] }
).refine(
  (d) => d.delivery.windowStart >= d.pickup.windowStart,
  { message: "Delivery cannot be before pickup", path: ["delivery", "windowStart"] }
);

export const AssignLoadInputSchema = z.object({
  loadId: UuidSchema,
  driverId: UuidSchema,
  truckId: UuidSchema.optional(),
});

export const UpdateLoadStatusInputSchema = z.object({
  loadId: UuidSchema,
  toStatus: LoadStatusEnum,
  reason: z.string().max(500).nullable().default(null),
  location: GeoCoordSchema.nullable().default(null),
});
```

### 8.3 Validation layers

Three layers of validation, different purposes:

1. **Client form validation** — UX. Instant feedback. Uses same Zod schemas as the server via TanStack Form's `validators.onChange: zodValidator(schema)`.
2. **Server function `.validator(schema)`** — correctness. Runs before the handler. On fail, returns `ValidationError` with `details.fieldErrors` shaped for form consumption.
3. **Database constraints** — last line of defense. Check constraints, unique indexes, FK constraints. These catch race conditions and bypassed paths.

### 8.4 Field error shape

When Zod fails on the server, we convert to this shape:

```ts
type FieldErrors = {
  _errors: string[];                    // top-level errors (form-wide)
  [field: string]: FieldErrors | string[] | undefined;
};
```

Produced by:

```ts
function zodToFieldErrors(err: z.ZodError): FieldErrors {
  const tree: FieldErrors = { _errors: [] };
  for (const issue of err.issues) {
    let cursor: any = tree;
    for (const segment of issue.path) {
      cursor[segment] ??= { _errors: [] };
      cursor = cursor[segment];
    }
    cursor._errors ??= [];
    cursor._errors.push(issue.message);
  }
  return tree;
}
```

The framework error handler catches `ZodError` specifically and returns:

```ts
{
  ok: false,
  error: {
    code: "VALIDATION_FAILED",
    message: "Request validation failed",
    details: { fieldErrors: zodToFieldErrors(err) }
  }
}
```

Client form code uses `details.fieldErrors` to highlight bad fields.

### 8.5 Numeric input gotcha

HTML number inputs return strings. Coerce in the schema:

```ts
// Good
rate: z.coerce.number().int().nonnegative()

// Money inputs (user types dollars, DB stores cents):
rateDollars: z.coerce.number().nonnegative()
  .transform((n) => Math.round(n * 100)),
```

Do the dollars→cents transform **once** at the schema boundary, never in the handler.

### 8.6 Date handling

- **Wire format:** ISO 8601 strings with timezone (`2026-03-14T09:00:00-05:00`).
- **Validation:** `z.coerce.date()` on inputs, `z.date()` on outputs.
- **Storage:** Always UTC (`timestamptz` in Postgres handles this).
- **Display:** Always convert to the viewing user's timezone. For admin, use company TZ. For driver, use the driver's local TZ (we can infer from browser or store on profile).

Create one util and use it everywhere:

```ts
// src/lib/dates.ts
export function toCompanyTz(date: Date): Date { /* ... */ }
export function toUserTz(date: Date, tz: string): Date { /* ... */ }
export function formatInTz(date: Date, tz: string, format: string): string { /* ... */ }
```

Use `date-fns-tz`. Never roll your own.

---

## 9. Full contract catalog

Below is every server function in Phase 1 with input/output schemas. Names are `camelCase`, files are `kebab-case`.

### 9.1 Auth

| Function | Middleware | Input | Output |
|---|---|---|---|
| `login` | rate-limit | `{ email, password }` | `{ user, redirectTo }` |
| `logout` | auth | — | `{ ok: true }` |
| `requestPasswordReset` | rate-limit | `{ email }` | `{ ok: true }` (always, no enumeration) |
| `resetPassword` | — | `{ token, newPassword }` | `{ ok: true }` |
| `acceptInvite` | — | `{ token, password }` | `{ user, driverProfile }` |
| `enable2FA` | adminOnly | — | `{ qrDataUrl, backupCodes }` |
| `verify2FA` | adminOnly | `{ code }` | `{ ok: true }` |

### 9.2 Drivers

| Function | Middleware | Input | Output |
|---|---|---|---|
| `inviteDriver` | adminOnly, audit | `{ email, hireDate, payModel, payRate }` | `{ invite }` |
| `listPendingApprovals` | adminOnly | `PaginationSchema` | `{ drivers[], nextCursor }` |
| `approveDriver` | adminOnly, audit | `{ driverId }` | `{ driver }` |
| `rejectDriver` | adminOnly, audit | `{ driverId, reason }` | `{ driver }` |
| `listDrivers` | adminOnly | `PaginationSchema & { status? }` | `{ drivers[], nextCursor }` |
| `getDriver` | adminOnly | `{ driverId }` | `{ driver, documents, stats }` |
| `updateDriver` | adminOnly, audit | partial `DriverProfileSchema` | `{ driver }` |
| `suspendDriver` | adminOnly, audit | `{ driverId, reason }` | `{ driver }` |
| `reinstateDriver` | adminOnly, audit | `{ driverId }` | `{ driver }` |
| `submitOnboardingProfile` | authenticated | profile step schemas | `{ driverProfile }` |
| `submitOnboardingForReview` | authenticated | — | `{ driverProfile }` |
| `getMyProfile` | driverOnly | — | `{ driver, documents }` |
| `updateMyProfile` | driverOnly, audit | limited fields | `{ driver }` |

### 9.3 Trucks

| Function | Middleware | Input | Output |
|---|---|---|---|
| `createTruck` | adminOnly, audit | `CreateTruckInputSchema` | `{ truck }` |
| `listTrucks` | adminOnly | `PaginationSchema & { status? }` | `{ trucks[], nextCursor }` |
| `getTruck` | adminOnly | `{ truckId }` | `{ truck, documents, assignedDriver }` |
| `updateTruck` | adminOnly, audit | partial `TruckSchema` | `{ truck }` |
| `deleteTruck` | adminOnly, audit | `{ truckId }` | `{ ok: true }` (soft delete) |
| `assignTruckToDriver` | adminOnly, audit | `{ truckId, driverId }` | `{ truck }` |

### 9.4 Brokers

| Function | Middleware | Input | Output |
|---|---|---|---|
| `createBroker` | adminOnly, audit | `CreateBrokerInputSchema` | `{ broker }` |
| `listBrokers` | adminOnly | `PaginationSchema & { search? }` | `{ brokers[], nextCursor }` |
| `getBroker` | adminOnly | `{ brokerId }` | `{ broker, scorecard, recentLoads, invoices }` |
| `updateBroker` | adminOnly, audit | partial `BrokerSchema` | `{ broker }` |
| `deleteBroker` | adminOnly, audit | `{ brokerId }` | `{ ok: true }` (soft delete) |

### 9.5 Loads

| Function | Middleware | Input | Output |
|---|---|---|---|
| `createLoad` | adminOnly, audit | `CreateLoadInputSchema` | `{ load }` |
| `listLoadsAdmin` | adminOnly | `LoadListFilterSchema` | `{ loads[], nextCursor }` |
| `listLoadsDriver` | driverOnly | `{ status?, limit? }` | `{ loads[] }` (stripped) |
| `getLoadAdmin` | adminOnly | `{ loadId }` | `{ load, stops, history, documents, breadcrumbs? }` |
| `getLoadDriver` | driverOnly | `{ loadId }` | `{ load, stops, documents }` (stripped) |
| `updateLoad` | adminOnly, audit | partial `LoadSchema` | `{ load }` |
| `assignLoad` | adminOnly, audit | `AssignLoadInputSchema` | `{ load }` |
| `unassignLoad` | adminOnly, audit | `{ loadId, reason }` | `{ load }` |
| `updateLoadStatus` | auth, audit | `UpdateLoadStatusInputSchema` | `{ load, history }` |
| `cancelLoad` | adminOnly, audit | `{ loadId, reason }` | `{ load }` |
| `deleteLoad` | adminOnly, audit | `{ loadId }` | `{ ok }` (soft delete, only if draft) |

### 9.6 Documents

| Function | Middleware | Input | Output |
|---|---|---|---|
| `requestUploadUrl` | auth | `{ type, fileName, mimeType, fileSizeBytes }` | `{ uploadUrl, fileKey, expiresAt }` |
| `confirmDocumentUpload` | auth, audit | `ConfirmUploadInputSchema` | `{ document }` |
| `listDocuments` | auth | `{ driverId?, truckId?, loadId?, type? }` | `{ documents[] }` |
| `getDocumentSignedUrl` | auth | `{ documentId }` | `{ url, expiresAt }` |
| `deleteDocument` | adminOnly, audit | `{ documentId }` | `{ ok }` |

### 9.7 Tracking

| Function | Middleware | Input | Output |
|---|---|---|---|
| `postLocation` | driverOnly, rate-limit | `PostLocationInputSchema` | `{ ack, currentStatus }` |
| `getActiveDriverLocations` | adminOnly | — | `{ drivers[] }` |
| `getLoadBreadcrumbs` | auth | `{ loadId }` | `{ points[] }` |

### 9.8 Invoices

| Function | Middleware | Input | Output |
|---|---|---|---|
| `listCompletedLoadsForBroker` | adminOnly | `{ brokerId }` | `{ loads[] }` |
| `createInvoice` | adminOnly, audit | `CreateInvoiceInputSchema` | `{ invoice }` |
| `listInvoices` | adminOnly | `InvoiceFilterSchema` | `{ invoices[], nextCursor }` |
| `getInvoice` | adminOnly | `{ invoiceId }` | `{ invoice, lineItems, broker, loads }` |
| `updateInvoice` | adminOnly, audit | `UpdateInvoiceInputSchema` | `{ invoice }` (draft only) |
| `sendInvoice` | adminOnly, audit | `{ invoiceId }` | `{ invoice, pdfUrl }` |
| `markInvoicePaid` | adminOnly, audit | `MarkInvoicePaidInputSchema` | `{ invoice }` |
| `voidInvoice` | adminOnly, audit | `{ invoiceId, reason }` | `{ invoice }` |
| `regenerateInvoicePdf` | adminOnly, audit | `{ invoiceId }` | `{ pdfUrl }` |

### 9.9 Pay

| Function | Middleware | Input | Output |
|---|---|---|---|
| `getMyPay` | driverOnly | `{ periodStart?, periodEnd? }` | `{ records[], periodTotalCents, ytdTotalCents }` |
| `getMyPayRecord` | driverOnly | `{ recordId }` | `{ record, load (stripped) }` |
| `listPayRecordsAdmin` | adminOnly | `PayFilterSchema` | `{ records[], nextCursor }` |
| `adjustPayRecord` | adminOnly, audit | `AdjustPayInputSchema` | `{ record }` |
| `markPayRecordPaid` | adminOnly, audit | `{ recordId, paidAt }` | `{ record }` |
| `exportPayCsv` | adminOnly | `{ periodStart, periodEnd, driverId? }` | `{ csvUrl, expiresAt }` |

### 9.10 Notifications

| Function | Middleware | Input | Output |
|---|---|---|---|
| `listMyNotifications` | auth | `{ onlyUnread?, limit? }` | `{ notifications[], unreadCount }` |
| `markNotificationRead` | auth | `{ notificationId }` | `{ notification }` |
| `markAllNotificationsRead` | auth | — | `{ updatedCount }` |

### 9.11 Dashboards

| Function | Middleware | Input | Output |
|---|---|---|---|
| `getAdminDashboard` | adminOnly | — | `{ kpis, expiringDocs, activeLoads, recentActivity }` |
| `getDriverDashboard` | driverOnly | — | `{ currentLoad, nextLoad, alerts }` |
| `getWallData` | displayToken | `{ token }` | `{ kpis, activeDrivers, activeLoads }` |

### 9.12 Settings & audit

| Function | Middleware | Input | Output |
|---|---|---|---|
| `getCompanySettings` | adminOnly | — | `{ settings }` |
| `updateCompanySettings` | adminOnly, audit | `CompanySettingsSchema` | `{ settings }` |
| `listAuditLog` | adminOnly | `AuditFilterSchema` | `{ entries[], nextCursor }` |
| `listDisplayTokens` | adminOnly | — | `{ tokens[] }` |
| `createDisplayToken` | adminOnly, audit | `{ name, expiresInDays }` | `{ token (once), tokenMeta }` |
| `revokeDisplayToken` | adminOnly, audit | `{ tokenId }` | `{ ok }` |

### 9.13 Sequence generation (load + invoice numbers)

`loadNumber` (`PTL-YYYY-####`) and `invoiceNumber` (`PTL-INV-YYYY-####`) both reset January 1. Two concurrent creates generated naively via `SELECT MAX() + 1` will collide on the `####` suffix — Gary creates a load from the UI while the rate-con ingest pipeline creates another at the same instant, and one of them gets `PTL-2026-0042` twice.

**Approach: Postgres advisory lock inside the create transaction.** One lock per `(entity, year)` pair so loads and invoices don't serialize against each other, and the lock releases automatically on commit or rollback.

```ts
// src/server/services/sequence.service.ts
import { sql, like } from "drizzle-orm";
import type { Database } from "@/db";
import { loads, invoices } from "@/db/schema";

const LOCK_NAMESPACE = {
  load: 1001,
  invoice: 1002,
} as const;

export async function nextNumber(
  tx: Database,
  kind: "load" | "invoice",
  year: number
): Promise<string> {
  // Advisory lock keyed by (namespace, year). Released at tx end, no cleanup.
  await tx.execute(sql`SELECT pg_advisory_xact_lock(${LOCK_NAMESPACE[kind]}, ${year})`);

  const prefix = kind === "load" ? `PTL-${year}-` : `PTL-INV-${year}-`;
  const table = kind === "load" ? loads : invoices;
  const column = kind === "load" ? loads.loadNumber : invoices.invoiceNumber;

  const [row] = await tx
    .select({ last: sql<string>`MAX(${column})` })
    .from(table)
    .where(like(column, `${prefix}%`));

  const lastSeq = row?.last ? parseInt(row.last.slice(prefix.length), 10) : 0;
  const next = String(lastSeq + 1).padStart(4, "0");
  return `${prefix}${next}`;
}
```

Call from inside the create transaction, before the insert:

```ts
// loads.service.ts createLoad
return db.transaction(async (tx) => {
  const loadNumber = await nextNumber(tx, "load", new Date().getFullYear());
  const [row] = await tx.insert(loads).values({ ...input, loadNumber }).returning();
  return row;
});
```

**Why advisory lock over a Postgres sequence:** sequences don't reset yearly without a cron job or pre-created sequences per year. Advisory lock + `MAX()` is one line of infra, handles year rollover implicitly (Dec 31 at 23:59:59 and Jan 1 at 00:00:00 just look up different prefixes), and the lock is held for microseconds inside an already-fast create tx.

---

## 10. File upload pattern

**Browser → Storage → Server confirmation.** Never proxy files through our server.

### 10.1 Flow

```
1. Client calls requestUploadUrl({ type, fileName, mimeType, fileSizeBytes })
2. Server validates: size < 25MB, mime is allowed, type is valid, user is allowed to upload
3. Server generates a presigned PUT URL to R2 with 5-min expiry
4. Server returns { uploadUrl, fileKey, expiresAt }
5. Client PUTs the file directly to the presigned URL
6. On success, client calls confirmDocumentUpload({ fileKey, type, driverId?/truckId?/loadId?, expirationDate? })
7. Server:
   - HEAD the object in storage to verify existence + actual size + content-type
   - Reject if the actual file doesn't match what was promised
   - Insert `documents` row
   - Trigger side effects (e.g., POD auto-email)
```

### 10.2 Validation

- Allowed MIMEs: `application/pdf`, `image/jpeg`, `image/png`, `image/heic`, `image/webp`
- Max size: 25 MB
- **Re-validate the actual uploaded file**, not just what the client claimed. Browsers can lie.
- File keys are scoped: `documents/{type}/{yyyy}/{mm}/{random32}.{ext}`. Never use user-provided file names in the key.

### 10.3 Access

- All document URLs are signed, 15-minute TTL
- Regenerate on every read (don't cache signed URLs in the DB)
- Thumbnail generation is Phase 2; serve originals for now
- **`getDocumentSignedUrl` MUST call `authorizeDocumentRead(auth, docId)` before minting a URL.** The middleware is `auth` (any logged-in user) — without the explicit resource-level check, any driver with a guessed doc ID can mint URLs for rate confirmations they shouldn't see.

### 10.4 Orphan cleanup

The two-step upload (`requestUploadUrl` → PUT → `confirmDocumentUpload`) leaves orphans in storage if step 3 never fires — browser crash, driver abandons upload, network drop mid-confirm. A nightly job sweeps them:

```ts
// src/server/jobs/orphan-upload-reaper.ts
export async function reapOrphanUploads() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60_000);
  const storageKeys = await storage.listPrefix("documents/");
  const dbKeys = new Set(
    (await db.select({ fileKey: documents.fileKey }).from(documents))
      .map((r) => r.fileKey)
  );

  const orphans = storageKeys.filter(
    (obj) => !dbKeys.has(obj.key) && obj.lastModified < cutoff
  );

  for (const orphan of orphans) {
    await storage.delete(orphan.key);
  }

  return { reaped: orphans.length };
}
```

Runs at 03:00 admin-TZ via the same cron infrastructure as expiration checks.

---

## 11. GPS tracking endpoint

`postLocation` is the hottest endpoint. Rules:

### 11.1 Input

```ts
export const PostLocationInputSchema = z.object({
  loadId: UuidSchema,
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  accuracyMeters: z.number().positive().nullable(),
  headingDegrees: z.number().gte(0).lt(360).nullable(),
  speedMps: z.number().gte(0).nullable(),
  recordedAt: z.coerce.date(),
});
```

### 11.2 Server behavior

```ts
export const postLocation = createServerFn({ method: "POST" })
  .middleware([
    driverOnly,
    rateLimit({
      keyPrefix: "track",
      limit: 4,           // 4/min is plenty for 45s cadence + bursts
      windowMs: 60_000,
      keyFromContext: (ctx) => ctx.auth.driverProfile.id,
    }),
  ])
  .validator(PostLocationInputSchema)
  .handler(async ({ data, context }) => {
    // Authorization: driver owns this load AND load is in a tracking-active status
    const load = await authorizeLoadRead(context.auth, data.loadId);
    const TRACKING_STATUSES = [
      "accepted", "en_route_pickup", "at_pickup", "loaded",
      "en_route_delivery", "at_delivery",
    ];
    if (!TRACKING_STATUSES.includes(load.status)) {
      // Return a signal telling the client to stop posting
      return { ack: false, currentStatus: load.status };
    }

    // Reject timestamps more than 2 minutes in the future, or older than 10 minutes
    const now = Date.now();
    const recorded = data.recordedAt.getTime();
    if (recorded > now + 2 * 60_000 || recorded < now - 10 * 60_000) {
      throw new ValidationError("recordedAt is outside acceptable window");
    }

    // Idempotency: UNIQUE(driverProfileId, loadId, recordedAt) prevents
    // double-writes from client retries (spotty cellular is the norm). See
    // 02-DATA-MODEL.md §7.
    await db.insert(driverLocations).values({
      driverProfileId: context.auth.driverProfile.id,
      loadId: data.loadId,
      lat: data.lat.toFixed(7),
      lng: data.lng.toFixed(7),
      accuracyMeters: data.accuracyMeters,
      headingDegrees: data.headingDegrees,
      speedMps: data.speedMps,
      recordedAt: data.recordedAt,
    }).onConflictDoNothing({
      target: [
        driverLocations.driverProfileId,
        driverLocations.loadId,
        driverLocations.recordedAt,
      ],
    });

    return { ack: true, currentStatus: load.status };
  });
```

### 11.3 Client behavior

- Posts every 45 seconds OR after 200m of movement (whichever first)
- Exponential backoff on errors, max 3 retries per post
- If server returns `ack: false`, stop posting and refresh load state
- Visible "Tracking active" indicator in the UI the entire time

### 11.4 No audit middleware

`postLocation` does NOT write to audit_log. Too much volume. Log only in Sentry if errors spike.

---

## 12. Rate limiting

Endpoints with rate limits in Phase 1:

| Endpoint | Limit | Window | Key |
|---|---|---|---|
| `login` | 5 | 1 min | IP |
| `requestPasswordReset` | 3 | 10 min | IP + email |
| `postLocation` | 4 | 1 min | driver id |
| `requestUploadUrl` | 30 | 1 min | user id |
| `voiceUpdate` | 10 | 1 min | driver id |
| `rateConfirmationIngest` (webhook) | 20 | 1 min | sender email |

All other endpoints: no explicit rate limit. Rely on Better Auth session + general framework protections.

**Storage:** In-memory for Phase 1 (single instance). If deploying to more than one node, swap to Upstash Redis or Postgres-backed counters. Don't over-invest until you have the scaling problem.

---

## 13. Audit logging

### 13.1 When

Every mutation. Reads don't log unless they touch particularly sensitive data (driver SSNs if we ever add them — not in Phase 1).

### 13.2 What

```ts
{
  userId: string | null,
  action: string,              // e.g. "load.assign", "driver.approve"
  entityType: string,          // "load", "driver", "truck", ...
  entityId: string | null,
  changes: {
    before?: Record<string, unknown>,
    after?: Record<string, unknown>,
    context?: Record<string, unknown>,
  },
  ipAddress: string | null,
  createdAt: timestamp,
}
```

### 13.3 Action naming

`{entity}.{verb}`. Lowercase, dot-separated. Examples:

- `user.login`, `user.logout`, `user.password_reset_requested`
- `driver.invite`, `driver.approve`, `driver.reject`, `driver.suspend`
- `load.create`, `load.assign`, `load.status_change`, `load.cancel`
- `truck.create`, `truck.update`, `truck.delete`
- `broker.create`, `broker.update`
- `document.upload`, `document.delete`
- `invoice.create`, `invoice.send`, `invoice.mark_paid`, `invoice.void`
- `pay.adjust`, `pay.mark_paid`, `pay.export`
- `settings.update`
- `display_token.create`, `display_token.revoke`

### 13.4 Redaction

The audit middleware sanitizer strips: `password`, `passwordHash`, `token`, `secret`, `twoFactorSecret`. Extend the list if you add new sensitive fields.

### 13.5 Retention

Audit log is **never deleted in Phase 1**. If the table grows unreasonably, archive to cold storage in Phase 2.

---

## 14. Error → UI mapping

The framework-level error handler wraps every server function. Catches:

1. `AppError` subclasses → return `{ ok: false, error: { code, message, details } }` with appropriate HTTP status.
2. `ZodError` → convert to `ValidationError` with `details.fieldErrors`.
3. `DrizzleError` or pg constraint violations → map known codes (unique violation → `ConflictError`), default to `AppError("INTERNAL", ...)`.
4. Anything else → log to Sentry, return `AppError("INTERNAL", "An unexpected error occurred")` with `eventId` from Sentry.

### 14.0 Implementation (the normalizer)

TanStack Start's `.validator(schema)` rejects with its own error shape, not ours. Without an explicit normalizer, `handleMutationError`'s switch on `code` misses cases and forms never get field-level errors. Register one formatter at app setup and route every server-function error through it:

```ts
// src/server/errors.ts (continued)
import { ZodError } from "zod";
import * as Sentry from "@sentry/node";
import { AppError, type ErrorResponse } from "./errors";

export function normalizeError(err: unknown): ErrorResponse {
  // 1. Our own AppError subclasses: pass through. Sentry only for 5xx.
  if (err instanceof AppError) {
    if (err.status >= 500) {
      const eventId = Sentry.captureException(err);
      return { ok: false, error: { code: err.code, message: err.message, details: err.details, eventId } };
    }
    return { ok: false, error: { code: err.code, message: err.message, details: err.details } };
  }

  // 2. Zod validation — convert to fieldErrors shape the client forms expect.
  if (err instanceof ZodError) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "Request validation failed",
        details: { fieldErrors: zodToFieldErrors(err) },
      },
    };
  }

  // 3. Postgres constraint violations.
  if (isPgUniqueViolation(err)) {
    return { ok: false, error: { code: "CONFLICT", message: "Resource already exists" } };
  }

  // 4. Unknown — Sentry + generic response.
  const eventId = Sentry.captureException(err);
  return {
    ok: false,
    error: { code: "INTERNAL", message: "An unexpected error occurred", eventId },
  };
}

function isPgUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "23505"
  );
}
```

Wire it as the global error formatter at boot so every server function runs through it. Check TanStack Start's current API for the exact registration call — at the time of writing it's an `onError` / `errorFormatter` option on the server-function factory or at app setup.

### 14.1 Client handling

TanStack Query `onError`:

```ts
function handleMutationError(err: unknown) {
  const appErr = normalizeError(err);

  switch (appErr.code) {
    case "VALIDATION_FAILED":
      // Form: push fieldErrors to form state, no toast
      return { fieldErrors: appErr.details?.fieldErrors };

    case "UNAUTHORIZED":
      // Redirect to login
      router.navigate({ to: "/login" });
      return null;

    case "FORBIDDEN":
      toast.error("You don't have access to this action");
      return null;

    case "NOT_FOUND":
      toast.error(appErr.message);
      return null;

    case "BUSINESS_RULE_VIOLATED":
    case "CONFLICT":
      toast.error(appErr.message);
      return null;

    case "RATE_LIMITED":
      toast.error(`Too many attempts. Try again in ${appErr.details?.retryAfterSeconds}s`);
      return null;

    default:
      toast.error(
        appErr.eventId
          ? `Something went wrong. Error ID: ${appErr.eventId}`
          : "Something went wrong"
      );
      return null;
  }
}
```

### 14.2 Toast vs banner vs modal

- **Toast:** non-blocking, auto-dismisses. Use for: success confirmations, transient errors, "saved" feedback.
- **Inline field errors:** validation failures. Always.
- **Banner:** persistent state that affects what the user can do. "Driver has expired CDL", "Offline", "Approval pending."
- **Modal:** explicit confirmation. Delete, cancel load, void invoice. Never for errors.

---

## 15. Logging & observability

### 15.1 Sentry

- Initialize at app boot in both client and server
- Capture all unhandled errors, all `AppError` with status >= 500
- Attach `user: { id, role }` context
- Attach `tags: { route, server_function, entity_type, entity_id }` where applicable
- Use Sentry's performance monitoring (free tier, sampled)
- Sentry event ID surfaces to users in generic error toasts — helps support debug real issues

Do NOT send to Sentry:
- `AppError` with status < 500 (validation, auth, business rules — expected)
- Rate limit hits
- Cron job recurring warnings (dedupe/alert separately)

### 15.2 Structured logs

Use `pino` for server-side structured logging:

```ts
logger.info({ loadId, driverId, action: "load.assign" }, "Load assigned");
```

Log levels:
- `trace`: never in prod
- `debug`: dev only
- `info`: business events (load assigned, invoice sent, driver approved)
- `warn`: recoverable weirdness (retry succeeded, cache miss, fallback used)
- `error`: caught exceptions, external API failures
- `fatal`: process exits

**Never log:** passwords, full session tokens, full SSNs, full document contents, signed URLs.

### 15.3 Request IDs

Every request gets a `x-request-id` header (generated if absent). Pass it through all logs, all Sentry breadcrumbs, all downstream service calls. When Gary reports a bug, you can grep logs by request ID.

### 15.4 Metrics (lightweight Phase 1)

Track in Postgres (simple counter table updated from middleware):

- Requests/minute per route
- Error rate per server function
- Login success/fail rate
- Track-post write rate
- Document upload volume

Phase 2: migrate to a proper metrics backend (Prometheus, Datadog, or Sentry Metrics).

---

## 16. Testing expectations

Phase 1 is not the time for 80% coverage. It IS the time for tests on the load-bearing paths.

### 16.1 Mandatory test coverage

Every one of these gets a test:

- **Load status transitions.** Every valid transition works, every invalid one is rejected.
- **Driver compliance gate.** Expired CDL → cannot accept new load.
- **Driver data isolation.** Driver A cannot see Driver B's loads/documents/pay, even with forged IDs.
- **Broker data stripping.** `getLoadDriver` response never contains `rate` or `broker`.
- **Document ownership enforcement.** Driver can't fetch rate con, can fetch BOL on their own load.
- **Invoice total math.** Subtotal + adjustments = total, for both positive and negative adjustments.
- **Pay calculation.** Each pay model (percent_of_rate, per_mile, flat_per_load) computes correctly, including rounding.
- **Load number generation.** Sequential within year, resets Jan 1.
- **Expiration alerting.** Stubbed "today" date produces the right notifications at 60/30/14/7/expired.

### 16.2 Stack

- **Unit tests:** `vitest` for services and pure functions
- **Integration tests:** `vitest` with a per-test Postgres schema (use `pg_tmp` or testcontainers)
- **E2E tests:** `playwright`, at minimum for: login, invite/onboard driver, create load, assign load, driver updates status, upload document, generate invoice

### 16.3 CI

- Run unit + integration tests on every PR
- Run E2E on main before deploy
- Type-check (`tsc --noEmit`) on every PR
- Lint (`eslint`) on every PR

---

## 17. Scheduled jobs (cron)

All jobs are idempotent — safe to re-run if a previous run failed or was duplicated. Use Vercel Cron (via `vercel.json`) or a lightweight cron trigger endpoint protected by a shared secret.

### 17.1 `auto-complete-loads.ts`

**Schedule:** Every hour
**Purpose:** Auto-complete loads stuck in `pod_uploaded` for >24 hours

```ts
async function autoCompleteLoads() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const staleLoads = await db.query.loads.findMany({
    where: and(
      eq(loads.status, "pod_uploaded"),
      lt(loads.updatedAt, cutoff),
      isNull(loads.deletedAt),
    ),
    with: { assignedDriver: true },
  });

  for (const load of staleLoads) {
    await db.transaction(async (tx) => {
      await tx.update(loads).set({ status: "completed" }).where(eq(loads.id, load.id));

      await tx.insert(loadStatusHistory).values({
        loadId: load.id,
        fromStatus: "pod_uploaded",
        toStatus: "completed",
        changedByUserId: null, // system action
        reason: "Auto-completed after 24 hours in pod_uploaded status",
      });

      // Snapshot driver pay
      if (load.assignedDriverId) {
        await payService.createPayRecord(load, tx);
      }
    });

    await notificationsService.notify({
      userId: ADMIN_USER_ID,
      type: "load_status_changed",
      title: `Load ${load.loadNumber} auto-completed`,
      body: "POD was uploaded >24h ago with no manual review. Load marked complete.",
      metadata: { loadId: load.id },
    });
  }

  logger.info({ count: staleLoads.length }, "Auto-complete loads job finished");
}
```

### 17.2 `invoice-overdue-check.ts`

**Schedule:** Nightly, midnight admin TZ (same trigger as expiration-check)
**Purpose:** Flip `sent` invoices past their `dueDate` to `overdue`, notify Gary

```ts
async function checkOverdueInvoices() {
  const today = new Date();

  const overdueInvoices = await db
    .update(invoices)
    .set({ status: "overdue" })
    .where(
      and(
        eq(invoices.status, "sent"),
        lt(invoices.dueDate, today),
      )
    )
    .returning();

  for (const invoice of overdueInvoices) {
    await notificationsService.notify({
      userId: ADMIN_USER_ID,
      type: "invoice_overdue",
      title: `Invoice ${invoice.invoiceNumber} is overdue`,
      body: `Due ${formatDate(invoice.dueDate)}. Broker: ${await getBrokerName(invoice.brokerId)}.`,
      metadata: { invoiceId: invoice.id, brokerId: invoice.brokerId },
    });

    // Email Gary for overdue invoices
    await emailService.sendInvoiceOverdueAlert(invoice);
  }

  logger.info({ count: overdueInvoices.length }, "Invoice overdue check finished");
}
```

### 17.3 Job schedule summary

| Job | Schedule | Trigger |
|---|---|---|
| `expiration-check` | Nightly, midnight admin TZ | Vercel Cron |
| `invoice-overdue-check` | Nightly, midnight admin TZ | Vercel Cron (same trigger, runs sequentially) |
| `auto-complete-loads` | Hourly | Vercel Cron |
| `weekly-settlements` | Friday 5:00 PM admin TZ | Vercel Cron |
| `pod-delivery` | Event-driven (on POD upload) | Triggered by `confirmDocumentUpload` |

---

## Appendix A: Module dependency rules

```
routes/   → functions/ → services/ → db/
                              ↓
                       integrations/ (mapbox, claude, resend, storage)
```

- `routes/` NEVER imports from `services/` directly. Always through `functions/`.
- `services/` NEVER imports from `routes/` or `functions/`. Pure backend logic.
- `services/` NEVER imports `db` directly for reads — use `db` or the optional `tx` parameter passed in.
- `integrations/` are leaf nodes. They import nothing from services.

Enforce with ESLint `no-restricted-imports` rule.

## Appendix B: Function file template

```ts
// src/server/functions/{entity}/{verb}.ts
import { createServerFn } from "@tanstack/react-start";
import { {Middleware} } from "@/server/middleware/...";
import { {Service} } from "@/server/services/...";
import { {InputSchema}, {OutputType} } from "@/server/schemas/...";

export const {functionName} = createServerFn({ method: "POST" })
  .middleware([/* ... */])
  .validator({InputSchema})
  .handler(async ({ data, context }): Promise<{OutputType}> => {
    return {service}.{verb}({
      ...data,
      actingUserId: context.auth.user.id,
    });
  });
```

## Appendix C: Service file template

```ts
// src/server/services/{entity}.service.ts
import { db, type Database } from "@/db";
import { {tables} } from "@/db/schema";
import { {ErrorType} } from "../errors";

export async function {verb}(
  input: {...},
  tx: Database = db
): Promise<{...}> {
  return tx.transaction(async (tx) => {
    // 1. Load + verify preconditions
    // 2. Business rule checks -> throw BusinessRuleError
    // 3. Perform mutations
    // 4. Schedule post-commit side effects
    // 5. Return
  });
}
```
