# Contracts Lock — Shared Interfaces

**Owner:** Orchestrator (write); Sessions 1 / 2 / 3 (read)
**Version:** v1.1 — `onboarding_drafts` table added 2026-04-26 (per Session 3 Request #2)
**Status:** §1–6 LOCKED 2026-04-26 (v1) → §1 amended for `onboarding_drafts` (v1.1). §7 (empty copy) — driver keys 1–4 promoted to LOCKED 2026-04-26.
**Lock policy:** Sections marked LOCKED cannot be changed without a version bump and notification to all active sessions.

> **Locked by orchestrator on 2026-04-26.** §1–6 reflect what shipped in `feat/infra-auth` (commits `5cb365d` → `30b41d6`). The 5 deviations from the original spec are recorded in §9 — read those before assuming a field/route exists. Sessions 2 + 3 are unblocked as of this date.
>
> **v1.1 amendment 2026-04-26:** `onboarding_drafts` table added (migration `0001_curvy_bloodaxe.sql`, applied to Railway). Server-fn wiring (`getOnboardingDraftFn` / `patchOnboardingDraftFn` / `submitOnboardingProfileFn`) is owed by Session 3 follow-up — orchestrator will land it during Phase A integration.
>
> **Quick start for Sessions 2 + 3:** if you only have time to skim, jump to **§11 (Cookbook)** — it's four copy-paste snippets that cover ~80% of the patterns you'll need.

---

## 1. Schema (TypeScript shape)

Drizzle source of truth: `src/server/db/schema/` — split across `_enums.ts`, `_types.ts`, `auth.ts`, `drivers.ts`, `trucks.ts`, `brokers.ts`, `loads.ts`, `documents.ts`, `tracking.ts`, `invoices.ts`, `notifications.ts`, `audit.ts`. Public re-export at `src/server/db/schema/index.ts`. Migrations live in `drizzle/` (init = `0000_init.sql`).

22 tables on Postgres 18.3. The shapes Sessions 2 + 3 will see most often:

```ts
// src/server/db/schema/auth.ts
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: citext("email").notNull(),                  // unique index
  name: text("name").notNull(),                      // required by Better Auth
  role: userRole("role").notNull(),                  // 'admin' | 'driver'
  status: userStatus("status").notNull(),            // 'invited'|'pending_approval'|'active'|'suspended'
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),                              // optional avatar
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),        // app-encrypted, see 05 §6.2
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  firstLoginCompletedAt: timestamp("first_login_completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// passwordHash is NOT on users — Better Auth stores it on accounts.password
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  providerId: text("provider_id").notNull(),         // 'credential' for email+password
  accountId: text("account_id").notNull(),
  password: text("password"),                         // hashed by Better Auth
  // OAuth-optional columns reserved for Phase 2 SSO so we don't need a follow-up migration:
  accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, idToken
});

export const sessions = pgTable("sessions", { /* per Better Auth spec */ });
export const verificationTokens = pgTable("verification_tokens", { /* per Better Auth spec */ });
export const invites = pgTable("invites", {
  id, email: citext, token, expiresAt, invitedByUserId, acceptedAt, createdAt
});
export const companySettings = pgTable("company_settings", {
  id, name, timezone, createdAt, updatedAt
});
```

```ts
// src/server/db/schema/drivers.ts — driver_profiles
// One-to-one with users where role='driver'. NO payModel, NO payRate.
// Driver pay is set per-load on loads.driverPayCents.
{ id, userId (unique), firstName, lastName, dob, phone,
  addressLine1, addressLine2, city, state(char 2), zip,
  emergencyContactName, emergencyContactPhone, emergencyContactRelation,
  cdlNumber, cdlClass, cdlState, cdlExpiration, medicalCardExpiration,
  hireDate, assignedTruckId, notes,
  onboardingState, onboardingStartedAt, onboardingCompletedAt, voiceConsentAt,
  approvedAt, approvedByUserId, deletedAt, createdAt, updatedAt }
```

```ts
// src/server/db/schema/loads.ts
{ id, loadNumber (unique), brokerId, assignedDriverId, assignedTruckId,
  status, rate (int cents),
  driverPayCents: integer("driver_pay_cents"),               // NULL until set
  driverPayUpdatedAt: timestamp("driver_pay_updated_at"),    // NULL until set
  miles, commodity, weight, pieces, specialInstructions,
  referenceNumber, bolNumber, createdByUserId,
  deletedAt, createdAt, updatedAt }
```

```ts
// src/server/db/schema/documents.ts
{ id, type (enum), blobKey, fileName, fileSizeBytes (bigint), mimeType,
  uploadedByUserId,
  driverProfileId, truckId, loadId,                          // exactly one non-null
  expirationDate, notes, createdAt, updatedAt }
// CHECK constraint `documents_owner_exclusive` enforces the polymorphic owner rule
// at the DB level (added in 0000_init.sql since drizzle does not emit it).
```

```ts
// src/server/db/schema/invoices.ts — driver_pay_records
// SIMPLIFIED from the data model: no payModel/payRate snapshot since there is
// no per-driver pay model anymore. Snapshots loads.driverPayCents at completion.
{ id, driverProfileId, loadId (unique),
  calculatedAmountCents (int), adjustmentsCents (int, default 0), totalAmountCents (int),
  paidAt, notes, createdAt, updatedAt }
```

Other tables — full shapes in `src/server/db/schema/`:

- `trucks` — per `02-DATA-MODEL §3`
- `brokers` — per `02-DATA-MODEL §4`, partial unique index on `mc_number` where soft-delete is null
- `load_stops`, `load_status_history` — per `02-DATA-MODEL §5`
- `driver_locations` — per `02-DATA-MODEL §7` (BRIN + idempotency unique on driver/load/recordedAt)
- `invoices`, `invoice_line_items`, `settlement_statements`, `pod_deliveries`, `display_tokens` — per `02-DATA-MODEL §8`
- `notifications` — per `02-DATA-MODEL §9`
- `audit_log` — per `02-DATA-MODEL §10`. Table only; feature-code writes are out of scope this sprint per `09-INFRA-AND-AUTH §1`.
- `onboarding_drafts` (v1.1) — `(userId pk → users.id, data jsonb default '{}'::jsonb, updatedAt)`. Holds partial onboarding state pre-profile-creation. One-to-one with users (NOT driver_profiles, since the row exists *before* a profile does). Deleted by `submitOnboardingProfileFn` after profile + documents land.

Required Postgres extensions (run before any table) — added at the top of `0000_init.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### 1.x Service-layer invariants Session 2 must enforce

The schema does not enforce these via constraints — they live in services. If you skip them, the DB will accept inconsistent rows.

| Invariant | Where | Why |
|---|---|---|
| `loads.driverPayCents` MUST be non-null before `status='completed'` | `loadsService.updateStatus()` | Pay is per-load now. The completion gate is what makes "Gary forgets to set pay" a 422 instead of an unpaid driver |
| `loads.driverPayUpdatedAt` updated whenever `driverPayCents` changes | `loadsService.setDriverPay()` | Audit trail without scanning `audit_log` |
| When `loads.assignedDriverId` is set, the driver's `cdlExpiration` and `medicalCardExpiration` MUST be in the future | `loadsService.assignDriver()` | Compliance gate from `02-DATA-MODEL §2` — kept in code per the data model |
| `documents` row's `(driverProfileId | truckId | loadId)` matches the `type` prefix (`driver_*` / `truck_*` / `load_*`) | `documentsService.create()` | The CHECK constraint enforces "exactly one is non-null" but not the type-to-owner match |
| Driver-scoped queries select **only** driver-safe columns (no `rate`, no `broker`) | `loadsService.getLoadDriverView()` etc. | Per `05-TECH-CONTRACTS §6.1` — physical column selection beats runtime stripping |
| Better Auth's `signUpEmail` requires `name`; populate it from email at invite, refresh it after the about-step | `auth.acceptInvite()` (already done) → driver onboarding `about` step (Session 3) | `users.name` is NOT NULL |

---

## 2. Auth contract (Session 1 §3.4)

Live at `src/server/auth/api.ts`. Each function reads/writes Better Auth cookies via the `Headers` argument; the server-function wrappers in `src/server/auth/functions.ts` thread `getRequest().headers` for the browser-facing path.

```ts
// src/server/auth/api.ts
export type Role = "admin" | "driver";

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  driverId: string | null;     // resolved via driverProfiles.userId for drivers
};

