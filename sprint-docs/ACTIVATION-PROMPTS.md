# Session Activation Prompts

Paste each prompt as the **first message** in a fresh Claude Code session, after `cd`-ing into that session's worktree.

Worktrees must already exist. From the main repo:

```
git worktree add ../ptl-infra  -b feat/infra-auth
git worktree add ../ptl-admin  -b feat/admin-wiring
git worktree add ../ptl-driver -b feat/driver-portal
```

Each session opens Claude Code from inside its own worktree:

```
cd ../ptl-infra  && claude   # Session 1
cd ../ptl-admin  && claude   # Session 2
cd ../ptl-driver && claude   # Session 3
```

The orchestrator (this main session) keeps running in the original repo dir.

**Status as of 2026-04-26:** Session 1 has shipped on `feat/infra-auth` (commits `5cb365d` → `30b41d6`). `12-CONTRACTS-LOCK.md` §1–6 are LOCKED. Sessions 2 and 3 are unblocked and ready to start.

---

## Session 1 — Foundation (✓ shipped)

Historical artifact — do not re-run. The Session 1 worktree is `../ptl-infra` on `feat/infra-auth`. Sub-task 3.7 (Vercel deploy) is deferred and tracked separately.

```
You are Claude Session 1 — Foundation. You are running inside worktree ../ptl-infra on branch feat/infra-auth.

Your full brief is sprint-docs/09-INFRA-AND-AUTH.md. The shared contract is sprint-docs/12-CONTRACTS-LOCK.md. The master plan is sprint-docs/00-ROADMAP.md.

Read in order, in full, before doing anything:
1. sprint-docs/00-ROADMAP.md
2. sprint-docs/09-INFRA-AND-AUTH.md (your brief)
3. sprint-docs/12-CONTRACTS-LOCK.md
4. 02-DATA-MODEL.md
5. 05-TECH-CONTRACTS.md

Then begin sub-task 3.2 (Vite → TanStack Start migration). Do not start 3.3 (database) until 3.2 ships green typecheck + build.

You may NOT edit anything outside the file ownership listed in §2 of your brief. If you need a cross-cutting change, stop and ask the orchestrator (the parent session that handed you this prompt).

When you finish all sub-tasks in §3, fill in sprint-docs/12-CONTRACTS-LOCK.md §1–6 with your actual TS signatures, then notify the orchestrator. You are NOT allowed to promote any section to LOCKED yourself — only the orchestrator does that.

Verification gate: run `npm run typecheck && npm run build` clean before marking any sub-task done. Commit and push to feat/infra-auth as you complete sub-tasks. Do not merge to main.

Confirm you've read all five docs by quoting the §1 scope of your brief back to me, then proceed.
```

---

## Session 2 — Admin Wiring (READY 2026-04-26)

```
You are Claude Session 2 — Admin Portal Wiring. You are running inside worktree ../ptl-admin on branch feat/admin-wiring.

Your full brief is sprint-docs/10-ADMIN-WIRING.md. The shared contract is sprint-docs/12-CONTRACTS-LOCK.md.

UNBLOCKED as of 2026-04-26. Session 1 has shipped feat/infra-auth and §1–6 of the contract are LOCKED. Pull origin/feat/infra-auth into your worktree first — your worktree was created from main and does not yet have the schema, auth helpers, storage helper, or AI helper.

  cd ../ptl-admin
  git fetch origin
  git merge origin/feat/infra-auth   # or rebase, your call
  npm install                        # pulls drizzle-orm, better-auth, @vercel/blob, ai, etc.

Read in order:
1. sprint-docs/00-ROADMAP.md
2. sprint-docs/10-ADMIN-WIRING.md (your brief)
3. sprint-docs/12-CONTRACTS-LOCK.md — and pay special attention to:
     §1.x  Service-layer invariants you must enforce
     §9    Five deviations Session 1 made (especially 9.1 users.name, 9.4 no /api/auth catch-all, 9.5 signed URL pass-through)
     §11   Cookbook — four copy-paste patterns covering ~80% of what you'll do
4. 05-TECH-CONTRACTS.md (the patterns Session 1 didn't ship: requestContext, rateLimit, audit middlewares — those are yours)

What Session 1 already shipped that you'll be importing from:
- src/server/db/                  (drizzle client + 22-table schema)
- src/server/auth/api.ts          (signIn/signOut/inviteDriver/acceptInvite/getSession/requireAdmin/requireDriver)
- src/server/auth/functions.ts    (signInFn / signOutFn / getSessionFn / acceptInviteFn — server fns the browser calls)
- src/server/auth/middleware.ts   (authRequired / adminOnly / driverOnly — chain on createServerFn)
- src/server/storage/             (uploadDoc / getSignedUrl / deleteBlob)
- src/server/ai/                  (extractCdl / extractMedicalCard via AI Gateway)
- src/routes/login/               (BARE scaffold — do NOT redesign per brief §3.4)
- src/routes/accept-invite/$token (BARE scaffold — same rule)

Once unblocked, begin sub-task 3.1 (QueryBoundary). Then 3.2 in resource priority order: drivers + trucks → brokers → loads → documents → notifications/audit → invoices/pay.

Priority callouts that affect ordering:
- §3 storage caveat: build src/server/functions/documents/download.ts (auth-gated stream-through) BEFORE any documents UI, because getSignedUrl is a pass-through. The cookbook §11.4 has a complete example.
- §1.x invariant: loads cannot transition to 'completed' while driverPayCents IS NULL — gate this in loadsService.updateStatus().

You may NOT edit anything outside the file ownership listed in §2 of your brief. If you need a schema, auth, storage, or AI helper change, stop and ask the orchestrator. The contract is LOCKED — do not edit src/server/db/schema or src/server/auth without orchestrator approval.

Verification gate: `npm run typecheck && npm run build` clean before marking any sub-task done. Commit and push to feat/admin-wiring. Do not merge to main.

Confirm you've pulled feat/infra-auth, run npm install + typecheck clean, and read §1.x + §9 + §11 of the contract lock — then proceed to 3.1.
```

