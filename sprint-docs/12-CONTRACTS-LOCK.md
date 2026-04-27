# Contracts Lock — Shared Interfaces

**Owner:** Orchestrator (write); Sessions 1 / 2 / 3 (read)
**Status:** Session 1 fill-in v1 — awaiting orchestrator promotion to LOCKED
**Lock policy:** Each section is promoted to LOCKED by orchestrator after Session 1 implements + verifies. Sections marked LOCKED cannot be changed without a version bump and notification to all active sessions.

> **Session 1 note (2026-04-26):** §1–6 below reflect what actually shipped in `feat/infra-auth`. Where the spec drifted from `02-DATA-MODEL.md`, the section says so. Orchestrator: please review §9 (deviations) before promoting §1–6 to LOCKED.

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

Required Postgres extensions (run before any table) — added at the top of `0000_init.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

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
| `BETTER_AUTH_URL` | Vercel preview URL | Better Auth (cookie domain, trustedOrigins) | ✗ — set after first deploy in 3.7 |
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
| 1. Schema | DRAFT — Session 1 fill v1 | — |
| 2. Auth | DRAFT — Session 1 fill v1 | — |
| 3. Storage | DRAFT — Session 1 fill v1 | — |
| 4. AI helper | DRAFT — Session 1 fill v1 | — |
| 5. Function naming | DRAFT — Session 1 fill v1 | — |
| 6. Env vars | DRAFT — Session 1 fill v1 | — |
| 7. Empty copy | DRAFT | — |

Orchestrator promotes each section to **LOCKED** after reviewing §9 below + confirming Session 1's verification gate. Once §1–6 are LOCKED, Sessions 2 and 3 are unblocked.

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

## 10. Hand-off note to orchestrator (Session 1, 2026-04-26)

Sub-tasks 3.2 → 3.6 + 3.8 + 3.9 ship clean on `feat/infra-auth`:

| Sub-task | Verification |
|---|---|
| 3.2 Vite → TanStack Start | typecheck + build clean; dev boots; 14 spot-checked routes resolve |
| 3.3 Drizzle schema | 22 tables on Railway Postgres 18.3; citext + pg_trgm enabled; documents_owner_exclusive CHECK present |
| 3.4 Better Auth + seed | Gary seeded (uuid id, role=admin, status=active); signInFn / acceptInviteFn / etc wired |
| 3.5 Vercel Blob helper | uploadDoc / getSignedUrl / deleteBlob / blobExists exposed; 25 MB cap; mime allowlist |
| 3.6 AI Gateway client | extractCdl + extractMedicalCard via "anthropic/claude-haiku-4-5"; 2-attempt cap |
| 3.8 Doc sync | grep -E 'payModel\|payRate\|PAY_MODEL_LABEL\|formatPayRate' clean across 02/03/04/06-* |
| 3.9 Contracts lock | This document |

**Sub-task 3.7 (Vercel deploy) deferred.** The deploy needs `vercel link` (this worktree has no `.vercel/`) and a one-time push of env vars to the Vercel dashboard, then a first deploy to obtain `BETTER_AUTH_URL`. That's a human-loop step. Session 1 can finish 3.7 once the orchestrator confirms the deploy strategy.

**Suggested orchestrator review path:**
1. Pull `origin/feat/infra-auth`, run `npm install && npm run typecheck && npm run build` — confirm clean.
2. Skim §9 deviations above. If any are objectionable, push back before promoting.
3. Run `npm run seed:admin` against your `.env.local` — confirm Gary appears in the `users` table.
4. Promote §1–6 to LOCKED in §8 above. Date the row.
5. Send the unblock signal to Sessions 2 and 3 per `ACTIVATION-PROMPTS.md` §"Orchestrator handoff protocol".
