# ProTouch Logistics — Backend Wiring Plan

**Created:** April 17, 2026
**Purpose:** Complete audit of what exists, what's missing, and a day-by-day plan to wire the backend.

---

## Part 1: Current State Audit

### What's Built (Frontend)

| Layer | Status | Files |
|-------|--------|-------|
| Route pages | 35 pages (26 admin + 9 onboarding) | `src/routes/` |
| React components | 55 components (UI, layout, charts, forms) | `src/components/` |
| Fixture data | 9 mock data files powering all pages | `src/lib/fixtures/` |
| Design system | Tailwind v4 + CSS variables, dark mode, responsive | `src/styles/globals.css` |
| Charts | Recharts with copper theme, 12+ chart types | `src/components/charts/` |
| Forms | 3 dialog forms (invite driver, add truck, add broker) | `src/components/forms/` |
| Onboarding | 7-step multi-screen flow with photo capture | `src/routes/onboarding/` |
| Navigation | Sidebar (desktop) + bottom tabs (mobile) + drawer | `src/components/layouts/` |
| Utilities | Currency/date formatting, CSV export, toast, haptics | `src/lib/` |

### What's NOT Built (Backend)

| Layer | Status | What's Needed |
|-------|--------|---------------|
| Database | Nothing | Drizzle schema, Neon PostgreSQL, migrations |
| Authentication | Nothing | Better Auth, sessions, login/signup pages |
| Server functions | Nothing | 60+ functions per 05-TECH-CONTRACTS.md |
| Validation | Nothing | Zod schemas (shared client + server) |
| File upload | Nothing | R2 presigned URLs, server confirmation |
| Email | Nothing | Resend integration (invites, resets, alerts) |
| GPS tracking | Nothing | Mapbox GL JS, location posting endpoint |
| PDF generation | Nothing | Invoice + settlement PDFs |
| Error tracking | Nothing | Sentry client + server |
| Cron jobs | Nothing | Expiration checks, overdue invoices, auto-complete |
| Audit logging | Nothing | Middleware that wraps every mutation |

### Dependencies Installed vs. Needed

**Already installed:**
- `react`, `react-dom` (v19)
- `@tanstack/react-router`, `@tanstack/react-query`
- `@radix-ui/*` (8 packages)
- `recharts`, `lucide-react`
- `tailwindcss` (v4), `class-variance-authority`, `tailwind-merge`
- `vite`, `typescript`

**Need to install:**

```bash
# Core backend
npm install @tanstack/react-start vinxi zod drizzle-orm postgres
npm install -D drizzle-kit

# Auth
npm install better-auth

# Email
npm install resend

# File storage
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Maps (client-side)
npm install mapbox-gl
npm install -D @types/mapbox-gl

# PDF generation
npm install @react-pdf/renderer

# Error tracking
npm install @sentry/react @sentry/node

# Logging
npm install pino

# Date handling
npm install date-fns date-fns-tz
```

---

## Part 2: Services to Sign Up For

Every service Gary's platform needs. Sign up for all of these before starting backend work.

### 1. Neon (Database)
- **What:** Serverless PostgreSQL hosting
- **URL:** https://neon.tech
- **Plan:** Free tier (0.5 GB storage, enough for Phase 1)
- **You get:** `DATABASE_URL` connection string
- **Setup:** Create a project called "protouchlogistics", create a database called "ptl_production" and "ptl_dev"
- **Why Neon:** Serverless (scales to zero), branching for dev/preview, generous free tier

### 2. Cloudflare R2 (File Storage)
- **What:** S3-compatible object storage for documents, PDFs, photos
- **URL:** https://dash.cloudflare.com (R2 is inside the Cloudflare dashboard)
- **Plan:** Free tier (10 GB storage, 1M reads/month, 100K writes/month)
- **You get:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
- **Setup:** Create a bucket called "ptl-documents". Create an API token with read/write access.
- **Why R2:** Zero egress fees, S3-compatible (same SDK), cheap at scale

### 3. Resend (Email)
- **What:** Transactional email service for invites, resets, alerts, invoices
- **URL:** https://resend.com
- **Plan:** Free tier (100 emails/day, 3,000/month — enough for 5 drivers)
- **You get:** `RESEND_API_KEY`
- **Setup:** Verify Gary's domain (protouchlogistics.com). Set up DNS records (SPF, DKIM, DMARC). Create an API key.
- **Domain email:** `dispatch@protouchlogistics.com` (set as `EMAIL_FROM`)
- **Why Resend:** Simple API, React email templates, good deliverability

