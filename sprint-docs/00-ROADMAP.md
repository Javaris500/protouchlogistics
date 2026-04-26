# ProTouch Logistics — Build Roadmap

**Status:** Active
**Date:** 2026-04-26
**Orchestrator:** main session
**Sessions:** 3 parallel Claude sessions, each in its own git worktree

---

## 1. Locked decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Framework | Vite → TanStack Start | Server functions, keep existing routes |
| 2 | Auth | Better Auth | Free, self-hosted, no SaaS lock |
| 3 | File storage | Vercel Blob | Private storage, signed URLs, unified billing |
| 4 | Deploy | Vercel app + Railway Postgres | Vercel free tier; Railway $5 hobby for DB only |
| 5 | "Gary creds" | App login only | Secrets vault deferred to Phase 2 |
| 6 | OCR | Claude Haiku 4.5 via AI Gateway | ~$0.10 lifetime cost at 5 drivers |
| 7 | Tonight | Demo + sprint | Demo Gary tonight, ship real app Sun/Mon |
| 8 | Branching | Worktrees, one per session | Zero file-conflict risk |

---

## 2. Session model

```
                ┌──────────────────────┐
                │ Session 1: Foundation│
                │ Infra + DB + Auth    │
                └─────────┬────────────┘
                          │ contract lock
                          ▼
              ┌───────────┴───────────┐
              ▼                       ▼
    ┌──────────────────┐    ┌──────────────────┐
    │ Session 2: Admin │    │ Session 3: Driver│
    │     wiring       │    │ portal + upload  │
    └──────────────────┘    └──────────────────┘
```

| Session | Brief | Worktree | Branch |
|---|---|---|---|
| 1 | `09-INFRA-AND-AUTH.md` | `../ptl-infra` | `feat/infra-auth` |
| 2 | `10-ADMIN-WIRING.md` | `../ptl-admin` | `feat/admin-wiring` |
| 3 | `11-DRIVER-PORTAL.md` | `../ptl-driver` | `feat/driver-portal` |

Worktree setup (run once from this repo):

```
git worktree add ../ptl-infra  -b feat/infra-auth
git worktree add ../ptl-admin  -b feat/admin-wiring
git worktree add ../ptl-driver -b feat/driver-portal
```

Each session is launched from inside its own worktree with `claude` and given its brief filename + `12-CONTRACTS-LOCK.md` as the only docs that authoritatively scope its work.

---

## 3. Dependency graph

Session 1 is the bottleneck. Sessions 2 and 3 may **prep** in parallel against the contract draft, but **may not commit code that imports from `src/server/**` until the contract is locked**.

| Phase | What | Who |
|---|---|---|
| 0 | Pre-flight: Vercel CLI, Railway DB, Vercel project, env keys | Human |
| 1 | Foundation | Session 1 |
| Lock | Orchestrator freezes `12-CONTRACTS-LOCK.md` v1 | Orchestrator |
| 2a | Admin wiring | Session 2 |
| 2b | Driver portal + upload | Session 3 |
| Merge | Orchestrator merges 1 → main, then 2 + 3 | Orchestrator |
| Verify | typecheck + build green on `main` + Vercel preview smoke | Orchestrator |

---

## 4. Schedule

| Time (chronological) | What |
|---|---|
| Tonight T+0 | Demo Gary using `13-TONIGHT-DEMO-SCRIPT.md` |
| Tonight T+1h | Pre-flight: Vercel CLI install, Railway DB created, Vercel project linked |
| Day 1 morning | Session 1 begins |
| Day 1 evening | Session 1 wraps; orchestrator reviews + locks contract |
| Day 2 morning | Sessions 2 & 3 begin in parallel |
| Day 2 evening | Both sessions wrap; orchestrator merges to `main`, deploys preview |
| Day 3 morning | Gary onboards as first driver against live preview URL |

Realistic ship to Gary: **end of Day 2** (Sunday or Monday EOD), with Day 3 as buffer for fix-ups.

---

## 5. Verification gate

Every session ends every committed task with:

```
npm run typecheck   # must be clean
npm run build       # must be clean
```

Sessions do **not** merge to `main` directly. They push their branch and request orchestrator review. Orchestrator runs the gate on the merged tree before approving.

Final acceptance smoke (orchestrator owns):
- Gary logs in to deployed Vercel preview
- Gary invites a test driver
- Test driver completes onboarding (CDL + medical photos, OCR fires, fields prefill)
- Gary approves the driver
- Gary creates a broker, a truck, a load, assigns the driver, sets pay
- Driver sees the load, marks Picked Up
- Driver uploads BOL
- Gary sees the BOL on the load detail
- Gary marks complete (gate enforces `driverPayCents IS NOT NULL`)
- All 23 EMPTY_COPY surfaces still render correctly when their tables are empty

---

## 6. Risk log

| Risk | Mitigation |
|---|---|
| Vite → TanStack Start migration breaks existing routes | Session 1 §3.2 gates on full route smoke before contract lock |
| Better Auth has rough edges in TanStack Start | Fallback: Auth.js if Better Auth costs > 4h of friction |
| Vercel Blob private SDK changes | Session 1 wraps in `src/server/storage.ts`; callers never import the SDK directly |
| OCR fails on bad photos | Hard cap 2 retries, manual form fallback. Session 3 owns this path |
| Railway $5 credit runs low | Monitor usage day 7; bump to Pro if needed |
| Session 2 + 3 race on shared empty-copy keys | All `empty-copy.ts` edits go through orchestrator |
| Drift docs (02/03/04/06-Backend/06-Frontend) still mention pay model | Session 1 §3.8 strips before contract lock |

---

## 7. Decision log

Append-only. Edit by orchestrator only.

- **2026-04-26** — Locked 8 stack decisions (see §1).
- **2026-04-26** — Three-session worktree model adopted.
- **2026-04-26** — Tonight delivers a demo + Phase-1 sprint kickoff. Real ship target: Day 2 EOD.

---

## 8. Out of scope (Phase 2)

These are not part of the current sprint. Capture asks here as Gary surfaces them.

- Secrets vault for Gary's external service credentials (DOT, broker portals, FMCSA)
- Real GPS pings + map tracking
- Email delivery (Resend) — invite link is logged, not sent in v1
- Push notifications
- Printing pipeline (`08-PRINTING.md`)
- Invoicing PDFs (`@react-pdf/renderer`)
- DQF packet merge (`pdf-lib`)
- Driver-side printing
- MFA, password reset (manual reset by Gary in v1)
- Multi-tenant
