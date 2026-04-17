# ProTouch Logistics — Routes, Features & UX Spec

This doc is the source of truth for every page, every route guard, and the workflows behind them. Pair this with `02-DATA-MODEL.md`.

---

## 1. Route map

### Public (no auth)

**There is no public landing page.** PTL is a private internal platform — Gary never wants a marketing surface. Hitting the app's root URL either sends you to `/login` or straight into your app shell by role. No index page, no marketing copy, no "learn more" — the domain resolves to authentication or nothing.

| Route | Purpose |
|---|---|
| `/` | **Not a page.** `beforeLoad` reads the session and redirects: unauthenticated → `/login`; admin → `/admin/dashboard`; driver (onboarding complete + active) → `/dashboard`; driver (onboarding incomplete) → `/onboarding/profile`; driver (pending approval) → `/onboarding/pending`. |
| `/login` | Email + password login. Sole unauthenticated entry point. Redirects logged-in admins to `/admin/dashboard`, drivers to `/dashboard`. |
| `/forgot-password` | Request reset email. |
| `/reset-password?token=...` | Set new password. |
| `/invite/$token` | Driver accepts invite, sets password. Redirects to onboarding on success. |
| `*` (any other unknown path) | Renders a branded 404. No "Go to homepage" link — CTA is "Go to sign in" if unauthenticated, "Go to dashboard" if authenticated. |

### Driver-only (`role=driver`, onboarding complete, status=active)

| Route | Purpose |
|---|---|
| `/onboarding/profile` | Personal info form |
| `/onboarding/license` | CDL details + upload |
| `/onboarding/medical` | Medical card upload |
| `/onboarding/review` | Summary + submit for approval |
| `/onboarding/pending` | "Waiting for Gary to approve" screen |
| `/dashboard` | Current load, next load, quick status update |
| `/loads` | My loads, filterable by status |
| `/loads/$loadId` | Load detail, status updates, documents |
| `/documents` | My driver docs + expirations |
| `/pay` | Per-load pay, period totals |
| `/profile` | Edit limited fields (phone, address, emergency contact) |
| `/settings` | Password change, 2FA toggle (if available), logout |

### Admin-only (`role=admin`)

| Route | Purpose |
|---|---|
| `/admin/dashboard` | KPIs, expiring docs, active loads widget, mini live map |
| `/admin/loads` | All loads table |
| `/admin/loads/new` | Create load |
| `/admin/loads/$loadId` | Full load detail + edit |
| `/admin/drivers` | All drivers table |
| `/admin/drivers/invite` | Send invite |
| `/admin/drivers/pending` | Onboarding submissions awaiting approval |
| `/admin/drivers/$driverId` | Driver profile, docs, history, pay |
| `/admin/trucks` | All trucks table |
| `/admin/trucks/new` | Add truck |
| `/admin/trucks/$truckId` | Truck detail + docs |
| `/admin/brokers` | All brokers table |
| `/admin/brokers/new` | Add broker |
| `/admin/brokers/$brokerId` | Broker detail, load history, invoices |
| `/admin/tracking` | Full-screen live map, all active drivers |
| `/admin/documents` | Global document library + expiration dashboard |
| `/admin/invoices` | Invoice list |
| `/admin/invoices/new` | Create invoice from completed loads |
| `/admin/invoices/$invoiceId` | Invoice detail, send, mark paid |
| `/admin/pay` | Driver pay overview, per-driver drilldown, export |
| `/admin/notifications` | Full notifications view |
| `/admin/settings` | Company info, preferences |
| `/admin/settings/audit` | Audit log viewer |

### Route guards (TanStack Start `beforeLoad`)

