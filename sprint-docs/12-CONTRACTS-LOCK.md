# Contracts Lock — Shared Interfaces

**Owner:** Orchestrator (write); Sessions 1 / 2 / 3 (read)
**Status:** Draft v0 — awaiting Session 1 fill-in
**Lock policy:** Each section is promoted to LOCKED by orchestrator after Session 1 implements + verifies. Sections marked LOCKED cannot be changed without a version bump and notification to all active sessions.

---

## 1. Schema (TypeScript shape)

Drizzle source of truth: `src/server/db/schema.ts`. Session 1 fills this section in §3.3.

Until then, canonical field lists come from `../02-DATA-MODEL.md` + `../05-TECH-CONTRACTS.md`. Required tables (orchestrator decision):

- `users` — `id`, `email`, `hashed_password`, `role: 'admin'|'driver'`, `created_at`
- `sessions`, `accounts`, `verification_tokens` — Better Auth managed
- `invite_tokens` — `token`, `email`, `role`, `expires_at`, `consumed_at`
- `drivers` — per `../02-DATA-MODEL.md` minus `payModel` / `payRate`
- `trucks`, `brokers`
- `loads` — per `../05-TECH-CONTRACTS.md`, with `driverPayCents int null`, `driverPayUpdatedAt timestamptz null`
- `documents` — `id`, `type`, `owner_kind`, `owner_id`, `blob_key`, `file_name`, `mime_type`, `size_bytes`, `expiration_date null`, `uploaded_by`, `created_at`
- `audit_log`
- `notifications`

---

## 2. Auth contract (Session 1 §3.4)

```ts
type Role = 'admin' | 'driver';

type SessionUser = {
  id: string;
  email: string;
  role: Role;
  driverId: string | null;
};

signIn(email: string, password: string): Promise<SessionUser>
signOut(): Promise<void>
inviteDriver(email: string): Promise<{ inviteUrl: string; token: string }>
acceptInvite(token: string, password: string): Promise<SessionUser>
getSession(): Promise<SessionUser | null>
requireAdmin(): Promise<SessionUser>   // throws if not admin
requireDriver(): Promise<SessionUser>  // throws if not driver
```

---

## 3. Storage contract (Session 1 §3.5)

```ts
type DocOwnerKind = 'driver' | 'truck' | 'load';

uploadDoc(input: {
  ownerKind: DocOwnerKind;
  ownerId: string;
  type: DocType;          // from src/lib/fixtures/documents.ts
  file: File | Buffer;
  fileName: string;
  mimeType: string;
}): Promise<{ blobKey: string; url: string }>

getSignedUrl(blobKey: string, ttlSeconds?: number): Promise<string>
deleteBlob(blobKey: string): Promise<void>
```

Path convention:

```
drivers/{driverId}/{type}/{uuid}.{ext}
trucks/{truckId}/{type}/{uuid}.{ext}
loads/{loadId}/{type}/{uuid}.{ext}
```

---

## 4. AI helper contract (Session 1 §3.6)

```ts
extractCdl(blobKey: string): Promise<{
  number: string;
  class: 'A' | 'B' | 'C';
  state: string;       // 2-letter US code
  expiration: string;  // ISO date
} | null>

extractMedicalCard(blobKey: string): Promise<{
  expiration: string;  // ISO date
} | null>
```

Returns `null` after 2 failed attempts. Caller falls back to manual form.

Provider/model: `"anthropic/claude-haiku-4-5"` via Vercel AI Gateway.

---

## 5. Server function naming (Sessions 2 + 3)

```
src/server/functions/{resource}.ts                  // admin-scoped
src/server/functions/driver/{resource}.ts            // driver-scoped, calls requireDriver()
```

Function names: `list{Resource}`, `get{Resource}`, `create{Resource}`, `update{Resource}`, `delete{Resource}`.

Driver-scoped functions filter to the session driver's own data only.

---

## 6. Environment variables

| Key | Source | Used by |
|---|---|---|
| `DATABASE_URL` | Railway | Session 1 |
| `BETTER_AUTH_SECRET` | Generated | Session 1 |
| `BETTER_AUTH_URL` | Vercel preview URL | Session 1 |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob | Session 1 |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway | Session 1 |
| `ADMIN_SEED_EMAIL` | Manual | Session 1 seed |
| `ADMIN_SEED_PASSWORD` | Manual | Session 1 seed |

`vercel env pull` after Session 1 lands so Sessions 2 + 3 inherit them in their worktrees.

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
| 1. Schema | DRAFT | — |
| 2. Auth | DRAFT | — |
| 3. Storage | DRAFT | — |
| 4. AI helper | DRAFT | — |
| 5. Function naming | DRAFT | — |
| 6. Env vars | DRAFT | — |
| 7. Empty copy | DRAFT | — |

Orchestrator promotes each section to **LOCKED** after Session 1 implements and verifies. Once LOCKED, Sessions 2 and 3 are unblocked.
