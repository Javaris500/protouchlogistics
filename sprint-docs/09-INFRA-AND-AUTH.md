# Session 1 — Infra + Database + Auth

**Owner:** Claude Session 1
**Worktree:** `../ptl-infra` on branch `feat/infra-auth`
**Estimate:** 6–8 hours
**Status:** Not started — awaiting pre-flight
**Read first:** `./00-ROADMAP.md`, `../02-DATA-MODEL.md`, `../05-TECH-CONTRACTS.md`, `./12-CONTRACTS-LOCK.md`

---

## 1. Scope

Foundation everything: framework migration, database, auth, storage, deploy, env. Sessions 2 and 3 cannot start until this lands and the contract freezes.

**In:**
- Migrate Vite → TanStack Start
- Provision Railway Postgres + Drizzle ORM + initial schema
- Better Auth with email/password, role-gated sessions, driver invite tokens
- Vercel Blob private upload helper
- AI Gateway client for Claude Haiku 4.5 vision OCR (callable, but Session 3 wires the UI)
- Deploy preview to Vercel
- Seed Gary as admin
- Sync 5 drift docs (02, 03, 04, 06-BACKEND-WIRING-PLAN, 06-FRONTEND-COMPONENTS) — strip pay-model residue

**Out:**
- Replacing fixtures in admin routes (Session 2)
- Driver portal routes (Session 3)
- OCR UI integration (Session 3, against the helper you ship)
- Notifications delivery, email send (Phase 2)
- Audit log writes from feature code (table only here; writes happen in Session 2)

---

## 2. Files owned

**Exclusive write access:**
- `package.json`, `vite.config.ts` (migration)
- `app.config.ts` (or equivalent TanStack Start config)
- `drizzle.config.ts`
- `src/server/db/**` (schema, client, migrations)
- `src/server/auth/**`
- `src/server/storage/**`
- `src/server/ai/**` (Gateway client)
- `src/server/env.ts`
- `seeds/**`
- `vercel.ts` (per knowledge update — not `vercel.json`)

**Read-only:**
- `src/components/**`
- `src/routes/**` (other than the route registry TanStack Start regenerates, and minimal `/login` + `/accept-invite/$token` page scaffolds)

**May edit only with orchestrator approval:**
- `src/lib/types/**`

---

## 3. Sub-tasks (in order)

### 3.1 Pre-flight (human, not Session 1)

- `npm i -g vercel`
- `vercel login` + `vercel link`
- Railway: create Postgres, copy connection string into `.env.local`
- Hand orchestrator: `DATABASE_URL`, Vercel project name

### 3.2 Migrate Vite → TanStack Start

- Add `@tanstack/start`, `@tanstack/start-vite-plugin`
- Convert root + entry files
- Re-run router codegen, confirm 35 routes resolve
- **Gate:** `npm run dev` boots, every existing route renders without error

### 3.3 Database schema

- `drizzle-orm` + `drizzle-kit`, Postgres adapter
- Tables: `users`, `sessions`, `accounts`, `verification_tokens`, `invite_tokens`, `drivers`, `trucks`, `brokers`, `loads`, `documents`, `audit_log`, `notifications`
- Field rules from `../05-TECH-CONTRACTS.md` are authoritative; do **not** invent fields
- `loads.driverPayCents int null`, `loads.driverPayUpdatedAt timestamptz null` — match the contract
- Migration `0001_init.sql` committed to repo
- `drizzle.config.ts` points at Railway DB

### 3.4 Better Auth

- Install + wire to Drizzle adapter
- Email/password provider only
- Roles: `admin`, `driver`
- Invite token table (one-shot, 7-day TTL)
- Functions: `signIn`, `signOut`, `inviteDriver(email)`, `acceptInvite(token, password)`, `getSession`, `requireAdmin`, `requireDriver`
- Session middleware that injects `user` into TanStack Start request context
- Minimal page scaffolds: `/login`, `/accept-invite/$token` — UI is bare; Session 2/3 are not allowed to redesign these in this sprint
- Seed Gary: `gary@protouchlogistics.com` + password from env

### 3.5 Vercel Blob storage helper

- `@vercel/blob` private mode
- `uploadDoc({ ownerKind, ownerId, type, file, fileName, mimeType })` returns `{ blobKey, url }`
- `getSignedUrl(blobKey, ttlSeconds?)` for read
- `deleteBlob(blobKey)` for replace flows
- Path convention (locked in `./12-CONTRACTS-LOCK.md` §3):
  ```
  drivers/{driverId}/{type}/{uuid}.{ext}
  trucks/{truckId}/{type}/{uuid}.{ext}
  loads/{loadId}/{type}/{uuid}.{ext}
  ```

### 3.6 AI Gateway client

- Use AI SDK + AI Gateway with `"anthropic/claude-haiku-4-5"` provider/model string (do not hard-bind to `@ai-sdk/anthropic`)
- `extractCdl(blobKey)` → `{ number, class, state, expiration } | null`
- `extractMedicalCard(blobKey)` → `{ expiration } | null`
- Hard cap: 2 attempts then `null`. Caller decides fallback.
- Cost ceiling: log + warn if any single onboarding session exceeds 4 calls

### 3.7 Vercel deploy

- `vercel.ts` config (typed, per current Vercel guidance)
- Env vars set in Vercel:
  - `DATABASE_URL`
  - `BETTER_AUTH_SECRET` (generated)
  - `BETTER_AUTH_URL` (Vercel preview URL)
  - `BLOB_READ_WRITE_TOKEN`
  - `AI_GATEWAY_API_KEY`
  - `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`
- First preview deploy succeeds, `/login` renders, Gary can log in

### 3.8 Doc sync

Strip pay-model residue from these 5 docs (all at repo root, one level up from this file):
- `../02-DATA-MODEL.md`
- `../03-ROUTES-AND-FEATURES.md`
- `../04-CREATIVE-FEATURES.md`
- `../06-BACKEND-WIRING-PLAN.md`
- `../06-FRONTEND-COMPONENTS.md`

Replace with `driverPayCents` semantics. Match tone of `../05-TECH-CONTRACTS.md`. After this pass, `grep -r 'payModel\|payRate\|PAY_MODEL_LABEL\|formatPayRate' .` returns zero hits across `*.md`.

### 3.9 Hand off

- Update `./12-CONTRACTS-LOCK.md` §1–6 with: schema TS types, auth function signatures, storage helper signatures, AI helper signatures, env keys
- Notify orchestrator
- Wait for orchestrator to mark §1–6 as LOCKED before tagging this session done

---

## 4. Verification

**Per-task:** `npm run typecheck && npm run build`.

**Final smoke (orchestrator signs off):**
- Login as Gary works against deployed Vercel preview
- Drizzle migrations apply cleanly to a fresh Railway DB
- Upload a 100KB test file via storage helper, get back signed URL, fetch it
- AI helper returns mock-shaped response on a CDL JPG fixture
- All 5 drift docs no longer mention removed pay-model identifiers

---

## 5. Out-of-scope guardrails

If you find yourself editing:
- `src/routes/admin/**` (anything beyond what `routeTree.gen.ts` regenerates) — **STOP**. That's Session 2.
- `src/routes/driver/**` — **STOP**. That's Session 3.
- `src/components/onboarding/PhotoCapture.tsx` — **STOP**. Session 3 owns the call site.
- `src/lib/empty-copy.ts` — **STOP**. Orchestrator only.

Anything that crosses these lines comes through the orchestrator.