export class AuthError extends Error {
  code: "UNAUTHORIZED" | "FORBIDDEN" | "INVITE_INVALID" | "INVITE_EXPIRED";
}

export function signIn(email: string, password: string, headers: Headers): Promise<SessionUser>;
export function signOut(headers: Headers): Promise<void>;
export function getSession(headers: Headers): Promise<SessionUser | null>;
export function requireAdmin(headers: Headers): Promise<SessionUser>;     // throws AuthError
export function requireDriver(headers: Headers): Promise<SessionUser>;    // throws AuthError

export function inviteDriver(input: {
  email: string;
  invitedByUserId: string;
}): Promise<{ inviteUrl: string; token: string }>;

export function acceptInvite(
  token: string,
  password: string,
  headers: Headers,
): Promise<SessionUser>;
```

Server-function wrappers (browser-callable) at `src/server/auth/functions.ts`:

```ts
export const signInFn: ServerFn<{ email, password } -> SessionUser>;
export const signOutFn: ServerFn<void -> void>;
export const getSessionFn: ServerFn<void -> SessionUser | null>;
export const acceptInviteFn: ServerFn<{ token, password } -> SessionUser>;
// inviteDriver is NOT exposed as a server function here — Session 2 wires it
// onto the admin-only "Add driver" route since it needs the calling admin's id.
```

Function-level middlewares at `src/server/auth/middleware.ts`:

```ts
export const authRequired;   // requires any signed-in user
export const adminOnly;      // requires role='admin'
export const driverOnly;     // requires role='driver'
// All three populate context.user as SessionUser.
```

**Bare scaffolds** (locked — Sessions 2 + 3 do NOT redesign this sprint):
- `src/routes/login/index.tsx`
- `src/routes/accept-invite/$token.tsx`

---

## 3. Storage contract (Session 1 §3.5)

Live at `src/server/storage/index.ts`.

```ts
export type DocOwnerKind = "driver" | "truck" | "load";