```ts
// Admin layout
beforeLoad: async ({ context }) => {
  const session = await requireSession(context);
  if (session.user.role !== 'admin') throw redirect({ to: '/dashboard' });
  if (session.user.status !== 'active') throw redirect({ to: '/login' });
}

// Driver layout (post-onboarding)
beforeLoad: async ({ context }) => {
  const session = await requireSession(context);
  if (session.user.role !== 'driver') throw redirect({ to: '/admin/dashboard' });
  if (session.user.status === 'pending_approval') throw redirect({ to: '/onboarding/pending' });
  if (session.user.status !== 'active') throw redirect({ to: '/login' });
  if (!session.driverProfile?.onboardingCompletedAt) throw redirect({ to: '/onboarding/profile' });
}

// Onboarding layout
beforeLoad: async ({ context }) => {
  const session = await requireSession(context);
  if (session.user.role !== 'driver') throw redirect({ to: '/admin/dashboard' });
  if (session.driverProfile?.onboardingCompletedAt && session.user.status === 'active') {
    throw redirect({ to: '/dashboard' });
  }
}
```

Every guard runs **server-side** via `beforeLoad`. Never rely on client-only checks.

---

## 2. Key workflows

### 2.1 Driver invite & onboarding (Option A)

1. Gary goes to `/admin/drivers/invite`, enters email.
2. System creates `users` row with `status=invited`, creates `invites` row with token, emails link.
3. Driver clicks link → lands on `/invite/$token` → sets password → `status=invited`, session created, redirected to `/onboarding/profile`.
4. Driver completes: profile → license → medical → review.
5. On review submit: `driver_profiles.onboardingCompletedAt = now()`, `users.status = pending_approval`, notification fired to Gary, driver redirected to `/onboarding/pending`.
6. Gary sees pending approval in `/admin/drivers/pending`, reviews submission + uploaded docs.
7. Gary clicks **Approve** → `users.status = active`, `driver_profiles.approvedAt = now()`, `approvedByUserId = gary`, notification to driver, email to driver.
8. Driver's next page load redirects them to `/dashboard`.
9. Gary can also **Reject** with a reason, which flips back to `invited` status with a message to redo a section.

### 2.2 Creating a load

On `/admin/loads/new`:

1. Pick broker (searchable dropdown, + "Add new broker" inline)
2. Pickup address (Google Places autocomplete → fills lat/lng), pickup window start/end
3. Delivery address + window
4. Commodity, weight (optional), pieces (optional)
5. Rate (dollars, converted to cents server-side), miles (optional but required if any assigned driver has per-mile pay)
6. Reference number, special instructions
7. Assign driver (optional at create time, can leave as draft)
8. Assign truck (auto-suggests driver's default truck)
9. Upload rate confirmation (optional at create, required before assigning)

On save:
- `loadNumber` auto-generated
- `status = draft` if no driver assigned, else `assigned`
- Creates 2 `load_stops` rows (sequence 1 = pickup, sequence 2 = delivery)
- Audit logged
- If status becomes `assigned`, notification + email to driver

### 2.3 Load status workflow

```
draft ─────────► assigned ─► accepted ─► en_route_pickup ─► at_pickup ─► loaded
                                                                            │
                                                                            ▼
                                                          en_route_delivery ─► at_delivery
                                                                                   │
                                                                                   ▼
                                                                              delivered ─► pod_uploaded ─► completed
                                                                                                     ▲
                                                              (admin can cancel at any point) ──► cancelled
```

**Who can trigger what:**
- `draft → assigned`: admin (by assigning a driver)
- `assigned → accepted`: driver (from their load detail)
- `accepted → en_route_pickup`: driver (starts GPS tracking)
- `en_route_pickup → at_pickup`: driver (auto-suggested by geofence, manual confirm)
- `at_pickup → loaded`: driver
- `loaded → en_route_delivery`: driver
- `en_route_delivery → at_delivery`: driver
- `at_delivery → delivered`: driver
- `delivered → pod_uploaded`: driver (requires POD file upload)
- `pod_uploaded → completed`: admin OR auto after 24h
- `* → cancelled`: admin only, requires reason

Admin can jump any transition; must provide reason; logged to audit + `load_status_history.reason`.

Each transition writes a `load_status_history` row with the driver's current lat/lng if available.

On `completed`, create `driver_pay_records` row using current pay model snapshot.

### 2.4 Document expiration monitoring

Nightly cron (midnight admin TZ):

```ts
for each driver in active drivers:
  check cdlExpiration, medicalCardExpiration
for each truck in active trucks:
  check registrationExpiration, insuranceExpiration, annualInspectionExpiration

for each expiration:
  days_until = date_diff(expiration, today)
  if days_until in [60, 30, 14, 7]:
    if no notification already sent for this document + threshold:
      create notification for Gary
      if threshold in [30, 14, 7]: send email
  if days_until < 0 and not already notified "expired":
    create notification "document_expired"
    send email to Gary
    if driver CDL or medical: mark driver_profile.canAcceptNewLoads = false
```

The `canAcceptNewLoads` flag is computed on read, not stored — or stored as a derived column if we want it indexed. Pick one at implementation time.

When driver tries to accept a load with expired docs: server function refuses with a clear error. UI shows banner on driver dashboard.

### 2.5 GPS tracking flow

**Client side (driver browser):**

- When load status becomes `en_route_pickup`, driver's tab requests Geolocation permission if not granted.
- A background interval posts `{lat, lng, accuracy, heading, speed, recordedAt}` to `/api/tracking/post` every 45s OR when moved >200m.
- Visible "Tracking active" badge in the top nav.
- When load status becomes `delivered`, interval stops.
- If driver closes tab: tracking pauses. Reopening tab resumes if load still active.

**Server side:**

- `POST /api/tracking/post` — rate limited to 4 req/min per driver (allows for 45s cadence + bursts), validates session, inserts into `driver_locations`.
- Returns current `load.status` so client can self-stop if status changed elsewhere.

**Admin side:**

- `/admin/tracking` page subscribes to a polling query (every 20s) that returns the most recent `driver_locations` row per active driver.
- Clicking a driver opens side panel with their current load, ETA (if computed), and a "Show breadcrumbs" toggle that overlays the full path for the current load.
- Use Mapbox GL JS with a custom dark/light style matching our theme.

**Privacy:**
- Tracking ONLY happens during active loads. No passive tracking.
- Driver sees visible indicator at all times while tracking.
- Driver profile page has "View my tracking history" (read-only, same as what Gary sees).

### 2.6 Invoicing flow

On `/admin/invoices/new`:

1. Pick broker → system shows all `completed` loads for that broker that are not on a non-void invoice.
2. Select loads via checkboxes.
3. Optionally add manual line items (detention, lumper reimbursement, etc.).
4. Review auto-calculated subtotal, add adjustments if any, review total.
5. `issueDate` defaults to today, `dueDate` auto-calculated from broker's payment terms.
6. **Save as draft** or **Generate & send**.

On generate:
- PDF generated server-side with company letterhead (logo + address) and line items
- PDF uploaded to storage
- If "send": email to broker's `billingEmail` with PDF attached, `invoices.status = sent`, `sentAt` set
- Loads now "locked" to this invoice

On `/admin/invoices/$invoiceId`:
- View PDF inline
- Resend email
- **Mark paid** action: input amount, method, payment date → `status = paid`
- Void action: `status = void`, confirmation required

Overdue: nightly job flips `sent` invoices past `dueDate` to `overdue` and notifies Gary.

### 2.7 Driver pay flow

- Gary sets pay model + rate per driver on driver profile.
- Every completed load auto-generates `driver_pay_records`.
- Driver sees on `/pay`:
  - Current pay period (default: this week, Mon-Sun)
  - List of completed loads with amount
  - Period total
  - Previous periods (paginated)
- Driver does NOT see: the load's rate, the broker name, adjustments Gary hasn't communicated.
- Gary sees on `/admin/pay`:
  - Per-driver totals for selected period
  - Drilldown to individual pay records, with ability to add adjustments (bonus, deduction) with notes
  - Export CSV for payroll
  - Settlement status (`unpaid`, `paid`) toggle — this can live on `driver_pay_records` as a `paidAt` column added to schema if needed

### 2.8 Document upload (everywhere)

Reusable `<DocumentUpload>` component:

- Drag-drop or click to upload
- Client-side MIME + size check (fast fail)
- Server-side re-validation (secure)
- Upload goes directly to R2 via signed URL (so browser → storage, not through our server)
- After upload, client calls `confirmUpload` server function which inserts the `documents` row
- Shows progress bar, success state, replace option
- For expirable types: expiration date picker is required

---

## 3. Page-by-page UX notes

### `/login`
- Centered card, logo at top, email + password, "Forgot password?" link
- Subtle branded background (dark: logo's navy, light: stone-50)
- On error: inline field errors, never a generic toast for auth issues (too vague)

### `/admin/dashboard`
Grid of widgets:
- **KPI row (4 cards):** Active loads, Completed this week, Drivers on road now, Invoices outstanding ($)
- **Expiring soon** — table of documents expiring in next 60 days, color-coded by urgency
- **Active loads** — compact list with status pills, click to load detail
- **Live map preview** — small Mapbox map with dots, "Open full map" CTA → `/admin/tracking`
- **Recent activity** — audit feed, last 20 events

### `/admin/loads` (list)
- Filters: status (chips), driver, broker, date range, text search (load number, reference, BOL)
- Columns: load #, status, pickup city → delivery city, pickup date, driver, rate, broker
- Row click → detail
- Sticky header, virtualized if >100 rows
- Bulk actions: export CSV

### `/admin/loads/$loadId`
- Header: load number, status pill, action buttons (Edit, Cancel, Override Status)
- Two-column layout on desktop, stacked on mobile
- Left column: pickup + delivery cards with maps, commodity/weight, special instructions
- Right column: driver + truck (swap buttons), broker + rate, documents, status history timeline
- Bottom: breadcrumb map for this specific load (once GPS data exists)

### `/admin/tracking`
- Full-viewport Mapbox map
- Side panel (collapsible): list of active drivers with current status
- Click driver → zoom to their position, show info card with load #, status, last update time
- "Show breadcrumbs" toggle per driver
- Auto-refresh every 20s, manual refresh button

### `/dashboard` (driver)
- Mobile-first. Large touch targets.
- **Current load card** (if any): load number, pickup/delivery, big primary-color status advance button
- **Next load card** (if any): starts in X hours
- **Alerts:** expiring docs banner, pending approval banner, etc.
- **Quick links:** My loads, My documents, My pay

### `/loads/$loadId` (driver view)
- Stripped-down version of admin load detail:
  - NO rate visible
  - NO broker name visible
  - NO other drivers visible
- Large status advance button that does the right thing based on current status
- Upload POD button when at `delivered` status
- Documents attached to this load: rate con hidden, BOL + any Gary-uploaded docs visible

### `/pay` (driver)
- Period selector (this week, last week, custom)
- Total at top, large number
- List of completed loads with their pay amounts
- Tap for breakdown: pay model used, calculation, adjustments with Gary's notes

---

## 4. Responsive strategy

- **Admin:** desktop-first, usable on tablet, minimum viable on mobile (Gary might check on his phone but primary use is laptop)
- **Driver:** mobile-first, all primary actions must work thumb-only, large touch targets (min 44×44px), bottom nav bar on mobile
- **Breakpoints:** Tailwind defaults — `sm 640`, `md 768`, `lg 1024`, `xl 1280`

---

## 5. Notification matrix

| Event | To | In-app | Email |
|---|---|:---:|:---:|
| Driver invited | Driver | — | ✓ |
| Driver completes onboarding | Gary | ✓ | ✓ |
| Driver approved | Driver | ✓ | ✓ |
| Driver rejected | Driver | ✓ | ✓ |
| Load assigned | Driver | ✓ | ✓ |
| Load accepted | Gary | ✓ | — |
| Load status changed | Gary | ✓ | — |
| Load delivered | Gary | ✓ | ✓ |
| POD uploaded | Gary | ✓ | — |
| Doc expiring in 60d | Gary | ✓ | — |
| Doc expiring in 30d | Gary | ✓ | ✓ |
| Doc expiring in 14d | Gary | ✓ | ✓ |
| Doc expiring in 7d | Gary | ✓ | ✓ |
| Doc expired | Gary | ✓ | ✓ |
| Invoice sent | Gary | ✓ | — |
| Invoice paid | Gary | ✓ | ✓ |
| Invoice overdue | Gary | ✓ | ✓ |

---

## 6. Error, loading, empty states (mandatory)

Every list: must handle 3 states.

- **Loading:** skeleton rows matching final layout, not a generic spinner.
- **Empty:** illustration/icon + one-line explanation + primary CTA to create the first one (if relevant).
  - e.g. `/admin/loads` empty: "No loads yet. Your dispatched loads will appear here." + [Create Load] button.
- **Error:** explanation + retry button + Sentry event ID in small text for support.

Every form: disabled submit while submitting, inline field errors on Zod failure, toast on success.

---

## 7. Accessibility baseline (do not skip)

- All form inputs have labels
- All buttons have accessible names
- Color contrast: AA minimum for all text
- Focus states visible on keyboard navigation
- `prefers-reduced-motion` respected — no auto-play animations, no heavy parallax
- Map is a supplement, never the only way to get data — always a list view alongside

---

## 8. Seed / demo data

There are **two separate seed paths**. Do not merge them.

### 8.1 Production bootstrap — `seeds/bootstrap.ts`

Runs exactly once, against the production DB, on first deploy. Idempotent — re-running is a no-op if Gary's admin already exists.

Creates:
- **Gary's admin user** — email + initial password pulled from `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` env vars (see `05-TECH-CONTRACTS.md §4.2`). Password is hashed by Better Auth, stored on `users.passwordHash`. `role='admin'`, `status='active'`, `emailVerified=true`. No driver profile row.
- **Company settings row** — timezone, logo placeholder, company info pulled from `BOOTSTRAP_COMPANY_*` env vars.

No drivers, no trucks, no brokers, no loads. Gary starts with a completely empty app and invites his own drivers.

After first successful login, Gary is told (in the onboarding video + admin guide) to:
1. Immediately change his password via `/settings`
2. Enable 2FA via `/settings`
3. Delete `BOOTSTRAP_ADMIN_PASSWORD` from the environment

The bootstrap script refuses to run if `NODE_ENV=development` — dev uses `seeds/demo.ts` instead.

### 8.2 Demo seed — `seeds/demo.ts`

Runs only locally. Creates:
- Gary as admin (password `demo1234`, clearly marked as dev-only)
- 3 sample drivers in various states (invited, pending_approval, active)
- 2 trucks
- 3 brokers
- 5 sample loads across different statuses
- Sample documents (placeholder PDFs)
- Recent breadcrumb data for one driver

Used for local dev, screencast demos, and Gary's training session. Hard-refuses to run if `NODE_ENV=production` or if `DATABASE_URL` points to a Neon prod branch.

---

## 9. Definition of Done (per route)

A route is not "done" until:

- [ ] All three states (loading, empty, error) implemented
- [ ] Works on mobile (narrow viewport) and desktop
- [ ] Dark + light mode both tested
- [ ] Route guard enforced server-side
- [ ] Every mutation writes to audit_log
- [ ] Every input Zod-validated server-side
- [ ] No placeholder copy, no Lorem Ipsum, no TODO comments in shipped code
- [ ] Manual QA pass with a driver account AND an admin account
- [ ] Sentry captures errors end-to-end

---

## 10. Open questions for Gary

Have answers to these before Week 3:

1. What's the company's legal mailing address for invoices?
2. Does he have an MC number + DOT number to print on invoices?
3. Preferred domain for email sending (dispatch@... vs billing@...)?
4. Timezone for cron jobs and expiration alerts (his local TZ)?
5. Does he want his phone number on invoices?
6. Bank details / remit-to info for invoices?
7. Approval over invoice PDF template before Week 5?