### 4. Mapbox (Maps)
- **What:** Map rendering for live tracking, breadcrumbs, load detail maps
- **URL:** https://account.mapbox.com
- **Plan:** Free tier (50,000 map loads/month — more than enough)
- **You get:** `VITE_MAPBOX_ACCESS_TOKEN` (public, client-side)
- **Setup:** Create account, copy the default public token. Optionally create a custom map style matching the orange+gray theme.
- **Why Mapbox:** Best mapping SDK for custom styling, breadcrumb overlays, real-time markers

### 5. Google Cloud Platform (Address Autocomplete)
- **What:** Google Places API for address autocomplete on load creation and onboarding
- **URL:** https://console.cloud.google.com
- **Plan:** $200/month free credit (covers ~40,000 autocomplete requests)
- **You get:** `GOOGLE_PLACES_API_KEY`
- **Setup:** Create a project, enable "Places API (New)", create an API key, restrict it to your domain. Set a billing alert at $10.
- **Why Google Places:** Best US address coverage, better than Mapbox geocoding for autocomplete

### 6. Sentry (Error Tracking)
- **What:** Real-time error tracking + performance monitoring
- **URL:** https://sentry.io
- **Plan:** Free tier (5,000 errors/month, 10K transactions)
- **You get:** `SENTRY_DSN`, `VITE_SENTRY_DSN`
- **Setup:** Create a project for "protouchlogistics" (platform: React + Node.js). Copy DSN.
- **Why Sentry:** Industry standard, free tier is generous, surfaces error IDs to users

### 7. Vercel (Deployment)
- **What:** Hosting + serverless functions + preview deploys
- **URL:** https://vercel.com
- **Plan:** Free tier (hobby) or Pro ($20/month) for custom domains
- **You get:** Deployment URL + environment variable management
- **Setup:** Connect GitHub repo, set all env vars in Vercel dashboard, deploy.
- **Why Vercel:** Mature TanStack Start support, preview per PR, instant rollbacks

### 8. GitHub (Source Control)
- **What:** Git hosting + CI/CD
- **URL:** https://github.com
- **Plan:** Free
- **You get:** Repo URL, Actions CI
- **Setup:** Already using it (Javaris0629). Ensure the repo is private.

### Quick reference card (save this):

| Service | URL | Env Var(s) | Free Tier |
|---------|-----|-----------|-----------|
| Neon | neon.tech | `DATABASE_URL` | 0.5 GB |
| Cloudflare R2 | dash.cloudflare.com | `R2_*` (4 vars) | 10 GB |
| Resend | resend.com | `RESEND_API_KEY` | 3K emails/mo |
| Mapbox | mapbox.com | `VITE_MAPBOX_ACCESS_TOKEN` | 50K loads/mo |
| Google Cloud | console.cloud.google.com | `GOOGLE_PLACES_API_KEY` | $200 credit |
| Sentry | sentry.io | `SENTRY_DSN` | 5K errors/mo |
| Vercel | vercel.com | (dashboard) | Hobby free |

**Estimated monthly cost at 5 drivers, 300 loads/month: ~$0–$20/month** (all within free tiers except possibly Vercel Pro for custom domain).

---

## Part 3: Backend Architecture Overview

```
Browser ──► Vercel Edge ──► TanStack Start (SSR + Server Functions)
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
              Better Auth      Drizzle ORM      Integrations
              (sessions)       (PostgreSQL)     (R2, Resend,
                                    │           Mapbox, Sentry)
                                    │
                              Neon PostgreSQL
```

### Server function stack (per request):

```
Client Request
  → Rate Limit Middleware (in-memory, per IP/user)
    → Auth Middleware (Better Auth session check)
      → Zod Validation (.validator() on the server function)
        → Authorization Helper (role + resource ownership check)
          → Service Layer (business logic + DB transaction)
            → Audit Middleware (auto-writes audit_log row after success)
              → Response (typed {ok: true, data} or {ok: false, error})
```

---

## Part 4: Database Schema (Implementation Order)

All tables from 02-DATA-MODEL.md, ordered by dependency:

### Migration 0000: Extensions
```sql
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Migration 0001: Auth tables
1. `users` — id, email (citext), passwordHash, role, status, 2FA fields, timestamps
2. `sessions` — managed by Better Auth
3. `invites` — token, email, expiry, acceptedAt
4. `password_resets` — managed by Better Auth

### Migration 0002: Core entities
4. `driver_profiles` — personal info, CDL, medical, pay model, onboarding state
5. `trucks` — unit number, VIN, make/model/year, plates, expirations, status
6. `brokers` — company, MC/DOT, contact, payment terms, rating

### Migration 0003: Operations
7. `loads` — load number, status (12-state enum), rate, miles, commodity, assignments
8. `load_stops` — polymorphic stops (pickup/delivery), lat/lng, time windows
9. `load_status_history` — immutable log of every status change with location

### Migration 0004: Documents & tracking
10. `documents` — polymorphic (driver/truck/load), file metadata, expiration
11. `driver_locations` — high-volume GPS points, BRIN index on recordedAt

### Migration 0005: Billing
12. `invoices` — number, status, amounts, dates, PDF URL
13. `invoice_line_items` — load reference, amount, sort order
14. `driver_pay_records` — snapshot of pay model at load completion

### Migration 0006: Communication & audit
15. `notifications` — type, title, body, read status, email sent status
16. `audit_log` — immutable, every mutation logged automatically

### Migration 0007: Features
17. `settlement_statements` — weekly PDF statements
18. `pod_deliveries` — auto-emailed POD packages
19. `display_tokens` — wall-mount TV dashboard tokens

---

## Part 5: Implementation Plan (Day by Day)

### Day 1 — Foundation

**Goal:** Database connected, schema deployed, auth working.

**Morning (4 hrs):**

- [ ] Install all backend dependencies (see Part 2 command)
- [ ] Convert project from Vite → TanStack Start (add `app.config.ts`, update entry points)
- [ ] Create `src/db/index.ts` — Drizzle client with Neon connection
- [ ] Create `src/db/schema/` — translate 02-DATA-MODEL.md into Drizzle table definitions
  - `users.ts`, `sessions.ts`, `invites.ts`
  - `driver-profiles.ts`, `trucks.ts`, `brokers.ts`
  - `loads.ts`, `load-stops.ts`, `load-status-history.ts`
  - `documents.ts`, `driver-locations.ts`
  - `invoices.ts`, `invoice-line-items.ts`, `driver-pay-records.ts`
  - `notifications.ts`, `audit-log.ts`
  - `index.ts` (barrel export)
- [ ] Create `drizzle.config.ts`
- [ ] Run `drizzle-kit generate` → `drizzle-kit push` to deploy schema to Neon

**Afternoon (4 hrs):**

- [ ] Configure Better Auth (`src/server/auth/index.ts`)
  - Session-based, httpOnly cookies, sameSite=lax
  - Admin 7-day sessions, driver 30-day sessions
  - Email/password provider
- [ ] Create `src/server/auth/session.ts` — `getAuthContext()` discriminated union
- [ ] Create auth middleware (`src/server/middleware/auth.ts`)
  - `authMiddleware` — requires session
  - `adminOnly` — narrows to admin
  - `driverOnly` — narrows to active driver with profile
- [ ] Build `/login` page — email + password form, calls Better Auth
- [ ] Build `/forgot-password` and `/reset-password` pages
- [ ] Wire route guards on `/admin` layout (`beforeLoad` checks role + status)
- [ ] Create bootstrap seed script (`seeds/bootstrap.ts`) — creates Gary's admin account from env vars
- [ ] Test: login as Gary, see admin dashboard

**Deliverable:** Gary can log in. Admin routes are protected. Database has all tables.

---

### Day 2 — Error Handling, Validation, Audit

**Goal:** The three pillars that every server function depends on.

**Morning (4 hrs):**

- [ ] Create `src/server/errors.ts` — AppError hierarchy (copy from 05-TECH-CONTRACTS.md §3)
  - UnauthorizedError, ForbiddenError, NotFoundError, ValidationError, BusinessRuleError, ConflictError, RateLimitError
- [ ] Create `src/server/middleware/audit.ts` — auto-audit wrapper
  - Writes `audit_log` row after successful mutations
  - Strips sensitive fields (password, token, secret)
  - Catches audit failures → Sentry, doesn't break caller
- [ ] Create `src/server/middleware/rate-limit.ts` — in-memory rate limiter
- [ ] Create `src/server/schemas/common.ts` — shared Zod schemas
  - UuidSchema, MoneyCents, UsStateSchema, ZipSchema, PhoneE164Schema, EmailSchema, AddressSchema, GeoCoordSchema, PaginationSchema
- [ ] Create framework-level error handler — catches AppError, ZodError, DrizzleError, formats response

**Afternoon (4 hrs):**

- [ ] Create `src/server/authorize/` — resource-level authorization helpers
  - `loads.ts` — authorizeLoadRead, authorizeLoadStatusUpdate, stripSensitiveFieldsForDriver
  - `documents.ts` — authorizeDocumentRead
  - `drivers.ts` — assertDriverCanAccess
- [ ] Create typed env configuration (`src/server/env.ts`) — validates all env vars at startup
- [ ] Integrate Sentry (`@sentry/node` server, `@sentry/react` client)
- [ ] Wire global error boundary in `__root.tsx`
- [ ] Test: trigger each error type, verify formatted responses

**Deliverable:** Every server function built from here inherits auth, validation, audit, and error handling automatically.

---

### Day 3 — Driver & Truck CRUD

**Goal:** Core entity management — the data Gary enters first.

**Morning (4 hrs):**

- [ ] **Driver server functions:**
  - `inviteDriver` — creates user (invited), creates invite, sends email via Resend
  - `listDrivers` — paginated, filterable by status
  - `getDriver` — full profile + documents + stats
  - `approveDriver` — flips status, sets approvedAt, emails driver
  - `rejectDriver` — flips back to invited with reason
  - `suspendDriver` / `reinstateDriver`
  - `updateDriver` — admin edits driver profile fields
- [ ] Create `src/server/schemas/drivers.ts` — Zod input schemas for each function
- [ ] Wire `inviteDriver` to `InviteDriverDialog` (replace no-op submit)
- [ ] Wire `listDrivers` to `/admin/drivers` (replace fixtures with TanStack Query)
- [ ] Wire `approveDriver` / `rejectDriver` to `/admin/drivers/pending`

**Afternoon (4 hrs):**

- [ ] **Truck server functions:**
  - `createTruck` — validates VIN, unique unit number
  - `listTrucks` — paginated, filterable by status
  - `getTruck` — detail + documents + assigned driver
  - `updateTruck` — edit fields
  - `deleteTruck` — soft delete
  - `assignTruckToDriver`
- [ ] Create `src/server/schemas/trucks.ts`
- [ ] Wire `createTruck` to `AddTruckDialog`
- [ ] Wire `listTrucks` to `/admin/trucks`
- [ ] Wire `getTruck` to `/admin/trucks/$truckId`

**Deliverable:** Gary can invite a real driver, manage trucks. Data persists in Neon.

---

### Day 4 — Brokers & Loads

**Goal:** The operational core — loads and the brokers they come from.

**Morning (4 hrs):**

- [ ] **Broker server functions:**
  - `createBroker` — MC/DOT uniqueness check
  - `listBrokers` — paginated, searchable
  - `getBroker` — detail + scorecard + recent loads
  - `updateBroker` / `deleteBroker`
- [ ] Wire `createBroker` to `AddBrokerDialog`
- [ ] Wire broker list + detail pages

**Afternoon (4 hrs):**

- [ ] **Load server functions:**
  - `createLoad` — auto-generates load number (PTL-YYYY-####), creates 2 stops
  - `listLoadsAdmin` — filterable by status, broker, driver, date range
  - `listLoadsDriver` — filtered to assigned driver only, stripped of rate/broker
  - `getLoadAdmin` / `getLoadDriver` — full vs. stripped detail
  - `updateLoad` — edit fields (draft/assigned only)
  - `assignLoad` — assigns driver + truck, checks compliance gate
  - `unassignLoad` — with reason
  - `cancelLoad` — admin only, with reason to audit
  - `deleteLoad` — soft delete, draft only
- [ ] Create load status state machine (`src/server/services/loads.service.ts`)
  - `updateLoadStatus` — validates transition, writes status history + location capture
  - Forward-only for drivers, admin can jump with reason
  - On `completed`: snapshot driver pay record
- [ ] Wire to `/admin/loads`, `/admin/loads/new`, `/admin/loads/$loadId`

**Deliverable:** Full load lifecycle works. Gary creates load → assigns driver → driver advances status → load completes.

---

### Day 5 — Documents & File Upload

**Goal:** Files flow from browser → R2 → database.

**Morning (4 hrs):**

- [ ] Create `src/server/integrations/storage.ts` — R2 client
  - `generatePresignedUploadUrl(key, contentType, maxSize)`
  - `generatePresignedReadUrl(key, ttlSeconds)`
  - `deleteObject(key)`
  - `headObject(key)` — verify upload exists
- [ ] **Document server functions:**
  - `requestUploadUrl` — validates type, MIME, size; returns presigned PUT URL
  - `confirmDocumentUpload` — HEAD check on R2, inserts documents row
  - `listDocuments` — filterable by owner type (driver/truck/load)
  - `getDocumentSignedUrl` — generates 15-min read URL
  - `deleteDocument` — admin only, removes from R2 + DB
- [ ] Wire `<DocumentUpload>` component to use real presigned URLs
- [ ] Wire photo capture in onboarding to upload CDL + medical card images

**Afternoon (4 hrs):**

- [ ] **Onboarding submission flow:**
  - `submitOnboardingProfile` — saves each step's data to driver_profiles
  - `submitOnboardingForReview` — sets onboardingCompletedAt, status=pending_approval, notifies Gary
  - `getMyProfile` — driver reads own profile
  - `updateMyProfile` — driver edits phone, address, emergency contact
- [ ] Wire the 7 onboarding steps to real server functions (replace sessionStorage provider)
- [ ] Test full flow: invite → accept → onboarding → submit → Gary approves

**Deliverable:** Documents upload to R2. Driver onboarding is fully wired end-to-end.

---

### Day 6 — Invoicing & Pay

**Goal:** Money flows — invoices to brokers, pay records for drivers.

**Morning (4 hrs):**

- [ ] **Invoice server functions:**
  - `listCompletedLoadsForBroker` — completed loads not on a non-void invoice
  - `createInvoice` — auto-number PTL-INV-YYYY-####, compute totals
  - `listInvoices` — filterable by status
  - `getInvoice` — detail with line items, broker, loads
  - `updateInvoice` — draft only
  - `sendInvoice` — generate PDF, upload to R2, email via Resend
  - `markInvoicePaid` — amount, method, date
  - `voidInvoice` — with reason
- [ ] Create invoice PDF template (`src/server/services/pdf/invoice.ts`)
  - Company letterhead (logo + address)
  - Line items (load #, lane, amount)
  - Subtotal, adjustments, total
  - Payment terms + remit-to info
- [ ] Wire to `/admin/invoices`, `/admin/invoices/new`, `/admin/invoices/$invoiceId`

**Afternoon (4 hrs):**

- [ ] **Pay server functions:**
  - `getMyPay` — driver's pay for a period
  - `getMyPayRecord` — single record detail (stripped)
  - `listPayRecordsAdmin` — all drivers, filterable
  - `adjustPayRecord` — admin adds bonus/deduction with notes
  - `markPayRecordPaid` — sets paidAt
  - `exportPayCsv` — generates CSV for payroll
- [ ] Wire pay calculation into load completion flow (auto-snapshot)
- [ ] Wire to `/admin/pay` and driver `/pay` pages

**Deliverable:** Gary can generate invoices, send them to brokers, mark paid. Pay auto-calculates on load completion.

---

### Day 7 — GPS Tracking & Notifications

**Goal:** Real-time tracking and the notification system.

**Morning (4 hrs):**

- [ ] Install `mapbox-gl`, create `src/server/integrations/mapbox.ts`
- [ ] **Tracking server functions:**
  - `postLocation` — rate-limited (4/min), validates load ownership + active status, inserts driver_locations
  - `getActiveDriverLocations` — admin: latest position per active driver
  - `getLoadBreadcrumbs` — all points for a load's path
- [ ] Build client-side tracking hook (`src/hooks/use-gps-tracking.ts`)
  - Starts on `en_route_pickup`, stops on `delivered`
  - Posts every 45s or 200m movement
  - Shows "Tracking active" badge
- [ ] Wire `/admin/tracking` page — Mapbox map with driver markers + breadcrumb trails
- [ ] Wire mini-map on load detail page

**Afternoon (4 hrs):**

- [ ] **Notification server functions:**
  - `createNotification` — internal helper, creates row + optionally sends email
  - `listMyNotifications` — paginated, unread filter
  - `markNotificationRead` / `markAllNotificationsRead`
- [ ] Create `src/server/services/notifications.service.ts`
  - Wire notification creation into: load assigned, load delivered, driver approved, document expiring, invoice paid
- [ ] Create email templates (`src/server/integrations/resend.ts`)
  - Invite driver, password reset, load assigned, document expiring, invoice sent
- [ ] Wire `NotificationsPopover` to real data (replace fixture notifications)
- [ ] Wire notification bell badge count

**Deliverable:** Live GPS tracking works. Notifications fire on key events. Emails send.

---

### Day 8 — Cron Jobs, Compliance, Polish

**Goal:** Automated background processes and compliance gates.

**Morning (4 hrs):**

- [ ] **Cron jobs** (Vercel Cron or API route with shared secret):
  - `expiration-check` — nightly: check CDL, medical, truck docs at 60/30/14/7 days, create notifications, send emails at 30/14/7/expired
  - `invoice-overdue-check` — nightly: flip sent invoices past dueDate to overdue, notify Gary
  - `auto-complete-loads` — hourly: pod_uploaded > 24h → completed, create pay record
- [ ] **Compliance enforcement:**
  - `assignLoad` checks driver CDL + medical expiration before allowing assignment
  - Driver dashboard shows expiration warning banner at 30 days
  - Expired driver cannot accept new loads (server-side enforcement)
- [ ] Create `vercel.json` cron configuration

**Afternoon (4 hrs):**

- [ ] **Dashboard wiring:**
  - `getAdminDashboard` — KPIs, active loads, expiring docs, recent activity (all real data)
  - `getDriverDashboard` — current load, next load, alerts
  - Wire dashboard page to replace all fixture data with server queries
- [ ] **Settings:**
  - `getCompanySettings` / `updateCompanySettings`
  - `listDisplayTokens` / `createDisplayToken` / `revokeDisplayToken`
  - `listAuditLog` — paginated, filterable by entity/user/date
- [ ] Wire analytics page to real data (aggregation queries)
- [ ] Final fixture purge — delete `src/lib/fixtures/` once all queries are wired

**Deliverable:** Everything runs on real data. Cron jobs automate compliance. Dashboard is live.

---

### Day 9 — Testing & Hardening

**Goal:** Confidence before go-live.

- [ ] **Mandatory test coverage** (per 05-TECH-CONTRACTS.md §16.1):
  - Load status transitions — every valid + invalid transition
  - Driver compliance gate — expired CDL blocks new load
  - Driver data isolation — driver A can't see driver B's data
  - Broker data stripping — getLoadDriver never returns rate/broker
  - Document ownership — driver can't fetch rate con
  - Invoice total math — subtotal + adjustments = total
  - Pay calculation — each model computes correctly with rounding
  - Load number generation — sequential within year
  - Expiration alerting — stubbed date produces correct notifications
- [ ] Set up Vitest for unit + integration tests
- [ ] Create seed script for development (`seeds/demo.ts`)
  - Gary as admin, 3 drivers, 2 trucks, 3 brokers, 5 loads, sample docs
- [ ] Run Sentry test — verify errors flow through
- [ ] Security audit pass:
  - Every server function has auth middleware
  - Every mutation has audit logging
  - No secrets in client bundle
  - CORS configured correctly
  - Rate limits on auth + upload + tracking endpoints

---

### Day 10 — Deploy & Handoff

**Goal:** Production launch.

- [ ] Set all environment variables in Vercel dashboard
- [ ] Run database migrations against production Neon
- [ ] Run bootstrap seed (creates Gary's admin account)
- [ ] Deploy to Vercel
- [ ] Verify: login, create load, assign driver, status updates, document upload, invoice generation
- [ ] Set up Vercel Cron (expiration checks, overdue invoices, auto-complete)
- [ ] DNS: point Gary's domain to Vercel
- [ ] SSL: automatic via Vercel
- [ ] Send Gary login credentials + training guide

---

## Part 6: Server Function Inventory

Every server function from 05-TECH-CONTRACTS.md §9, grouped by day:

### Day 1 — Auth (7 functions)
| Function | Middleware | Day |
|----------|-----------|-----|
| `login` | rate-limit | 1 |
| `logout` | auth | 1 |
| `requestPasswordReset` | rate-limit | 1 |
| `resetPassword` | — | 1 |
| `acceptInvite` | — | 1 |
| `enable2FA` | adminOnly | 1 |
| `verify2FA` | adminOnly | 1 |

### Day 3 — Drivers (13 functions)
| Function | Middleware | Day |
|----------|-----------|-----|
| `inviteDriver` | adminOnly, audit | 3 |
| `listPendingApprovals` | adminOnly | 3 |
| `approveDriver` | adminOnly, audit | 3 |
| `rejectDriver` | adminOnly, audit | 3 |
| `listDrivers` | adminOnly | 3 |
| `getDriver` | adminOnly | 3 |
| `updateDriver` | adminOnly, audit | 3 |
| `suspendDriver` | adminOnly, audit | 3 |
| `reinstateDriver` | adminOnly, audit | 3 |
| `submitOnboardingProfile` | authenticated | 5 |
| `submitOnboardingForReview` | authenticated | 5 |
| `getMyProfile` | driverOnly | 5 |
| `updateMyProfile` | driverOnly, audit | 5 |

### Day 3 — Trucks (6 functions)
| Function | Middleware | Day |
|----------|-----------|-----|
| `createTruck` | adminOnly, audit | 3 |
| `listTrucks` | adminOnly | 3 |
| `getTruck` | adminOnly | 3 |
| `updateTruck` | adminOnly, audit | 3 |
| `deleteTruck` | adminOnly, audit | 3 |
| `assignTruckToDriver` | adminOnly, audit | 3 |

### Day 4 — Brokers (5 functions)
| Function | Middleware | Day |
|----------|-----------|-----|
| `createBroker` | adminOnly, audit | 4 |
| `listBrokers` | adminOnly | 4 |
| `getBroker` | adminOnly | 4 |
| `updateBroker` | adminOnly, audit | 4 |
| `deleteBroker` | adminOnly, audit | 4 |

### Day 4 — Loads (11 functions)
| Function | Middleware | Day |
|----------|-----------|-----|
| `createLoad` | adminOnly, audit | 4 |
| `listLoadsAdmin` | adminOnly | 4 |
| `listLoadsDriver` | driverOnly | 4 |
| `getLoadAdmin` | adminOnly | 4 |
| `getLoadDriver` | driverOnly | 4 |
| `updateLoad` | adminOnly, audit | 4 |
| `assignLoad` | adminOnly, audit | 4 |
| `unassignLoad` | adminOnly, audit | 4 |
| `updateLoadStatus` | auth, audit | 4 |
| `cancelLoad` | adminOnly, audit | 4 |
| `deleteLoad` | adminOnly, audit | 4 |

### Day 5 — Documents (5 functions)
| Function | Middleware | Day |
|----------|-----------|-----|
| `requestUploadUrl` | auth | 5 |
| `confirmDocumentUpload` | auth, audit | 5 |
| `listDocuments` | auth | 5 |
| `getDocumentSignedUrl` | auth | 5 |
| `deleteDocument` | adminOnly, audit | 5 |

### Day 6 — Invoices (9 functions)
| Function | Middleware | Day |
|----------|-----------|-----|
| `listCompletedLoadsForBroker` | adminOnly | 6 |
| `createInvoice` | adminOnly, audit | 6 |
| `listInvoices` | adminOnly | 6 |
| `getInvoice` | adminOnly | 6 |
| `updateInvoice` | adminOnly, audit | 6 |
| `sendInvoice` | adminOnly, audit | 6 |
| `markInvoicePaid` | adminOnly, audit | 6 |
| `voidInvoice` | adminOnly, audit | 6 |
| `regenerateInvoicePdf` | adminOnly, audit | 6 |

### Day 6 — Pay (6 functions)
| Function | Middleware | Day |
|----------|-----------|-----|
| `getMyPay` | driverOnly | 6 |
| `getMyPayRecord` | driverOnly | 6 |
| `listPayRecordsAdmin` | adminOnly | 6 |
| `adjustPayRecord` | adminOnly, audit | 6 |
| `markPayRecordPaid` | adminOnly, audit | 6 |
| `exportPayCsv` | adminOnly | 6 |

### Day 7 — Tracking (3 functions)
| Function | Middleware | Day |
|----------|-----------|-----|
| `postLocation` | driverOnly, rate-limit | 7 |
| `getActiveDriverLocations` | adminOnly | 7 |
| `getLoadBreadcrumbs` | auth | 7 |

### Day 7 — Notifications (3 functions)
| Function | Middleware | Day |
|----------|-----------|-----|
| `listMyNotifications` | auth | 7 |
| `markNotificationRead` | auth | 7 |
| `markAllNotificationsRead` | auth | 7 |

### Day 8 — Dashboard & Settings (8 functions)
| Function | Middleware | Day |
|----------|-----------|-----|
| `getAdminDashboard` | adminOnly | 8 |
| `getDriverDashboard` | driverOnly | 8 |
| `getWallData` | displayToken | 8 |
| `getCompanySettings` | adminOnly | 8 |
| `updateCompanySettings` | adminOnly, audit | 8 |
| `listAuditLog` | adminOnly | 8 |
| `createDisplayToken` | adminOnly, audit | 8 |
| `revokeDisplayToken` | adminOnly, audit | 8 |

**Total: 76 server functions across 8 days.**

---

## Part 7: File Structure After Backend

```
src/
├── db/
│   ├── index.ts                    # Drizzle client (Neon)
│   ├── schema/
│   │   ├── users.ts
│   │   ├── driver-profiles.ts
│   │   ├── trucks.ts
│   │   ├── brokers.ts
│   │   ├── loads.ts
│   │   ├── load-stops.ts
│   │   ├── load-status-history.ts
│   │   ├── documents.ts
│   │   ├── driver-locations.ts
│   │   ├── invoices.ts
│   │   ├── invoice-line-items.ts
│   │   ├── driver-pay-records.ts
│   │   ├── notifications.ts
│   │   ├── audit-log.ts
│   │   ├── settlement-statements.ts
│   │   ├── pod-deliveries.ts
│   │   ├── display-tokens.ts
│   │   └── index.ts               # barrel export
│   └── migrations/                 # generated by drizzle-kit
├── server/
│   ├── auth/
│   │   ├── index.ts               # Better Auth config
│   │   ├── session.ts             # getAuthContext()
│   │   └── middleware.ts
│   ├── errors.ts                  # AppError hierarchy
│   ├── env.ts                     # typed env vars
│   ├── middleware/
│   │   ├── auth.ts                # authMiddleware, adminOnly, driverOnly
│   │   ├── audit.ts               # auto audit log
│   │   └── rate-limit.ts
│   ├── authorize/
│   │   ├── loads.ts
│   │   ├── drivers.ts
│   │   ├── documents.ts
│   │   └── index.ts
│   ├── schemas/                   # Zod validation schemas
│   │   ├── common.ts
│   │   ├── loads.ts
│   │   ├── drivers.ts
│   │   ├── trucks.ts
│   │   ├── brokers.ts
│   │   ├── invoices.ts
│   │   └── documents.ts
│   ├── services/                  # business logic
│   │   ├── loads.service.ts
│   │   ├── drivers.service.ts
│   │   ├── trucks.service.ts
│   │   ├── brokers.service.ts
│   │   ├── documents.service.ts
│   │   ├── invoices.service.ts
│   │   ├── pay.service.ts
│   │   ├── tracking.service.ts
│   │   ├── notifications.service.ts
│   │   └── audit.service.ts
│   ├── functions/                 # server functions (the "API")
│   │   ├── auth/
│   │   ├── loads/
│   │   ├── drivers/
│   │   ├── trucks/
│   │   ├── brokers/
│   │   ├── documents/
│   │   ├── invoices/
│   │   ├── pay/
│   │   ├── tracking/
│   │   ├── notifications/
│   │   ├── dashboard/
│   │   └── settings/
│   ├── jobs/                      # cron + queued jobs
│   │   ├── expiration-check.ts
│   │   ├── invoice-overdue-check.ts
│   │   ├── auto-complete-loads.ts
│   │   └── weekly-settlements.ts
│   └── integrations/
│       ├── storage.ts             # Cloudflare R2
│       ├── resend.ts              # email
│       ├── mapbox.ts              # maps
│       └── sentry.ts              # error tracking
├── lib/                           # (existing — stays as-is)
├── hooks/                         # (add use-gps-tracking.ts)
├── routes/                        # (existing — wire to server functions)
├── components/                    # (existing — wire to TanStack Query)
└── styles/                        # (existing — no changes)
```

---

## Part 8: Critical Path

The shortest path to a working app:

```
Day 1: Database + Auth + Login
         ↓