export interface UploadDocInput {
  ownerKind: DocOwnerKind;
  ownerId: string;
  type: string;              // document_type enum value (caller passes)
  file: File | Buffer;
  fileName: string;
  mimeType: string;          // must be in ALLOWED_MIME_TYPES
}

export interface UploadDocResult {
  blobKey: string;           // canonical Vercel Blob URL — store on documents.blob_key
  url: string;               // same as blobKey
}

export function uploadDoc(input: UploadDocInput): Promise<UploadDocResult>;
export function getSignedUrl(blobKey: string, ttlSeconds?: number): Promise<string>;
export function deleteBlob(blobKey: string): Promise<void>;
export function blobExists(blobKey: string): Promise<boolean>;
```

Path convention (enforced inside `uploadDoc`):

```
drivers/{driverId}/{type}/{uuid}.{ext}
trucks/{truckId}/{type}/{uuid}.{ext}
loads/{loadId}/{type}/{uuid}.{ext}
```

Constants:
- `MAX_FILE_BYTES = 25 * 1024 * 1024` (25 MB)
- `ALLOWED_MIME_TYPES = { application/pdf, image/jpeg, image/png, image/heic, image/webp }`

**Caveat for §9:** `getSignedUrl` returns the canonical URL unchanged — Vercel Blob v2 has no public time-bound signing API. Browser viewing of private blobs requires a server-mediated download endpoint owned by Session 2/3. `ttlSeconds` is accepted but ignored; preserved on the signature so callers can opt in once the SDK adds it.

**Action for Session 2:** build `src/server/functions/documents/download.ts` — a server function or route that calls `authorizeDocumentRead(auth, docId)` then streams the bytes through `@vercel/blob` `get()`. Until that endpoint exists, no document can be viewed in the browser, so prioritize it before any documents UI.

---

## 4. AI helper contract (Session 1 §3.6)

Live at `src/server/ai/index.ts`.

```ts
export type CdlExtraction = {
  number: string;
  class: "A" | "B" | "C";
  state: string;             // 2-letter US code, uppercase
  expiration: string;        // ISO 8601 (YYYY-MM-DD)
};