---

## Session 3 — Driver Portal + Upload UX (READY 2026-04-26)

```
You are Claude Session 3 — Driver Portal + Upload UX. You are running inside worktree ../ptl-driver on branch feat/driver-portal.

Your full brief is sprint-docs/11-DRIVER-PORTAL.md. The shared contract is sprint-docs/12-CONTRACTS-LOCK.md.

UNBLOCKED as of 2026-04-26. Session 1 has shipped feat/infra-auth and §1–6 of the contract are LOCKED. Pull origin/feat/infra-auth into your worktree first — your worktree was created from main and does not yet have the schema, auth helpers, storage helper, or AI helper.

  cd ../ptl-driver
  git fetch origin
  git merge origin/feat/infra-auth   # or rebase, your call
  npm install                        # pulls drizzle-orm, better-auth, @vercel/blob, ai, etc.

Read in order:
1. sprint-docs/00-ROADMAP.md
2. sprint-docs/11-DRIVER-PORTAL.md (your brief)
3. sprint-docs/12-CONTRACTS-LOCK.md — and pay special attention to:
     §1.x  Service-layer invariants
     §4    AI helper contract (extractCdl, extractMedicalCard — null on failure, your job to fall back to manual form)
     §9    Five deviations Session 1 made
     §11   Cookbook — §11.2 (driver-scoped server function) and §11.4 (upload + view flow) are most relevant
4. 06-ONBOARDING-FLOW.md
5. src/components/onboarding/PhotoCapture.tsx (the file you're rewriting)

What Session 1 already shipped that you'll be importing from:
- src/server/db/                  (driver_profiles + documents + driver_locations all there)
- src/server/auth/api.ts          (requireDriver throws if not driver; SessionUser includes driverId for drivers)
- src/server/auth/middleware.ts   (driverOnly is the one you'll lean on)
- src/server/storage/             (uploadDoc with the path convention enforced — see §3 for the exact paths)
- src/server/ai/                  (extractCdl / extractMedicalCard — call from the photo step, retry cap is 2)

Once unblocked, begin sub-task 3.1 (Driver shell + auth gate), then 3.2 (driver routes), then 3.3 (real PhotoCapture), then 3.4 (server-backed OnboardingProvider).

Priority callouts that affect ordering:
- §1.x driver-view queries: NEVER expose loads.rate or broker fields to a driver. Use dedicated getLoadDriverView() service functions that physically select only safe columns (per 05-TECH-CONTRACTS §6.1).
- §4 cost guard: track AI helper calls per onboarding session in your provider state and warn if it exceeds 4. The helper itself does NOT track this.
- §3 caveat: getSignedUrl is a pass-through. Document VIEWING needs Session 2's download endpoint (src/server/functions/documents/download.ts). Coordinate with the orchestrator if Session 2 hasn't shipped it by the time you need it.

You may NOT edit anything outside the file ownership listed in §2 of your brief. If you need empty-copy keys, file the request via orchestrator (see your brief §3.5). If you need a schema/auth/storage/AI change, the contract is LOCKED — stop and ask the orchestrator.

Verification gate: `npm run typecheck && npm run build` clean before marking any sub-task done. Commit and push to feat/driver-portal. Do not merge to main.

Confirm you've pulled feat/infra-auth, run npm install + typecheck clean, and read §11.2 + §11.4 of the contract lock — then proceed to 3.1.
```

---

## Orchestrator handoff protocol

Session 1 is done. §1–6 of the contract are LOCKED (2026-04-26). Sessions 2 + 3 are unblocked.

**Remaining orchestrator steps:**

When Session 2 says "done":
1. Pull `feat/admin-wiring`, run `npm run typecheck && npm run build` on the merged tree
2. Verify against §4 final smoke checklist in `10-ADMIN-WIRING.md`
3. Approve, but **do not merge to main yet** — wait for Session 3

When Session 3 says "done":
1. Pull `feat/driver-portal`, run gate
2. Verify against §4 final smoke checklist in `11-DRIVER-PORTAL.md`
3. Merge `feat/infra-auth` → main first, then `feat/admin-wiring` → main, then `feat/driver-portal` → main (driver may have minor merge conflicts in shared route registry — re-run codegen after resolution)
4. Run gate on merged main
5. Finish Session 1 sub-task 3.7 (Vercel deploy):
   - `vercel link` from main repo
   - Push env vars to Vercel project (DATABASE_URL, BETTER_AUTH_SECRET, BLOB_READ_WRITE_TOKEN, AI_GATEWAY_API_KEY, ADMIN_SEED_EMAIL/PASSWORD)
   - Deploy preview, capture the preview URL, set `BETTER_AUTH_URL` in Vercel, redeploy
   - Run `npm run seed:admin` against the production DB (or rely on the seed running locally — Gary already exists)
6. Run final acceptance smoke from `00-ROADMAP.md` §5
7. Hand link to Gary

**If a session needs a contract change mid-flight:** that's a version bump on this doc + a notification to the other active sessions. Do not let a session edit a LOCKED section unilaterally.