Day 2: Error handling + Validation + Audit
         ↓
Day 3: Drivers + Trucks (Gary can manage fleet)
         ↓
Day 4: Brokers + Loads (Gary can dispatch)
         ↓
Day 5: Documents + Onboarding (drivers can join)
         ↓
Day 6: Invoices + Pay (Gary can bill)
         ↓
Day 7: Tracking + Notifications (real-time ops)
         ↓
Day 8: Cron jobs + Dashboard + Polish
         ↓
Day 9: Testing + Security audit
         ↓
Day 10: Deploy + Handoff to Gary
```

Each day builds on the previous. No day can be skipped. Days 3-4 are the biggest (most server functions). Days 7-8 are the most complex (real-time + cron).

---

## Part 9: Risk Register

| Risk | Mitigation |
|------|-----------|
| TanStack Start migration breaks routing | Keep Vite fallback branch; TanStack Start uses Vinxi under the hood, same dev experience |
| Better Auth session config is wrong | Test with admin + driver accounts on Day 1 before building anything else |
| Neon cold starts slow | Enable connection pooling; Neon's serverless driver handles this well |
| R2 presigned URLs fail | Test upload flow on Day 5 with a real file before wiring all document pages |
| Resend domain verification takes time | Start DNS verification on Day 1 even though email isn't needed until Day 3 |
| Load status state machine has edge cases | Write the 9 mandatory tests on Day 9 before shipping |
| GPS tracking is high-write-volume | BRIN index + rate limiting (4/min) prevents runaway writes; 5 drivers won't stress the DB |
| Cron jobs on Vercel have timing limits | Vercel cron supports up to 60s execution; our jobs are simple queries, well under limit |

---

## Part 10: Pre-Flight Checklist

Do these BEFORE Day 1:

- [ ] Sign up for all 7 services (Neon, R2, Resend, Mapbox, Google Cloud, Sentry, Vercel)
- [ ] Get all API keys and connection strings
- [ ] Fill in `.env` locally with real values
- [ ] Verify Neon database is accessible (`psql $DATABASE_URL`)
- [ ] Verify Resend domain is verified (DNS propagation can take 24-48 hours)
- [ ] Verify Mapbox token works (load a test map)
- [ ] Verify Google Places API key works (test autocomplete)
- [ ] Verify R2 bucket is created and API token has read/write access
- [ ] Create a `main` branch backup before starting backend work
- [ ] Read 02-DATA-MODEL.md and 05-TECH-CONTRACTS.md one more time
