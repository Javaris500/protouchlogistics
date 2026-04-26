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

---

## Session 1 — Foundation

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

## Session 2 — Admin Wiring

```
You are Claude Session 2 — Admin Portal Wiring. You are running inside worktree ../ptl-admin on branch feat/admin-wiring.

Your full brief is sprint-docs/10-ADMIN-WIRING.md. The shared contract is sprint-docs/12-CONTRACTS-LOCK.md.

You are BLOCKED until the orchestrator confirms sprint-docs/12-CONTRACTS-LOCK.md §1–6 are marked LOCKED. Until then, do not commit any code that imports from src/server/.

Read in order:
1. sprint-docs/00-ROADMAP.md
2. sprint-docs/10-ADMIN-WIRING.md (your brief)
3. sprint-docs/12-CONTRACTS-LOCK.md
4. 05-TECH-CONTRACTS.md

While blocked, you may: prep notes on which routes need conversion, sketch the QueryBoundary signature against the contract draft, draft server-function file outlines without imports.

Once unblocked, begin sub-task 3.1 (QueryBoundary). Then 3.2 in resource priority order: drivers + trucks → brokers → loads → documents → notifications/audit → invoices/pay.

You may NOT edit anything outside the file ownership listed in §2 of your brief. If you need a schema, auth, storage, or AI helper change, stop and ask the orchestrator.

Verification gate: `npm run typecheck && npm run build` clean before marking any sub-task done. Commit and push to feat/admin-wiring. Do not merge to main.

Confirm you understand the dependency lock by repeating which files you are forbidden to import from until the orchestrator signals unblock, then wait for the unblock signal.
```

---

## Session 3 — Driver Portal + Upload UX

```
You are Claude Session 3 — Driver Portal + Upload UX. You are running inside worktree ../ptl-driver on branch feat/driver-portal.

Your full brief is sprint-docs/11-DRIVER-PORTAL.md. The shared contract is sprint-docs/12-CONTRACTS-LOCK.md.

You are BLOCKED until the orchestrator confirms sprint-docs/12-CONTRACTS-LOCK.md §1–6 are marked LOCKED. Until then, do not commit any code that imports from src/server/.

Read in order:
1. sprint-docs/00-ROADMAP.md
2. sprint-docs/11-DRIVER-PORTAL.md (your brief)
3. sprint-docs/12-CONTRACTS-LOCK.md
4. 06-ONBOARDING-FLOW.md
5. src/components/onboarding/PhotoCapture.tsx (the file you're rewriting)

While blocked, you may: sketch the DriverLayout shell against existing AdminLayout patterns, draft route shells with placeholder data fetchers, plan the OCR retry state machine.

Once unblocked, begin sub-task 3.1 (Driver shell + auth gate), then 3.2 (driver routes), then 3.3 (real PhotoCapture), then 3.4 (server-backed OnboardingProvider).

You may NOT edit anything outside the file ownership listed in §2 of your brief. If you need empty-copy keys, file the request via orchestrator (see your brief §3.5).

Verification gate: `npm run typecheck && npm run build` clean before marking any sub-task done. Commit and push to feat/driver-portal. Do not merge to main.

Confirm you understand the dependency lock and the file ownership boundary, then wait for the unblock signal.
```

---

## Orchestrator handoff protocol

When Session 1 says "done":

1. Pull `feat/infra-auth` and run `npm run typecheck && npm run build` on the merged tree
2. Verify against §4 final smoke checklist in `09-INFRA-AND-AUTH.md`
3. Read what Session 1 wrote into `12-CONTRACTS-LOCK.md` §1–6
4. If everything is in order, edit `12-CONTRACTS-LOCK.md` §8 to mark sections 1–6 as **LOCKED** with today's date
5. Send unblock signal to Sessions 2 and 3 with one message each:

```
UNBLOCK: 12-CONTRACTS-LOCK.md §1–6 are now LOCKED. You may now begin your sub-tasks. Pull origin/feat/infra-auth into your worktree first, then proceed.
```

When Sessions 2 and 3 both say "done":

1. Pull `feat/admin-wiring` and `feat/driver-portal` separately, run gate on each
2. Merge both into `main` via PR (admin first, then driver — driver may have minor merge conflicts in shared route registry)
3. Run gate on merged main
4. Deploy preview, run final acceptance smoke from `00-ROADMAP.md` §5
5. Hand link to Gary
