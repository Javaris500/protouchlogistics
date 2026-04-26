# Tonight's Demo Script

**Audience:** Gary
**Duration:** ~30 minutes
**Goal:** Show the cockpit. Set expectations: real data Sunday/Monday.
**State:** Frontend-only. Empty data. Onboarding has Skip buttons.

---

## 1. Open the demo

Run locally:

```
npm run dev
```

Browser at `http://localhost:5173`.

The honest framing — say it out loud:

> "What you're about to see is the entire cockpit you'll work in. Every screen is real, every interaction works. The data is empty because we haven't connected the database yet — we do that this weekend. By Monday you'll be logging in, inviting your first driver, and dispatching a real load."

That's the whole pitch. Don't oversell.

---

## 2. Tour order

| # | Screen | What to point at | Talk track |
|---|---|---|---|
| 1 | `/admin/dashboard` | KPIs at zero, empty widgets | "This is what you see every morning. Active loads, expiring docs, today's activity, onboarding queue, fleet on map." |
| 2 | `/admin/loads` → New load | Form fields including driver pay | "Book a load, assign a driver, set their pay. The pay is editable until you mark it complete — then it locks." |
| 3 | `/admin/drivers` → Invite driver | Invite dialog | "You'll click this and put in their email. They get a link, walk through onboarding on their phone, show up here for your approval." |
| 4 | `/onboarding` walkthrough | Hit Skip on each step | "This is what your driver does. Photo of the CDL, photo of the medical card, sign. Five minutes, no typing — we OCR the photos and auto-fill." |
| 5 | `/admin/drivers/pending` | Empty queue | "After they finish, they land here. You approve, they're working." |
| 6 | `/admin/documents` | Empty library | "Every document — CDL, medical, BOL, POD, rate confs — lives here with expiration warnings. Upload from this page or any driver/truck/load detail." |
| 7 | `/admin/invoices` → New invoice | Empty unbilled list | "When loads complete you cut an invoice in two clicks. PDF generated, sent to broker, aging tracked." |
| 8 | `/admin/pay` | Empty pay periods | "Pay rolls up by week per driver. You see the total, you mark it paid." |
| 9 | `/admin/tracking` | Empty map | "Once a driver starts a run, you see them here in real time." |
| 10 | `/admin/settings/integrations` | Not connected list | "These are the outside services we wire up — Postgres, Blob, email, maps. After this weekend they'll all be green." |

---

## 3. Questions for Gary while he's watching

Capture answers verbatim into `./00-ROADMAP.md` §7 decision log.

1. **Document inventory** — anything missing from the doc types in `../08-PRINTING.md` §3?
2. **Photo capture** — Gary uploads CDL/medical, or driver does it during onboarding? (Default: driver during onboarding.)
3. **Pay frequency** — weekly Friday default. Confirm or change.
4. **Epson Connect printer email** — defer to Phase 2 unless Gary brings it up.
5. **Daily flow gaps** — any screen we haven't built that he uses every day?

---

## 4. Hand off

End with:

> "I'll text you a login link by Monday morning. First thing you do is invite yourself a test driver and walk through it from their side. If that loop works, we're live."

Don't promise specific features beyond:
- Auth + driver invite
- First load creation
- First document upload
- Driver completes onboarding + accepts a load

Everything else is bonus for Week 2.
