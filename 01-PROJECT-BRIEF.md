# ProTouch Logistics — Project Brief & Scope

**Client:** Gary Tavel (ProTouch Logistics)
**Budget:** $3,000 (Phase 1)
**Type:** Private internal fleet & dispatch platform
**Launch size:** 5 drivers, 1 admin (Gary)

---

## 1. Product Summary

ProTouch Logistics (PTL) is a private, web-based fleet operations platform for a small trucking company. It is **not** a public SaaS — Gary is the sole admin and onboards his own drivers. The app must feel industry-professional (think Samsara/McLeod lite), not like a generic CRUD tool.

The platform handles three core domains:

1. **Fleet & driver management** — trucks, drivers, qualification documents, expirations
2. **Load dispatch** — Gary creates loads, assigns drivers + trucks, tracks status end-to-end
3. **Operations & billing** — live GPS tracking, driver pay calculation, broker invoicing

### User roles

- **Admin (Gary only)** — full access to everything
- **Driver** — sees only their own loads, profile, documents, and pay

### Why this matters
Gary is paying for software that speaks his language. The app uses trucking vocabulary (loads, BOLs, PODs, rate cons, MC numbers, DOT numbers) and trucking workflows (load lifecycle, DQF documents, HOS-aware thinking). Do not generify it.

---

## 2. Tech Stack (Locked)

| Layer | Choice | Why |
|---|---|---|
| Framework | **TanStack Start** | Per Gary's request. SSR, file-based routing, server functions, TanStack Query built in. **Do not use Next.js.** |
| Language | TypeScript (strict) | Non-negotiable |
| Database | PostgreSQL (**Neon**) | Serverless Postgres, JSON support, row-level filtering, branching for dev/preview. Locked decision. |
| ORM | **Drizzle** | Type-safe, pairs cleanly with server functions, lightweight |
| Auth | **Better Auth** | Role-based, session-based, httpOnly cookies, cheaper than Clerk long-term |
| UI | **shadcn/ui + Tailwind CSS** | Matches the design system we're building |
| Forms | **TanStack Form + Zod** | Type-safe validation end to end |
| Data fetching | TanStack Query (via Start) | Comes with the framework |
| File storage | **Cloudflare R2** | S3-compatible, zero egress fees. Locked decision — do not mix with Supabase Storage. |
| Maps | **Mapbox GL JS** | Map rendering, breadcrumb trails, live positions |
| Address autocomplete | **Google Places API** | Better US address coverage than Mapbox |
| Email | **Resend** | Invites, password resets, expiration alerts |
| PDF generation | **@react-pdf/renderer** or **pdf-lib** | Invoice generation |
| Deployment | **Vercel** | Mature TanStack Start (Vinxi) adapter, preview deploys per PR, instant rollbacks. Locked decision. |
| Monitoring | **Sentry** (free tier) | Error tracking. Non-negotiable. |

### Stack guardrails
- **No localStorage for auth state.** Session cookies only, httpOnly, secure, sameSite=lax.
- **No Next.js, no Remix.** TanStack Start only.
- **No generic "tasks" terminology.** It's "loads."
- **No placeholder data in production code.** Seed scripts only in `seeds/`.
- **Storage is R2 only.** Do not mix with Supabase Storage.
- **Database is Neon only.** Do not use Supabase Postgres.
- **Deploy to Vercel only.** Do not configure for Netlify or Cloudflare Pages.

---

## 3. Phase 1 Scope (What $3K Delivers)

### In scope

**Auth & onboarding**
- Email/password auth via Better Auth
- **No landing page, no self-serve signup.** The app has one unauthenticated entry: `/login`. Root `/` redirects by session state to login or the role-appropriate dashboard.
- **Gary's admin account is bootstrap-provisioned** from env vars on first deploy (`05-TECH-CONTRACTS.md §4.2`). No "create admin" flow in the UI.
- Admin invites drivers by email → driver receives invite link → driver sets password and completes onboarding → Gary approves
- Role-based route guards (server-side in `beforeLoad`, every route)
- Password reset via email
- Forced password rotation + 2FA enrollment on Gary's first sign-in before the app is usable
- Optional 2FA for admin (Gary only)
- Session durations: Admin 7 days, Driver 30 days

**Driver experience**
- Onboarding flow (profile, CDL upload, medical card upload, review)
- Dashboard with current load and next load
- Full load list (past + current)
- Load detail page with status updates, documents, pickup/delivery info
- My documents (view, see expirations)
- Profile edit (limited fields)
- My pay (per-load and period totals)
- GPS tracking while on active load (with visible "Tracking active" indicator)