export type MedicalCardExtraction = {
  expiration: string;        // ISO 8601 (YYYY-MM-DD)
};

export function extractCdl(blobKey: string): Promise<CdlExtraction | null>;
export function extractMedicalCard(blobKey: string): Promise<MedicalCardExtraction | null>;
```

Provider/model: `"anthropic/claude-haiku-4-5"` via Vercel AI Gateway (`@ai-sdk/gateway`). 2 attempts, then `null` — caller falls back to a manual form.

Cost guardrail (warn on >4 calls per onboarding session) is the **caller's** job. The helper has no notion of "session" — that's a UX boundary.

---

## 5. Server function naming (Sessions 2 + 3)

```
src/server/functions/{resource}.ts          // admin-scoped (use adminOnly middleware)
src/server/functions/driver/{resource}.ts   // driver-scoped (use driverOnly middleware)
```

Function names: `list{Resource}`, `get{Resource}`, `create{Resource}`, `update{Resource}`, `delete{Resource}`.

Driver-scoped functions filter to the session driver's own data only — see `05-TECH-CONTRACTS §6.1` (driver-view queries that physically select only driver-safe columns; runtime field-stripping is the transitional backstop).

Middleware composition pattern (per `05-TECH-CONTRACTS §5`):
`requestContext → rateLimit → authRequired → adminOnly|driverOnly → audit`

Session 1 ships `authRequired / adminOnly / driverOnly`. The other middlewares (`requestContext`, `rateLimit`, `audit`) are out of scope for Session 1 per `09-INFRA-AND-AUTH §1`. Session 2 builds them when wiring real feature endpoints.

---

## 6. Environment variables

| Key | Source | Used by | Set in Session 1? |
|---|---|---|---|
| `DATABASE_URL` | Railway | Session 1 (db client, drizzle-kit, seed) | ✓ in `.env.local` |
| `BETTER_AUTH_SECRET` | Generated | Better Auth | ✓ in `.env.local` |
| `BETTER_AUTH_URL` | Vercel preview URL | Better Auth (cookie domain, trustedOrigins) | ✗ — defaults to `http://localhost:3000` if unset, so dev works without it; set in Vercel after first deploy |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob | Storage helper, AI helper (blob read) | ✓ in `.env.local` |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway | AI helper | ✓ in `.env.local` |
| `ADMIN_SEED_EMAIL` | Manual | seeds/admin.ts | ✓ in `.env.local` |
| `ADMIN_SEED_PASSWORD` | Manual | seeds/admin.ts | ✓ in `.env.local` |

`vercel env pull` after Session 1's first preview deploy lands so Sessions 2 + 3 inherit them in their worktrees.

Typed accessor: `src/server/env.ts`. Throws at module load if a required key is missing.

---

## 7. Empty-copy additions (orchestrator owns)

Driver-portal keys to append to `src/lib/empty-copy.ts` once Session 3 requests them:

| Key | Variant | Title | Description |
|---|---|---|---|
| `driver.todayLoad.none` | first-time | No loads assigned yet | Gary will dispatch you when one comes in. |
| `driver.pay.pending` | first-time | Pay pending | Gary sets your pay before pickup. |
| `driver.documents.firstTime` | first-time | Finish your DOT file | Upload your CDL and medical card to finish onboarding. |
| `driver.loads.history.empty` | caught-up | No completed loads yet | Your delivered loads will show up here as you run them. |

---

## 8. Lock state

| Section | Status | Locked at |
|---|---|---|
| 1. Schema | **LOCKED** | 2026-04-26 |
| 2. Auth | **LOCKED** | 2026-04-26 |
| 3. Storage | **LOCKED** | 2026-04-26 |
| 4. AI helper | **LOCKED** | 2026-04-26 |
| 5. Function naming | **LOCKED** | 2026-04-26 |
| 6. Env vars | **LOCKED** | 2026-04-26 |
| 7. Empty copy | DRAFT — append on demand via orchestrator | — |

Sections 1–6 are LOCKED. Sessions 2 and 3 are unblocked as of 2026-04-26.

Changes to a LOCKED section require a version bump in this header and a notification to all active sessions. If Session 2 or 3 hits a contract gap during implementation, **stop and ask the orchestrator** rather than reshape the contract from inside another session.

---

