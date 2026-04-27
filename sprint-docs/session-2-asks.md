# Session 2 → Orchestrator asks

Pending requests for cross-cutting changes Session 2 cannot make per brief §2 / §5.

---

## A1 — Add `pay_changed` to `notificationType` enum (BLOCKER for §3.4 rule 3)

**Problem.** `12-CONTRACTS-LOCK §1.x` requires the loads service to fire a `pay_changed` notification whenever `loads.driverPayCents` is mutated post-creation (per `05-TECH-CONTRACTS §9.5` + `§9.10`). The notification's `type` enum value `pay_changed` exists in the spec at `05-TECH-CONTRACTS §9.10`, but the actual `notificationType` Drizzle enum shipped by Session 1 (`src/server/db/schema/_enums.ts`) does not include it:

```ts
// Current values:
"load_assigned" | "load_accepted" | "load_status_changed" | "load_delivered"
| "document_expiring_60" | "document_expiring_30" | "document_expiring_14" | "document_expiring_7" | "document_expired"
| "driver_onboarding_submitted" | "driver_approved" | "driver_rejected"
| "invoice_sent" | "invoice_paid" | "invoice_overdue"
| "system"
// missing: "pay_changed"
```

Inserting a `notifications` row with `type: 'pay_changed'` will fail Postgres enum validation at runtime.

**Why I can't fix it.** Brief §5: "Need a schema change? File a request with orchestrator. Do **not** edit `src/server/db/schema.ts` yourself."

**Asks.**
1. Append `pay_changed` to the `notificationType` enum in `src/server/db/schema/_enums.ts`.
2. Generate a follow-on Drizzle migration (`drizzle/0001_pay_changed_notification.sql`) — `ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pay_changed';`.
3. Apply on Railway. The migration is additive; no data backfill needed.
4. Confirm in this file when done so I can ship sub-task §3.4 rule 3.

**Workaround if denied:** fall back to `type: 'system'` with a discriminator in `metadata.kind = 'pay_changed'`. Lossy for filter UX (admin notif view can't filter "pay changes" without a JSONB scan) but unblocks the sprint. Will not adopt without orchestrator approval.

**Blocks.** Task #7 — server functions for loads (specifically `updateLoadDriverPay`).

---

## A2 — Confirm middleware composition expectations (NON-BLOCKER but tighter contract is better)

`12-CONTRACTS-LOCK §5` says Session 2 builds `requestContext`, `rateLimit`, `audit` middleware "when wiring real feature endpoints". Brief §1 says "every write wraps `requireAdmin()` + audit log entry."

Approach I'll take unless told otherwise:
- `requestContext`: skip in v1 (audit rows write `userAgent`/`ipAddress` as `null` since we don't yet need them for the smoke). Stub middleware lands when the first audit row needs an IP.
- `rateLimit`: skip in v1 — admin is single-user. Re-evaluate when driver portal lands.
- `audit`: NOT a middleware. I'll write `auditService.record(...)` calls inline at the end of every mutation handler so the rows participate in the same DB transaction as the change. A middleware-only approach can't read the post-write entity diff.

Reply if any of these is wrong.

---

## A3 — Confirm `services/` placement (NON-BLOCKER)

Brief §2 lists `src/server/functions/**` as exclusive write but doesn't mention `src/server/services/**` either way. `12-CONTRACTS-LOCK §11.1` cookbook imports from `@/server/services/loads.service`, implying services exist somewhere. I'll create `src/server/services/**` as needed for cross-handler business logic (loads in particular). Flag if you'd rather I co-locate inside `functions/` or under `auth/storage/ai`.

---

## Status

| ID | Status | Date |
|---|---|---|
| A1 | open — blocking task #7 | 2026-04-26 |
| A2 | open — proceeding with stated assumptions | 2026-04-26 |
| A3 | open — proceeding with stated assumptions | 2026-04-26 |