**Admin experience (Gary)**
- Dashboard: KPIs, active loads, expiring docs widget, live driver map preview
- Drivers: invite, pending approvals, full driver profiles, document management
- Trucks: CRUD, assignments, document management, expiration tracking
- Brokers: CRUD, rating system, load history per broker
- Loads: create, assign driver + truck, upload rate con + BOL, track status, close out
- Live tracking: full-screen map with all active drivers, clickable for detail + breadcrumb trail
- Documents: global document library, expiration dashboard
- Invoices: generate from completed loads, send to broker, mark paid
- Driver pay: per-load calculation, period summaries, export
- Notifications: in-app bell + email for expirations and key events
- Audit log viewer
- Settings: company info, preferences

**Load management**
- Single pickup → single delivery (Phase 1)
- Schema is multi-stop-ready for Phase 2 (see schema doc)
- Full status workflow: `draft → assigned → accepted → en_route_pickup → at_pickup → loaded → en_route_delivery → at_delivery → delivered → pod_uploaded → completed`
- Manual status override for Gary
- Auto-timestamp on every transition
- Auto-location capture on every transition

**Tracking**
- Driver browser reports GPS every 30-60 seconds while on active load
- Breadcrumb trail stored, visible to Gary
- Auto-starts when driver marks "en route to pickup"
- Auto-stops when driver marks "delivered" or "pod_uploaded"
- Gary sees live map + historical breadcrumbs

**Documents**
- Driver qualification: CDL, medical card, MVR, drug test
- Truck: registration, insurance, annual inspection
- Load: BOL, rate con, POD, lumper receipt, scale ticket
- All with expiration tracking where applicable
- Email + in-app notification at 60, 30, 14, 7 days before expiration

**Driver pay & invoicing**
- Per-driver pay model: `percentage of rate` OR `flat per-mile` OR `flat per-load` (set on driver profile)
- Pay calculated automatically per load
- Drivers see their own pay; rate and broker hidden from driver view
- Invoice generation: pick one or more completed loads → generate PDF invoice → send to broker via email → mark paid when check arrives
- Invoice numbering: `PTL-INV-YYYY-####`

**Driver compliance behavior**
- Expired CDL or medical card = driver cannot accept new loads
- Driver can finish current load, cannot be assigned new loads
- Gary can override manually in admin (logged to audit)
- Warning banner shown to driver starting 30 days before expiration

### Out of scope for Phase 1 (Phase 2+)