## 9. Deviations Session 1 made vs. the original spec

These are the only things Session 1 changed unilaterally; orchestrator should review before promoting §1–6 to LOCKED.

### 9.1 Schema — auth tables aligned to Better Auth's required surface

`02-DATA-MODEL §1` listed `users.passwordHash`. Better Auth stores the password hash on `accounts.password` (its credential ledger), not on the user row. To make the adapter work without forking Better Auth, Session 1:

- **Removed** `users.passwordHash` (column doesn't exist).
- **Added** `users.name` (required by Better Auth's user surface; populated to email at invite time, refreshed to `firstName + lastName` after the about-step).
- **Added** `users.image` (optional, not used in Phase 1; included so future avatar UX is a backfill, not a migration).
- **Added** OAuth-optional columns to `accounts` (`accessToken`, `refreshToken`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `scope`, `idToken`). All nullable, unused in Phase 1. Including them now means Phase 2 SSO wiring is a config change, not a schema migration.

### 9.2 Schema — `driver_pay_records` simplified

`02-DATA-MODEL §8` had `driver_pay_records.payModel` and `driver_pay_records.payRate` as snapshots. Since pay model and pay rate **don't exist on `driver_profiles` anymore** (per `12-CONTRACTS-LOCK §1`), there's nothing to snapshot. Session 1 dropped both columns. The remaining fields (`calculatedAmountCents` snapshots `loads.driverPayCents` at completion; `adjustmentsCents`; `totalAmountCents`) preserve the immutable-snapshot semantics.

### 9.3 Auth — `signIn`/`signOut`/`getSession`/`requireAdmin`/`requireDriver` take a `Headers` arg

The contract draft showed bare signatures (e.g. `signIn(email, password): Promise<SessionUser>`). Better Auth's API is request-scoped — it reads cookies from request `Headers` and writes Set-Cookie via response `Headers`. The actual signatures take `headers: Headers`; the server-function wrappers in `functions.ts` thread `getRequest().headers` so callers don't see this detail.

### 9.4 Auth — no `/api/auth/*` HTTP catch-all

The contract draft assumed Better Auth would be mounted at `/api/auth/*` via a TanStack Start file route. TanStack Start v1.16x **does not export `createServerFileRoute`** in the same surface area I'd expected. Rather than hand-roll a route handler, Session 1 exposes the auth surface via typed server functions (`signInFn` etc). The browser path through TanStack Start's RPC layer gives stronger types and identical cookie handling. The bare `/login` scaffold calls `signInFn` directly.

If/when a future TanStack Start version adds `createServerFileRoute` (or equivalent), the handler is a one-liner: `auth.handler(request)`.

### 9.5 Storage — `getSignedUrl` returns the canonical URL

Vercel Blob v2 (2.3.3) has no public time-bound signing API. `getSignedUrl(blobKey, ttlSeconds?)` returns the canonical blob URL. Browser viewing of private blobs requires a server-mediated download endpoint owned by Session 2/3 (their domain since they own the route handlers that decide who can read what). The signature accepts `ttlSeconds` for forward-compat — when Vercel adds the API, swap the implementation without touching callers.

---

## 10. Session 1 verification record

| Sub-task | Commit | Verification |
|---|---|---|
| 3.2 Vite → TanStack Start | `5cb365d` | typecheck + build clean; dev boots; 14 spot-checked routes resolve |
| 3.3 Drizzle schema | `fc299dc` | 22 tables on Railway Postgres 18.3; citext + pg_trgm enabled; `documents_owner_exclusive` CHECK present |
| 3.4 Better Auth + seed | `46134d1` | Gary seeded (uuid id, role=admin, status=active); `signInFn` / `acceptInviteFn` wired |
| 3.5 Vercel Blob helper | `f9d98e4` | `uploadDoc / getSignedUrl / deleteBlob / blobExists` exposed; 25 MB cap; mime allowlist |
| 3.6 AI Gateway client | `f9d98e4` | `extractCdl + extractMedicalCard` via `"anthropic/claude-haiku-4-5"`; 2-attempt cap |
| 3.8 Doc sync | `30b41d6` | `payModel/payRate/PAY_MODEL_LABEL/formatPayRate` zero hits across 02/03/04/06-* |
| 3.9 Contracts lock fill | `30b41d6` | §1–6 written from real signatures |

**Sub-task 3.7 (Vercel deploy) deferred** until orchestrator confirms `vercel link` strategy + pushes env vars to the Vercel dashboard. Doesn't block Sessions 2 + 3.

---

## 11. Cookbook for Sessions 2 + 3

Four ready-to-copy patterns. If you only read one section of this doc, read this one.

### 11.1 An admin-only server function (the 80% case for Session 2)

```ts
// src/server/functions/loads/list.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { adminOnly } from "@/server/auth/middleware";
import * as loadsService from "@/server/services/loads.service";

const ListLoadsInput = z.object({
  status: z.enum(["draft", "assigned", "completed", /* ... */]).optional(),
  limit: z.number().int().min(1).max(200).default(50),
  cursor: z.string().nullable().default(null),
});

export const listLoads = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => ListLoadsInput.parse(data))
  .handler(async ({ data, context }) => {
    // context.user is SessionUser (role='admin' guaranteed by middleware)
    return loadsService.listForAdmin({
      status: data.status,
      limit: data.limit,
      cursor: data.cursor,
    });
  });
```

### 11.2 A driver-scoped server function (the 80% case for Session 3)

```ts
// src/server/functions/driver/loads/today.ts
import { createServerFn } from "@tanstack/react-start";
import { driverOnly } from "@/server/auth/middleware";
import * as loadsService from "@/server/services/loads.service";

export const todayLoad = createServerFn({ method: "GET" })
  .middleware([driverOnly])
  .handler(async ({ context }) => {
    // context.user.driverId is non-null (driverOnly guarantees it).
    // The service MUST filter to this driver — never trust the client to pass driverId.
    return loadsService.getCurrentLoadForDriver(context.user.driverId!);
  });
```

### 11.3 Reading the session inside a route's `beforeLoad` (admin-portal gate)

```ts
// src/routes/admin.tsx (root of the admin section)
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSessionFn } from "@/server/auth/functions";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const user = await getSessionFn();
    if (!user) throw redirect({ to: "/login" });
    if (user.role !== "admin") throw redirect({ to: "/" });
    return { user };
  },
  // ...
});
```

For driver routes, swap `role !== "admin"` for `role !== "driver"` and redirect to `/onboarding` if `driverId` is null.

### 11.4 Uploading + viewing a document end-to-end

```ts
// Upload (Session 2/3, in a server function)
import { uploadDoc } from "@/server/storage";
import { db } from "@/server/db";
import { documents } from "@/server/db/schema";

const { blobKey } = await uploadDoc({
  ownerKind: "load",
  ownerId: loadId,
  type: "load_bol",
  file: incomingFile,                  // File or Buffer
  fileName: incomingFile.name,
  mimeType: incomingFile.type,
});

await db.insert(documents).values({
  type: "load_bol",
  blobKey,
  fileName: incomingFile.name,
  fileSizeBytes: incomingFile.size,
  mimeType: incomingFile.type,
  uploadedByUserId: context.user.id,
  loadId,
});
```

Browser-side document viewing requires a server-mediated download endpoint (see §3 caveat). Build it before the documents UI:

```ts
// src/server/functions/documents/download.ts (Session 2 owns this)
import { createServerFn } from "@tanstack/react-start";
import { authRequired } from "@/server/auth/middleware";
import { authorizeDocumentRead } from "@/server/authorize/documents";
import { get } from "@vercel/blob";
import { env } from "@/server/env";

export const downloadDocument = createServerFn({ method: "GET" })
  .middleware([authRequired])
  .inputValidator(/* { docId: uuid } */)
  .handler(async ({ data, context }) => {
    const doc = await authorizeDocumentRead(context.user, data.docId);
    const blob = await get(doc.blobKey, {
      access: "private",
      token: env.BLOB_READ_WRITE_TOKEN,
    });
    if (!blob || blob.statusCode !== 200) throw new Error("Not found");
    // Return the stream + headers; let TanStack Start emit the Response.
    return new Response(blob.stream, {
      headers: {
        "content-type": doc.mimeType,
        "content-disposition": `inline; filename="${doc.fileName}"`,
      },
    });
  });
```