- Multi-stop loads
- E-signatures on documents
- ELD integration (Samsara, Motive, Geotab)
- HOS tracking / duty status
- IFTA fuel tax reporting
- Customer/shipper portal
- Route optimization
- Maintenance scheduling with work orders
- Mobile native app (responsive web only)
- SMS notifications (email + in-app only in Phase 1)
- Multi-admin / dispatcher roles (schema supports, UI doesn't expose)
- Accounting software export (QuickBooks, etc.)
- Factoring company integration

Every out-of-scope item should be declined politely in writing if Gary asks during Phase 1.

---

## 4. Branding & Design System

### Logo
Brushed silver "P" + copper/bronze "T" with a road running through, on a dark navy-charcoal backdrop. Industrial, masculine, confident.

### Color palette

**Primary (copper/bronze — matches logo T):**
- `--primary`: `#C97B3A`
- `--primary-hover`: `#B8692E`
- `--primary-light`: `#E8A66B`
- `--primary-foreground`: `#FFFFFF`

**Light mode:**
- `--background`: `#FFFFFF`
- `--surface`: `#FAFAF9` (stone-50)
- `--surface-2`: `#F5F5F4` (stone-100)
- `--border`: `#E7E5E4` (stone-200)
- `--text`: `#1C1917` (stone-900)
- `--text-muted`: `#57534E` (stone-600)

**Dark mode:**
- `--background`: `#1A1F26` (close to logo backdrop)
- `--surface`: `#252B33`
- `--surface-2`: `#2E353E`
- `--border`: `#3A424D`
- `--text`: `#F5F5F4`
- `--text-muted`: `#A8A29E`

**Semantic colors (both modes):**
- Success: `#16A34A`
- Warning: `#EAB308`
- Danger: `#DC2626`
- Info: `#0891B2`

### Design rules
- **Grey scale:** use Tailwind `stone` only. Never `slate`, never `zinc`, never `gray`. Stone has warm undertones that pair with copper.
- **No pure black** anywhere. Always `stone-900` or darker `#1A1F26`.
- **Primary orange is for primary actions only** — CTAs, active nav states, brand accents. Not for borders, text, or backgrounds. Overuse will make it feel cheap.
- **Typography:** Inter for UI (system fallback: `-apple-system, sans-serif`). Monospace for load numbers, MC/DOT numbers, VINs: JetBrains Mono.
- **Shadcn theming:** use CSS variables, toggle `dark` class on `<html>`. Store user preference in cookie, default to system.
- **Mobile-first** for all driver routes. Desktop-first for admin routes. Both must be responsive.
- **Iconography:** Lucide only. No emoji as UI elements.
- **Loading states:** skeletons, not spinners, except on buttons.
- **Empty states:** illustrated or iconographic + helpful copy + CTA. Never just "No data."

---

## 5. Non-Negotiable Quality Bar

This is a paid professional build, not a portfolio project. Before any PR is merged:

- [ ] TypeScript strict mode, zero `any` without an explicit eslint-disable comment explaining why
- [ ] Every server function validates input with Zod
- [ ] Every server function checks session + role
- [ ] Every mutation writes to `audit_log`
- [ ] Every query that returns driver data filters by `driverId` when the requester is a driver
- [ ] Every form has loading state, error state, success state
- [ ] Every table has empty state, loading state, error state, pagination
- [ ] Every date is stored UTC, displayed in user's TZ (Gary's TZ for admin, driver's TZ for driver)
- [ ] Every money value stored as integer cents, never float
- [ ] Every file upload validates MIME type and size server-side
- [ ] All images optimized server-side via `sharp` and served with `loading="lazy"` + Cloudflare R2 cache headers
- [ ] No console.log in committed code
- [ ] Sentry is wired up and tested before go-live
- [ ] Phase 1 testing: mandatory coverage on load-bearing paths (see `05-TECH-CONTRACTS.md` §16.1), not blanket 80%. Full coverage is a Phase 2 target.

---

## 6. Environment & Secrets

Required env vars (use `.env.example` as the source of truth):

```
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
TWO_FACTOR_ENCRYPTION_KEY=           # 32-byte base64 key for AES-256-GCM on users.twoFactorSecret

STORAGE_PROVIDER=r2                  # or supabase
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=

RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=               # HMAC verification for inbound rate-con webhook (Feature 2)
EMAIL_FROM="ProTouch Logistics <dispatch@protouchlogistics.com>"

# Mapbox: split public (browser, URL-allowlisted) vs secret (server geocoding).
# Never ship MAPBOX_SECRET_TOKEN to the browser.
MAPBOX_PUBLIC_TOKEN=
MAPBOX_SECRET_TOKEN=

# Google Places: split browser (HTTP-referrer restricted) vs server (IP-restricted).
# Browser key powers the Places Autocomplete widget; server key powers backend
# geocoding + DOT clinic search (Feature 4).
GOOGLE_PLACES_BROWSER_KEY=
GOOGLE_PLACES_SERVER_KEY=

SENTRY_DSN=
SENTRY_ENVIRONMENT=

APP_URL=
NODE_ENV=

# First-deploy only. Consumed once by seeds/bootstrap.ts, then deleted from the
# hosting env after Gary's first successful sign-in. See 05-TECH-CONTRACTS.md §4.2.
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=
BOOTSTRAP_ADMIN_FIRST_NAME=
BOOTSTRAP_ADMIN_LAST_NAME=
BOOTSTRAP_COMPANY_NAME=
BOOTSTRAP_COMPANY_TIMEZONE=
```

Never commit `.env`. Never log secrets. Rotate Mapbox/Google keys if they leak. Delete `BOOTSTRAP_ADMIN_PASSWORD` from the hosting env immediately after Gary's first successful sign-in — the value is one-shot.

---

## 7. Deliverables to Gary

1. Production app deployed at a domain he owns
2. Admin credentials for Gary
3. Onboarding video walkthrough (15-20 min Loom, covers every feature)
4. Written admin guide (PDF, covers common workflows)
5. `.env.example` and deployment runbook handed to whoever maintains it going forward
6. 30 days of post-launch bug fix support (scope: defects only, not new features)

Phase 2 feature requests after launch are a new scope and a new invoice. Put this in writing at project kickoff.

---

## 8. Timeline (Suggested)

- **Week 1:** Auth, schema, Gary's admin shell, driver invite/onboarding
- **Week 2:** Trucks, brokers, drivers CRUD, document upload infrastructure
- **Week 3:** Loads CRUD, status workflow, admin load list + detail, driver load view
- **Week 4:** GPS tracking, live map, breadcrumbs, notifications
- **Week 5:** Driver pay, invoicing, PDF generation, expiration alerts
- **Week 6:** Polish, audit log viewer, settings, QA, Gary UAT
- **Week 7:** Fixes from UAT, deployment, training, handoff

Adjust as reality dictates. Communicate slippage early.
