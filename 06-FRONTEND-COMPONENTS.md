# ProTouch Logistics — Frontend Components & Data Flow Spec

> **Pair with:** `01-PROJECT-BRIEF.md`, `02-DATA-MODEL.md`, `03-ROUTES-AND-FEATURES.md`, `04-CREATIVE-FEATURES.md`, `05-TECH-CONTRACTS.md`
>
> **Stack context:** TanStack Start (file-based routes) + shadcn/ui + Tailwind + TanStack Query + TanStack Form + Zod. Maps via Mapbox GL JS. Address autocomplete via Google Places. Every route is SSR; every guard runs in `beforeLoad` (server-side).

---

## 0. Architecture scan summary

**Routing model:** file-based under `src/routes/`. Three layout trees:
- `_public` — unauthenticated shell (centered card, brand background)
- `_driver` — mobile-first shell (top nav with "Tracking active" badge, bottom tab bar on mobile)
- `_admin` — desktop-first shell (sidebar + top bar, collapsible on mobile)
- Onboarding has its own sub-layout under `_driver` (full-bleed single-question frames, progress bar, no nav)
- Wall-mount is its own route tree with no layout shell, token-guarded

**Data layer:** every page is a TanStack Start `createFileRoute` with `loader` → server function. Mutations go through TanStack Query `useMutation` wrapping server functions. All list pages use `useSuspenseQuery` with SSR prefetch in the loader. On-screen state from server; UI-only state in local stores.

**Folder layout for components (extends `05-TECH-CONTRACTS.md §2`):**
```
src/components/
├── ui/                    # shadcn primitives (Button, Input, Dialog, etc.)
├── layout/                # shells, nav, containers
├── forms/                 # reusable form fields + patterns
├── data/                  # tables, lists, filters
├── feedback/              # empty/loading/error states, toasts, banners
├── maps/                  # Mapbox wrappers
├── documents/             # upload, viewer, expiration badges
├── loads/                 # load-specific (status pill, timeline, etc.)
├── drivers/               # driver-specific widgets
├── trucks/                # truck-specific
├── brokers/               # broker-specific
├── invoices/              # invoice-specific
├── pay/                   # pay-specific
├── tracking/              # live tracking UI
├── voice/                 # voice update UI (creative feat. 3)
├── onboarding/            # conversational onboarding widgets (creative feat. 10)
├── wall/                  # wall dashboard tiles (creative feat. 8)
└── brand/                 # Logo, wordmark, watermarks
```

---

## 1. Global / shared components

These appear across most routes. Build once, used everywhere.

### 1.1 Layout shell components

| Component | File | Used in |
|---|---|---|
| `AppShellAdmin` | `layout/AppShellAdmin.tsx` | every `/admin/*` route |
| `AppShellDriver` | `layout/AppShellDriver.tsx` | every `/dashboard`, `/loads`, `/pay`, etc. |
| `AppShellPublic` | `layout/AppShellPublic.tsx` | `/login`, `/forgot-password`, `/reset-password`, `/invite` |
| `AppShellOnboarding` | `layout/AppShellOnboarding.tsx` | `/onboarding/*` — no nav, just progress bar |
| `WallShell` | `wall/WallShell.tsx` | `/admin/wall/$token` |
| `AdminSidebar` | `layout/AdminSidebar.tsx` | inside `AppShellAdmin` |
| `AdminTopBar` | `layout/AdminTopBar.tsx` | inside `AppShellAdmin` — breadcrumbs, search, notifications bell, user menu, theme toggle |
| `DriverTopBar` | `layout/DriverTopBar.tsx` | inside `AppShellDriver` — logo, tracking badge, notifications bell, user menu |
| `DriverBottomNav` | `layout/DriverBottomNav.tsx` | mobile only, below `md` breakpoint |
| `BreadcrumbTrail` | `layout/BreadcrumbTrail.tsx` | admin pages |
| `PageHeader` | `layout/PageHeader.tsx` | title + actions slot for every content page |
| `PageContainer` | `layout/PageContainer.tsx` | max-width + padding wrapper |

### 1.2 Navigation

| Component | Purpose |
|---|---|
| `SidebarNavGroup` | expandable group inside admin sidebar |
| `SidebarNavLink` | active-state aware link |
| `NotificationsBell` | dropdown with unread count, polls `/api/notifications/unread` every 30s |
| `UserMenu` | avatar dropdown → Profile, Settings, Sign out |
| `ThemeToggle` | Lucide `Sun`/`Moon`, writes cookie, toggles `dark` class on `<html>` |
| `TrackingActiveBadge` | only in driver top bar, pulses when GPS is posting |

### 1.3 Feedback primitives (mandatory on every list/form — see brief §6)

| Component | Purpose |
|---|---|
| `LoadingSkeletonRows` | generic skeleton list, configurable row count |
| `LoadingSkeletonCard` | skeleton for card grids (dashboard KPIs) |
| `LoadingSkeletonTable` | skeleton matching table layout |
| `EmptyState` | icon + headline + description + optional CTA |
| `ErrorState` | icon + message + retry button + Sentry event ID footer |
| `InlineFieldError` | red subtext under form inputs, fed by TanStack Form |
| `FormSubmitButton` | disables-while-submitting primary action |
| `Toast` | success/error/info — shadcn `sonner` wrapper |
| `ConfirmDialog` | destructive action confirmation, keyboard-dismissible |
| `BannerAlert` | top-of-page persistent alert (e.g. CDL expired warning) |

### 1.4 Data display

| Component | Purpose |
|---|---|
| `DataTable` | TanStack Table-based, sticky header, virtualized >100 rows, pagination, column sort |
| `DataTableFilters` | generic filter bar (chips, selects, date range, search) |
| `DataTableBulkActions` | export CSV, etc. |
| `StatusPill` | load status / invoice status / driver status — color mapped by status enum |
| `ExpirationBadge` | green/yellow/orange/red based on days-until-expiration thresholds |
| `MoneyCell` | cents → `$X,XXX.XX` with configurable precision |
| `DateCell` | ISO → user's TZ (Gary's TZ for admin, driver's TZ for driver) |
| `PhoneCell` | E.164 → `(555) 123-4567`, `tel:` link on mobile |
| `AddressCell` | multi-line address block |
| `Avatar` | initials fallback, color from userId hash |
| `Pagination` | page buttons + page-size selector |
| `KpiCard` | big number + label + trend delta |
| `Timeline` | vertical event list (used for load status history, audit log) |

### 1.5 Forms

| Component | Purpose |
|---|---|
| `FormField` | label + input + error wrapper — generic |
| `TextField`, `TextAreaField`, `NumberField`, `DateField`, `DateTimeField`, `SelectField`, `ComboboxField`, `CheckboxField`, `RadioGroupField`, `SwitchField`, `FileField` | typed TanStack Form wrappers around shadcn primitives |
| `MoneyField` | dollar input, internally stores cents |
| `PhoneField` | auto-format US phone, stores E.164 |
| `AddressAutocompleteField` | Google Places + lat/lng capture |
| `StateSelect` | 50 US states dropdown |
| `VinField` | 17-char input with checksum validation |
| `SearchCombobox` | async combobox for brokers, drivers, trucks (with "Add new…" inline) |
| `DocumentUpload` | drag-drop, MIME/size check, signed-URL upload, progress, expiration picker for expirable types |
| `CameraCapture` | mobile camera with overlay guide, crop handles, reshoot (onboarding + doc upload on mobile) |
| `FormCard` | shadcn Card wrapper with header/footer for form sections |
| `FormActions` | right-aligned cancel + submit buttons |

### 1.6 Maps

| Component | Purpose |
|---|---|
| `MapboxBase` | map container, theme-aware style (dark/light) |
| `MapPickupDeliveryMini` | small map with 2 markers + route line, read-only |
| `MapBreadcrumbTrail` | renders `driver_locations` for one load as a path |
| `LiveFleetMap` | full-viewport map with all active drivers, polling 20s |
| `MapMarkerDriver` | custom driver marker (truck icon + status color) |
| `MapMarkerStop` | pickup/delivery marker |
| `MapSidePanel` | collapsible panel over map (used in `/admin/tracking` + `/admin/wall`) |

### 1.7 Documents

| Component | Purpose |
|---|---|
| `DocumentUpload` | (see forms) |
| `DocumentCard` | thumbnail/filename/expiration/download — one card per file |
| `DocumentViewerModal` | inline PDF/image viewer using signed URL |
| `DocumentTypeBadge` | colored chip for `driver_cdl`, `load_pod`, etc. |
| `ExpirationDashboardRow` | row in global expiration dashboard |

### 1.8 Creative-feature components

| Component | Purpose | Feature |
|---|---|---|
| `VoiceRecordButton` | press-and-hold, level meter, max 60s | §3 |
| `VoiceReviewCard` | shows transcript + proposed status/ETA, confirm/reject | §3 |
| `AiDraftLoadBanner` | "New load from email — review draft PTL-…" | §2 |
| `AiDraftFieldHint` | small "auto-filled from rate con" badge on a field | §2 |
| `AiConfidenceIndicator` | field-level confidence dot (green/amber/red) | §2, §10 |
| `BrokerScorecardInline` | compact grade + avg-days-to-pay card (inline on load create) | §7 |
| `BrokerScorecardPanel` | full scorecard panel on broker detail | §7 |
| `ExpirationConflictBanner` | "This expiration will conflict with load PTL-…" | §4 |
| `ClinicSuggestionsList` | nearby DOT clinics from Google Places, tap-to-call | §4 |
| `OnboardingProgressBar` | sticky top, step n of 12 | §10 |
| `OnboardingQuestionFrame` | single-question layout with big input + next button | §10 |
| `CdlCardOverlayGuide` | camera overlay with corner guides for CDL photo | §10 |
| `WallTileKpi`, `WallTileActiveLoads`, `WallTileMap`, `WallTicker`, `WallFooter` | wall dashboard | §8 |
| `SettlementStatementCard` | per-week card on driver /pay Statements tab | §5 |

### 1.9 Brand

| Component | Purpose |
|---|---|
| `BrandLogo` | "PT" mark, size + theme variants |
| `BrandWordmark` | full "ProTouch Logistics" lockup |
| `BrandWatermark` | subtle background watermark for auth cards |

---

## 2. Public routes

> **There is no landing page.** The app has no unauthenticated content surface beyond sign-in and the 4 public routes below. The root path (`/`) is a pure redirect — it never renders UI. See `03-ROUTES-AND-FEATURES.md §1`.

### 2.0 `/` — root redirect (no UI)

**Not a page.** Lives at `src/routes/index.tsx` as a zero-render redirect.

**Component:** none. File only exports `createFileRoute('/')` with a `beforeLoad` that throws `redirect(...)` based on session state.

**Data flow:**
```
beforeLoad:
  const ctx = await getAuthContext();
  if (ctx.kind === 'unauthenticated') throw redirect({ to: '/login' });
  if (ctx.kind === 'admin') throw redirect({ to: '/admin/dashboard' });
  if (ctx.kind === 'driver') {
    if (ctx.user.status === 'pending_approval') throw redirect({ to: '/onboarding/pending' });
    if (ctx.user.status !== 'active') throw redirect({ to: '/login' });
    if (!ctx.driverProfile?.onboardingCompletedAt) throw redirect({ to: '/onboarding/profile' });
    throw redirect({ to: '/dashboard' });
  }
```

No loader, no component body. SSR renders the redirect on first byte — no flash, no hydration mismatch.

**404 fallback:** `src/routes/__root.tsx` sets `notFoundMode: 'root'` + `notFoundComponent` = `NotFoundRedirect`, which does the same session-aware routing: authed users land on their dashboard with a toast "That page doesn't exist"; unauthed users go to `/login`. No "Go home" button — there is no home.

### 2.1 `/login`

**Purpose:** admin + driver sign in. The **only** unauthenticated entry to the app. Redirects post-auth by role. Gary's admin credentials are pre-provisioned via the bootstrap seed (`05-TECH-CONTRACTS.md §4.2`); he signs in here with the email and initial password from the deploy-time env vars, then is prompted to change them.

**Layout:** `AppShellPublic` → centered card on branded background.

**Components:**
- `AppShellPublic`
- `BrandLogo` (top of card)
- `LoginForm`
  - `TextField` (email, autocomplete="username")
  - `TextField` type=password (password, autocomplete="current-password")
  - `CheckboxField` ("Remember me" — extends session max age, optional)
  - Link → `/forgot-password`
  - `FormSubmitButton` ("Sign in")
  - `InlineFieldError` per field
  - `ErrorState` variant for global errors (rate-limited, account suspended)
- `FooterMini` (copyright, `v{version}`)

**Data flow:**
```
User submits → TanStack Form Zod validate client-side
  → server fn `auth.signIn({email, password})` (Better Auth)
  → success: session cookie set (httpOnly), returns {role, status, driverOnboardingCompletedAt}
    → client routes via navigate():
       role=admin → /admin/dashboard
       role=driver + onboardingCompletedAt=null → /onboarding/profile
       role=driver + onboardingCompletedAt set + status=pending_approval → /onboarding/pending
       role=driver + status=active → /dashboard
  → error: rate-limit hit → show RateLimitError message + retry-after seconds
         : invalid creds → inline error on password field (never reveal which field was wrong)
         : status=suspended → banner with contact link
Audit: `audit_log.action='login'` with IP + UA (success AND failure)
```

**Route guards:** `beforeLoad` — if session already exists, redirect by role (so refreshing `/login` while logged in sends you to your dashboard).

---

### 2.2 `/forgot-password`

**Components:** `AppShellPublic`, `BrandLogo`, `ForgotPasswordForm` (`TextField` email, `FormSubmitButton`), success panel with resend cooldown timer.

**Data flow:**
```
Submit → server fn `auth.requestPasswordReset({email})` (Better Auth)
  → Always returns success (don't leak whether email exists)
  → Resend emails reset link with token valid 1hr
Audit: login attempt with action='password_reset_requested'
```

---

### 2.3 `/reset-password?token=...`

**Components:** `AppShellPublic`, `BrandLogo`, `ResetPasswordForm`:
- Two `TextField` password inputs (new + confirm)
- `PasswordStrengthMeter`
- `FormSubmitButton`
- Inline error if tokens mismatch or too weak

**Data flow:**
```
Loader: server fn `auth.verifyResetToken(token)` → if invalid/expired show ErrorState with "Request a new link"
Submit → server fn `auth.resetPassword({token, newPassword})`
  → Success: session created, redirect by role (same as login)
```

---

### 2.4 `/invite/$token` ⚠️ ID page

**Purpose:** driver accepts invite, sets initial password.

**Loader:** `auth.verifyInviteToken({token})` → returns `{email, inviterName, expiresAt}` or throws.

**Components:** `AppShellPublic`, `BrandLogo`, `InviteAcceptCard`:
- Headline: "You've been invited by {inviterName}"
- Read-only email field (pre-filled)
- `TextField` password + confirm
- `CheckboxField` TOS acceptance
- `FormSubmitButton` ("Create account")

**Data flow:**
```
Loader SSR → `invites` table lookup by token
  → expired/used → ErrorState with "Ask Gary for a fresh link"
Submit → server fn `auth.acceptInvite({token, password, tosAcceptedAt})`
  → creates password hash on users row, marks invite.acceptedAt=now()
  → users.status remains 'invited' (not pending_approval until onboarding submitted)
  → session created
  → redirect to /onboarding/profile
Audit: action='invite_accepted'
```

---

## 3. Driver onboarding (creative feat. 10 — conversational flow)

**Layout:** `AppShellOnboarding` — full-bleed, no nav, `OnboardingProgressBar` at top.

**Resume logic:** every page's loader reads `driver_profiles.onboardingState` and redirects to that step if mismatched. Every successful "Next" writes partial data + advances `onboardingState`.

**Dynamic routes:** none (linear flow).

### 3.1 `/onboarding/profile` — combined profile step

This folds what brief §3 §10 calls "name / dob / phone / address / emergency" into the conversational style. In practice this single route ships **one question per sub-frame** using local navigation state (`?step=name|dob|phone|address|emergency`) so we keep URL complexity low but still one-question-at-a-time UX.

**Components:**
- `AppShellOnboarding`, `OnboardingProgressBar`
- `OnboardingQuestionFrame` (wrapper for each sub-step)
- Step "name": `TextField` first + last
- Step "dob": `DateField`
- Step "phone": `PhoneField`
- Step "address": `AddressAutocompleteField` (lat/lng captured for clinic suggestions later)
- Step "emergency": 3x fields (name, phone, relation) — on one frame
- `FormActions` (Back / Next) per frame

**Data flow:**
```
Every Next → server fn `drivers.updateOnboardingStep({step, data})`
  → Zod validate per step schema
  → Partial UPDATE driver_profiles
  → Set onboardingState to next step
  → Return next URL
Audit: action='onboarding_step_saved', entityType='driver_profile'
```

---

### 3.2 `/onboarding/license`

**Components:**
- `OnboardingProgressBar`
- Step "cdl_photo": `CameraCapture` with `CdlCardOverlayGuide`, then crop
- Step "cdl_details": pre-filled by Claude vision call after crop confirmed
  - `TextField` cdlNumber (with `AiConfidenceIndicator`)
  - `SelectField` cdlClass (A/B/C)
  - `StateSelect` cdlState
  - `DateField` cdlExpiration (must be future)
  - `AiDraftFieldHint` on each field
- `FormActions`

**Data flow:**
```
Photo upload → signed-URL → R2
  → server fn `drivers.extractCdlFromImage({documentId})`
  → Claude vision returns structured CDL data + per-field confidence
  → Client pre-fills `cdl_details` fields, shows AiConfidenceIndicator on each
  → Driver must tap each field (not blind Next) — tracked via touched state
  → Submit → drivers.updateOnboardingStep({step:'cdl_details', data})
      Validations:
        - cdlExpiration > today
        - name from extraction matches entered name (±case) else flag for Gary
        - dob matches (±1 day tolerance)
      → Insert documents row type=driver_cdl, driverProfileId, expirationDate
      → Update driver_profiles: cdlNumber, cdlClass, cdlState, cdlExpiration
Audit: action='cdl_submitted'
```

---

### 3.3 `/onboarding/medical`

Same pattern as license.

**Components:** `CameraCapture` (medical card overlay variant), `DateField` for expiration (pre-filled), `FormActions`.

**Data flow:**
```
Same as license. Writes documents (type=driver_medical) + driver_profiles.medicalCardExpiration.
Must pass future-date validation.
```

---

### 3.4 `/onboarding/review`

**Components:**
- `OnboardingProgressBar` (step n of n)
- `ReviewSectionCard` (one per section: Profile, License, Medical) with "Edit" link back
- `DocumentCard` thumbnails for CDL + medical
- `FormActions` ("Go back" / "Submit for approval")

**Data flow:**
```
Loader → fetch full driver_profile + documents for this driver
Submit → server fn `drivers.submitOnboarding()`
  → Validate all required fields present
  → UPDATE users.status = 'pending_approval'
  → UPDATE driver_profiles.onboardingCompletedAt = now(), onboardingState = 'complete'
  → INSERT notifications for Gary (type=driver_onboarding_submitted)
  → Send email to Gary (Resend)
  → Return redirect to /onboarding/pending
Audit: action='onboarding_submitted'
```

---

### 3.5 `/onboarding/pending`

**Components:** `AppShellOnboarding`, illustrated empty-state style frame, "Waiting for Gary to review your submission" copy, mini timeline showing "Submitted at…", "Sign out" link.

**Data flow:** loader polls (every 30s via TanStack Query) `drivers.getMyApprovalStatus()`. When status flips to `active`, auto-redirect to `/dashboard`. If status flips back to `invited` (rejected), redirect to first incomplete step with `RejectionReasonBanner`.

---

## 4. Driver routes (post-onboarding, `status=active`)

### 4.1 `/dashboard`

**Purpose:** mobile-first driver home. Current load, next load, alerts, quick links.

**Components:**
- `AppShellDriver`
- `PageHeader` ("Good morning, {firstName}")
- `ComplianceBanner` — if CDL/medical expired or expiring <30d
- `CurrentLoadCard`
  - Load number, pickup → delivery chips, `StatusPill`
  - `AdvanceStatusButton` (big, primary) — label adapts to current status (e.g. "I'm at pickup", "Loaded — start delivery")
  - `VoiceRecordButton` (creative feat. 3)
  - `TrackingActiveBadge` inline
  - Link → `/loads/$loadId`
- `NextLoadCard` — starts in Xh; muted styling
- `QuickLinks` grid (My loads, Documents, Pay)
- `AlertsStack` — expiring docs, rejected onboarding (if rebounced), system messages

**Data flow:**
```
Loader (SSR):
  Promise.all([
    loads.getMyCurrentLoad(),     // assignedDriverId=me, status IN (accepted..at_delivery)
    loads.getMyNextLoad(),        // status=assigned, earliest pickup window
    drivers.getMyComplianceStatus(), // cdlExpiration, medicalCardExpiration
    notifications.getMyUnread({limit:5}),
  ])

Mutations from this page:
  - AdvanceStatusButton → loads.updateStatus({loadId, nextStatus})
    → validates allowed transition
    → if en_route_pickup: capture geolocation, kick off tracking interval
    → if delivered/pod_uploaded: stop tracking
    → server writes load_status_history row WITH current lat/lng
    → returns updated load → TanStack Query invalidates current-load key
  - VoiceRecordButton → /api/loads/:loadId/voice-update (multipart)
    → server: Claude audio → structured data
    → if confidence ≥0.7: apply proposedStatus + eta
    → if <0.7: return pending review → client shows VoiceReviewCard
    → any issueFlags → notify Gary immediately
    Audit: action='voice_update' with transcript in metadata
```

---

### 4.2 `/loads`

**Purpose:** driver's load list.

**Components:**
- `AppShellDriver`, `PageHeader`
- `DataTableFilters` (status chips — subset of enum visible to driver; date range)
- `DataTable` columns: load #, pickup city → delivery city, pickup date, status
  - Row click → `/loads/$loadId`
- `LoadingSkeletonTable` / `EmptyState` / `ErrorState`
- `Pagination`

**Data flow:**
```
Loader → loads.listForMe({status?, from?, to?, page})
  → server strips broker, rate, other drivers from payload (driver visibility rule)
  → returns {rows, totalCount}
```

---

### 4.3 `/loads/$loadId` ⚠️ ID page (driver view)

**Purpose:** stripped-down load detail — no rate, no broker name, no other drivers.

**Loader:** `loads.getForDriver({loadId})` — throws `ForbiddenError` if not assigned to me.

**Components:**
- `AppShellDriver`, `PageHeader`
- `LoadHeaderCard` (load #, `StatusPill`, `AdvanceStatusButton`)
- `VoiceRecordButton`
- `PickupCard` + `DeliveryCard` (address, window, contact, "Open in Maps" link, mini `MapPickupDeliveryMini`)
- `LoadCommodityCard` (commodity, weight, pieces, special instructions)
- `LoadDocumentsSection`
  - `DocumentCard[]` — filtered: BOL + any admin-shared docs visible; rate con hidden
  - `DocumentUpload` for POD (enabled when status=delivered)
  - `DocumentUpload` for scale tickets / lumper receipts (always)
- `LoadStatusTimeline` (`Timeline` populated from `load_status_history`)
- `AdminContactCard` (single "Call dispatch" button → tel: Gary)

**Data flow:**
```
Loader SSR:
  loads.getForDriver({loadId}) → joins documents + load_status_history + stops; strips rate/broker
  Returns 404 if deletedAt set; returns 403 if not assigned to me.

AdvanceStatusButton → loads.updateStatus (see §4.1)
POD upload:
  1. Client calls documents.getUploadUrl({loadId, type:'load_pod'}) → signed URL + key
  2. Browser PUT to R2 directly
  3. Client calls documents.confirmUpload({loadId, type:'load_pod', key, fileName, mimeType, sizeBytes})
  4. Server: insert documents row, updateLoadStatus → pod_uploaded
  5. Queue pod-delivery job (auto-email POD to broker — creative feat. 6)
  6. TanStack Query invalidate load + documents + status history
```

---

### 4.4 `/documents` (driver)

**Components:** `AppShellDriver`, `PageHeader`, filter tabs ("All", "Qualification", "Expiring soon"), `DocumentCard[]` grid, `EmptyState`.

**Data flow:** `documents.listForMe()` → returns driver's docs only (`driverProfileId = session.driverProfileId`). On expirable types, `ExpirationBadge` inside each card.

---

### 4.5 `/pay` (driver)

**Components:**
- `AppShellDriver`, `PageHeader`
- `TabBar` — "Earnings" | "Statements"
- Earnings tab:
  - `PeriodSelector` (This week / Last week / Custom)
  - `EarningsTotalCard` (big number)
  - `EarningsLoadList` — one row per completed load: load #, cities, amount
  - `EarningsBreakdownDrawer` on row tap: pay model, calc, adjustments + Gary's notes
- Statements tab (creative feat. 5):
  - `SettlementStatementCard[]` — download PDF link, period label, total

**Data flow:**
```
Earnings tab loader:
  pay.getMyEarnings({periodStart, periodEnd})
  → server: SELECT from driver_pay_records WHERE driverProfileId=session.driverProfileId
            AND createdAt BETWEEN range
  → returns rows with {loadNumber, pickupCity, deliveryCity, totalAmountCents, adjustments, notes}
  → DOES NOT return load.rate, load.brokerId, load.brokerName (filtered server-side)

Statements tab loader:
  pay.listMyStatements({page})
  → SELECT from settlement_statements WHERE driverProfileId=me ORDER BY periodStart DESC
  → each row has signed pdfUrl (15-min TTL)
```

---

### 4.6 `/profile` (driver)

**Components:** `AppShellDriver`, `PageHeader`, `ProfileForm`:
- Read-only: name, DOB, CDL info (changes go through admin)
- Editable: `PhoneField`, `AddressAutocompleteField`, emergency contact fields
- `FormSubmitButton`

**Data flow:** `drivers.updateMyProfile` — server-side whitelist of editable fields; audit logged.

---

### 4.7 `/settings` (driver)

**Components:** `AppShellDriver`, `SettingsSection`[], `ChangePasswordForm`, `ThemeToggle`, `SignOutButton`. 2FA optional panel (if available).

**Data flow:** all via `auth.*` server functions; password change requires current password, fires `audit_log` + email to the user.

---

## 5. Admin routes

### 5.1 `/admin/dashboard`

**Components:**
- `AppShellAdmin`, `PageHeader` ("Dashboard")
- `KpiRow`:
  - `KpiCard` Active loads
  - `KpiCard` Completed this week
  - `KpiCard` Drivers on road now
  - `KpiCard` Invoices outstanding ($)
- `ExpiringSoonTable` — top 10, color-coded, CTA → `/admin/documents`
- `ActiveLoadsList` — compact with `StatusPill`, click → load detail
- `LiveMapPreview` — small `MapboxBase` + markers, "Open full map" → `/admin/tracking`
- `RecentActivityFeed` — last 20 audit events
- `OnboardingQueueCard` — pending drivers count + link → `/admin/drivers/pending`

**Data flow:**
```
Loader (parallel):
  - dashboard.getKpis()        // counts, sums
  - documents.listExpiringSoon({withinDays:60, limit:10})
  - loads.listActive({limit:20})    // status IN (accepted..pod_uploaded)
  - tracking.getLiveFleetSnapshot() // one row per active driver
  - audit.listRecent({limit:20})
  - drivers.countPendingApproval()

TanStack Query refresh:
  - Live map preview polls every 20s
  - KPIs and active loads refetch every 60s
  - Everything else on focus
```

---

### 5.2 `/admin/loads` (list)

**Components:** `AppShellAdmin`, `PageHeader` with "Create load" button, `DataTableFilters` (status chips, driver select, broker select, date range, text search for load #/reference/BOL), `DataTable` (load #, status, pickup → delivery, pickup date, driver, rate, broker), `DataTableBulkActions` (export CSV), 3 states.

**Data flow:**
```
Loader → loads.listAdmin({filters, page, sort})
  → server returns rows with broker + driver joined (admin sees all)
  → export CSV: loads.exportCsv(filters) streams attachment
```

---

### 5.3 `/admin/loads/new`

**Components:**
- `AppShellAdmin`, `PageHeader` ("Create load", "Cancel")
- `AiDraftLoadBanner` — if `?source=email_ai&draftId=…`
- `LoadCreateForm`:
  - `SearchCombobox` broker (with "+ Add new broker" inline opens `BrokerQuickCreateDialog`)
  - `BrokerScorecardInline` (creative feat. 7) — renders under broker selection
  - Pickup group: `AddressAutocompleteField`, `DateTimeField` windowStart, `DateTimeField` windowEnd, `TextField` contactName, `PhoneField` contactPhone
  - Delivery group: same shape
  - `TextField` commodity, `NumberField` weight (lbs), `NumberField` pieces
  - `MoneyField` rate, `NumberField` miles, `TextField` referenceNumber, `TextAreaField` specialInstructions
  - `SearchCombobox` assignedDriver (async, filters active non-expired-docs drivers)
  - `SearchCombobox` assignedTruck (auto-suggests driver's default)
  - `DocumentUpload` rate confirmation (required before assigning)
  - `FormActions` ("Save as draft" / "Save & assign")

**Data flow:**
```
On mount:
  - brokers.search (on combobox keystroke, debounced 250ms)
  - drivers.searchAssignable (only drivers eligible: active, docs not expired)
  - trucks.search
  - if ?source=email_ai&draftId=…: loads.getDraft(draftId) → pre-fill every field + show AiConfidenceIndicator dots

On submit:
  loads.create({brokerId, pickup, delivery, commodity, weight, pieces, rate, miles, ref, instructions, driverId?, truckId?, rateConDocumentId})
  → server:
    - Validate broker exists
    - Validate truck matches driver if both set
    - Compute status: driver assigned → 'assigned'; else 'draft'
    - Generate loadNumber (PTL-YYYY-####, atomic sequence)
    - TX: insert load + 2 load_stops + rateCon document link
    - If assigned: insert notifications row (driver), send email
    - audit.log action='create' entity='load'
  → redirect to /admin/loads/{newId}
```

---

### 5.4 `/admin/loads/$loadId` ⚠️ ID page (admin view)

**Components:**
- `AppShellAdmin`, `BreadcrumbTrail` (Loads > {loadNumber})
- `LoadHeaderAdmin`:
  - load number, `StatusPill`, action buttons: Edit, Override Status, Cancel Load
- 2-column on desktop, stacked on mobile:
  - Left:
    - `PickupCard` (with embedded `MapPickupDeliveryMini`)
    - `DeliveryCard`
    - `LoadCommodityCard`
  - Right:
    - `AssignmentCard` (driver + truck with Swap buttons)
    - `FinancialsCard` (rate, miles, computed rate/mi)
    - `LoadDocumentsSection` (rate con, BOL, POD, lumper, scale, other — `DocumentUpload` per type)
    - `LoadStatusTimeline`
    - `DriverPayPreviewCard` (calculated pay using current driver pay model)
- Bottom: `MapBreadcrumbTrail` for this load's `driver_locations`
- `OverrideStatusDialog` (`ConfirmDialog` variant — requires reason)
- `SwapDriverDialog`, `SwapTruckDialog`
- `CancelLoadDialog` (requires reason)

**Data flow:**
```
Loader (SSR):
  - loads.getAdmin({loadId})  // full join: broker, driver, truck, stops, documents, status history
  - tracking.getBreadcrumbsForLoad({loadId})
  - pay.previewForLoad({loadId}) // uses current driver pay model

Mutations:
  - loads.update({loadId, patch})
  - loads.overrideStatus({loadId, toStatus, reason})
      → allows jumping any transition; writes load_status_history.reason
  - loads.assignDriver({loadId, driverProfileId})
      → validates driver compliance (no expired CDL/medical); throws BusinessRuleError if blocked
  - loads.assignTruck({loadId, truckId})
  - loads.cancel({loadId, reason})
  - documents.getUploadUrl + confirmUpload (see Upload pattern)
  - loads.delete (soft; deletedAt set)
```

---

### 5.5 `/admin/drivers` (list)

**Components:** `AppShellAdmin`, `PageHeader` with "Invite driver" button, `DataTableFilters` (status, pay model, text search), `DataTable` (name, status, assigned truck, CDL exp `ExpirationBadge`, medical exp `ExpirationBadge`, loads MTD, pay MTD), row click → `/admin/drivers/$driverId`, 3 states.

**Data flow:** `drivers.listAdmin({filters, page})` — server joins truck + latest pay sum.

---

### 5.6 `/admin/drivers/invite`

**Components:** `AppShellAdmin`, `BreadcrumbTrail`, `InviteDriverForm`:
- `TextField` email
- `TextField` first name + last name (optional, pre-fills profile)
- `FormActions`

**Data flow:**
```
Submit → drivers.invite({email, firstName?, lastName?})
  → Validate email not already in users table
  → TX: insert users(status=invited) + insert invites(token, 7d expiry)
  → Send invite email via Resend
  → audit action='invite_sent'
  → Redirect to /admin/drivers (toast "Invite sent")
```

---

### 5.7 `/admin/drivers/pending`

**Purpose:** review onboarding submissions.

**Components:** `AppShellAdmin`, `PageHeader`, `PendingDriversList` — card per submission with:
- name, submitted at, CDL thumbnail, medical thumbnail
- `Button` "Review" → opens `PendingDriverReviewDrawer`
- Drawer contents: full profile + expanded `DocumentViewerModal`, "Approve" and "Reject with reason" buttons, `RejectionReasonDialog`

**Data flow:**
```
Loader → drivers.listPendingApproval()
Approve:
  drivers.approve({driverProfileId})
    → users.status='active', driver_profiles.approvedAt=now(), approvedByUserId=me
    → notification + email to driver (type='driver_approved')
    → audit action='approve'
Reject:
  drivers.reject({driverProfileId, reason, rebounceToStep?})
    → users.status='invited', driver_profiles.onboardingState=rebounceToStep
    → notification + email to driver (type='driver_rejected')
```

---

### 5.8 `/admin/drivers/$driverId` ⚠️ ID page

**Components:**
- `AppShellAdmin`, `BreadcrumbTrail`
- `DriverHeader` (avatar, name, status pill, "Send message" — Phase 2)
- `TabBar`: Profile | Documents | Loads | Pay | Tracking history | Notes
- Profile tab: `DriverProfileForm` (editable by admin — full access, including pay model)
- Documents tab: `DocumentCard[]` grid + `DocumentUpload`
- Loads tab: `DataTable` of driver's loads (filterable)
- Pay tab: period selector + `DataTable` of `driver_pay_records` with `AdjustmentDialog` (add bonus/deduction with notes); settlement toggle (`paidAt` flip), `ExportCsvButton`
- Tracking history tab: date picker + `MapBreadcrumbTrail` showing one load at a time from this driver
- Notes tab: admin-only free-text `TextAreaField`, auto-save

**Data flow:**
```
Loader → drivers.getAdmin({driverId})
  Returns: driver_profile + users row + assigned truck + counts (loads MTD/YTD) + current compliance flags

Mutations:
  - drivers.updateAdmin({driverId, patch})
    → if payModel or payRate change, DO NOT retroactively change past driver_pay_records (snapshots are immutable)
  - drivers.suspend / drivers.reactivate
  - pay.addAdjustment({payRecordId, amountCents, note})
  - pay.markPaid / pay.markUnpaid ({payRecordId})
  - documents.* (upload/delete)
  - drivers.softDelete
Every mutation audit-logged.
```

---

### 5.9 `/admin/trucks` (list)

**Components:** `AppShellAdmin`, `PageHeader` + "Add truck" button, `DataTableFilters` (status, expiration-soon flag, text search), `DataTable` columns: unit #, VIN (mono), make/model/year, status, assigned driver, registration exp `ExpirationBadge`, inspection exp `ExpirationBadge`, insurance exp `ExpirationBadge`, row click → detail.

**Data flow:** `trucks.list({filters, page})`.

---

### 5.10 `/admin/trucks/new`

**Components:** `TruckCreateForm` — `TextField` unitNumber, `VinField`, make/model/year, `TextField` plate + `StateSelect`, three expiration `DateField`s, `NumberField` currentMileage, `SelectField` status, optional `SearchCombobox` assignedDriver.

**Data flow:** `trucks.create` → audit → redirect to `/admin/trucks/{id}`.

---

### 5.11 `/admin/trucks/$truckId` ⚠️ ID page

**Components:**
- `AppShellAdmin`, `BreadcrumbTrail`
- `TruckHeader` (unit #, VIN, status pill)
- `TabBar`: Details | Documents | Assignment history | Maintenance (Phase 2 placeholder)
- Details tab: `TruckEditForm`
- Documents tab: `DocumentCard[]` (registration, insurance, inspection, other) + `DocumentUpload`
- Assignment history: `Timeline` of driver assignments (reconstructed from audit_log)

**Data flow:**
```
Loader → trucks.getAdmin({truckId})
Mutations: trucks.update, trucks.setStatus, trucks.assignDriver, trucks.softDelete
```

---

### 5.12 `/admin/brokers` (list)

**Components:** `AppShellAdmin`, `PageHeader` + "Add broker", `DataTableFilters` (payment terms, star rating, text search), `DataTable` (company name, MC #, contact, payment terms, **grade badge** — creative feat. 7, loads YTD, revenue YTD, star rating), row click → detail.

**Data flow:** `brokers.list({filters, page})` returns rows with computed `scorecard.grade` (cached 1hr).

---

### 5.13 `/admin/brokers/new`

**Components:** `BrokerCreateForm` — company info, contact, billing email, address (autocomplete), `SelectField` paymentTerms + conditional `TextField` paymentTermsOther, `TextField` creditRating, `StarRatingField` (1–5), `TextAreaField` notes.

**Data flow:** `brokers.create`.

---

### 5.14 `/admin/brokers/$brokerId` ⚠️ ID page

**Components:**
- `AppShellAdmin`, `BreadcrumbTrail`
- `BrokerHeader` (company name, MC#, grade badge)
- `TabBar`: Details | **Scorecard** | Loads | Invoices | Notes
- Details tab: `BrokerEditForm`
- Scorecard tab (creative feat. 7): `BrokerScorecardPanel` — avg days to pay, on-time %, rate/mi, volume, detention incidents, star rating slider
- Loads tab: filterable `DataTable` of loads scoped to this broker
- Invoices tab: filterable `DataTable` of invoices scoped to this broker

**Data flow:**
```
Loader (parallel):
  - brokers.getAdmin({brokerId})
  - brokers.getScorecard({brokerId})  // cached 1hr, in-memory LRU
  - loads.listByBroker({brokerId, page})
  - invoices.listByBroker({brokerId, page})
Mutations: brokers.update, brokers.setStarRating, brokers.softDelete
```

---

### 5.15 `/admin/tracking`

**Components:**
- `AppShellAdmin` (map takes viewport minus top bar)
- `LiveFleetMap` (full-viewport Mapbox)
- `MapSidePanel` (collapsible) with `ActiveDriverList`:
  - one row per active driver: avatar, name, load #, `StatusPill`, last update `TimeAgo`
  - row click → `flyTo` on map + opens `DriverInfoCard`
- `DriverInfoCard` (over map): load info, ETA (computed), "Show breadcrumbs" toggle, link → `/admin/loads/$loadId`
- `TrackingControls` — "Auto-refresh 20s" toggle, manual refresh button
- Always-on secondary view: `ActiveDriverList` also visible as accessibility fallback (brief §7: map never the only way to get data)

**Data flow:**
```
Loader → tracking.getLiveFleetSnapshot() // one most-recent driver_locations row per active driver
Polling: TanStack Query with refetchInterval: 20000
On driver select: tracking.getBreadcrumbsForLoad({loadId}) // full path for that driver's current load
```

---

### 5.16 `/admin/documents`

**Purpose:** global document library + expiration dashboard.

**Components:**
- `AppShellAdmin`, `PageHeader`, `TabBar`: Expiring soon | All documents
- Expiring tab: `ExpirationDashboardTable` — every expirable doc across drivers + trucks, color-coded, jump to owning entity
- All tab: `DataTableFilters` (type, entity type, date range, text search), `DataTable` with preview + download

**Data flow:** `documents.listAdmin({filters})`, `documents.listExpirations({withinDays})`.

---

### 5.17 `/admin/invoices`

**Components:** `AppShellAdmin`, `PageHeader` + "Create invoice" button, `DataTableFilters` (status chips, broker, date range), `DataTable` (invoice #, broker, issue date, due date, total, status pill with overdue red), 3 states.

---

### 5.18 `/admin/invoices/new`

**Components:**
- `AppShellAdmin`, `BreadcrumbTrail`
- `InvoiceCreateStepper`:
  - Step 1: `SearchCombobox` broker
  - Step 2: `CompletedLoadsSelector` — checkbox list of completed loads for this broker not on any non-void invoice
  - Step 3: `ManualLineItemsEditor` (detention, lumper, etc.)
  - Step 4: `InvoiceReviewPanel` — subtotal, adjustments, total, `DateField` issueDate, `DateField` dueDate (auto from broker terms), notes
  - `FormActions` — "Save as draft" | "Generate & send"

**Data flow:**
```
Step 1 → brokers.search
Step 2 → invoices.getEligibleLoads({brokerId})
Step 4 Save:
  invoices.create({brokerId, loadIds, lineItems, adjustments, issueDate, dueDate, send})
  → TX:
    - Insert invoices row (status=draft)
    - Insert invoice_line_items for each load + manual line
    - Compute subtotal + total
    - Lock those loads (server-side check on future invoice creation)
  → If send=true:
    - Render PDF (@react-pdf/renderer)
    - Upload to R2
    - UPDATE invoices.pdfUrl, status=sent, sentAt=now()
    - Email broker's billingEmail with PDF attached
    - Insert notifications row for Gary (type=invoice_sent)
  → audit action='invoice_created' (+ 'invoice_sent' if sent)
  → Redirect to /admin/invoices/{newId}
```

---

### 5.19 `/admin/invoices/$invoiceId` ⚠️ ID page

**Components:**
- `AppShellAdmin`, `BreadcrumbTrail`
- `InvoiceHeader` (invoice #, status pill, total)
- Action buttons: Resend, Mark paid, Void (`ConfirmDialog` variants)
- `InvoicePdfViewer` — inline PDF via signed URL
- `LineItemsTable`
- `PaymentHistoryCard` — if paid, shows amount + method + date
- `MarkPaidDialog`: `MoneyField` amount, `TextField` method, `DateField` paymentDate

**Data flow:**
```
Loader → invoices.getAdmin({invoiceId})
Mutations:
  - invoices.resend → regenerates signed URL + emails
  - invoices.markPaid({invoiceId, amountCents, method, paidAt})
    → status=paid, notification+email to Gary (type=invoice_paid)
  - invoices.void({invoiceId, reason}) → unlocks loads
Overdue flip is cron-driven (nightly job).
```

---

### 5.20 `/admin/pay`

**Components:**
- `AppShellAdmin`, `PageHeader`
- `PayPeriodSelector`
- `PayOverviewTable` — one row per driver: loads, miles, pay total, unpaid balance, actions
- Row click → `DriverPayDrilldownDrawer` with `driver_pay_records` list, `AdjustmentDialog`, settlement toggle
- `ExportCsvButton`

**Data flow:** `pay.getAdminSummary({period})`, `pay.getDriverPayRecords({driverProfileId, period})`, `pay.addAdjustment`, `pay.markPaid`, `pay.exportCsv`.

---

### 5.21 `/admin/notifications`

**Components:** `AppShellAdmin`, `PageHeader`, `NotificationFilters` (unread only, type), `NotificationList` with pagination, mark-all-as-read action.

**Data flow:** `notifications.listMine({filters, page})`, `notifications.markRead({id})`, `notifications.markAllRead()`.

---

### 5.22 `/admin/settings`

**Components:**
- `AppShellAdmin`, `PageHeader`, `SettingsSection[]`:
  - Company info: name, legal address, MC #, DOT #, phone, remit-to, logo upload (used on invoices + letterheads)
  - Preferences: timezone (cron + display), default payment terms, email from address
  - Display tokens (creative feat. 8): `DisplayTokensTable` with "Generate new" + revoke per row
  - Integrations: Mapbox / Google Places / Resend status indicators
  - 2FA setup
  - `ChangePasswordForm`

**Data flow:** `settings.getCompany`, `settings.updateCompany`, `settings.listDisplayTokens`, `settings.createDisplayToken`, `settings.revokeDisplayToken`.

---

### 5.23 `/admin/settings/audit`

**Components:** `AppShellAdmin`, `BreadcrumbTrail`, `AuditFilters` (user, entity type, action, date range), `AuditTable` with `ChangeDiffModal` on row click (shows `{before, after}` JSON in a diff view).

**Data flow:** `audit.list({filters, page})`, `audit.getById({id})`.

---

### 5.24 `/admin/wall/$token` ⚠️ ID page (creative feat. 8)

**Guard:** `beforeLoad` — no session check; instead `display_tokens.validate({token})` → if invalid/expired/revoked, render `WallErrorState` (no redirect, no login).

**Layout:** `WallShell` — dark mode only, no nav, no scroll.

**Components:**
- `WallTicker` (top bar): revenue MTD, loads in-progress, loads completed this week, on-time %
- `WallTileMap` (60% of screen) — `LiveFleetMap` in high-contrast wall style
- `WallTileActiveLoads` (side) — one line per active load, scrolling ticker if overflow
- `WallFooter` — logo, date, weather at HQ (via a single daily-cached call), current time

**Data flow:**
```
Loader (token-guarded):
  display_tokens.validate({token}) → updates lastUsedAt, throws if revoked/expired
  wall.getDashboard() → {kpis, activeLoads, fleetSnapshot}

Polling: every 15s, no login prompt, resilient to transient failures (show "reconnecting…" quietly)
```

---

## 6. Full dynamic ID route inventory

Every route with a dynamic segment, with its loader and guard contract.

| Route | Param | Loader (server fn) | Guard |
|---|---|---|---|
| `/invite/$token` | token | `auth.verifyInviteToken` | public; throws on invalid/expired |
| `/reset-password?token=…` | token (query) | `auth.verifyResetToken` | public; throws on invalid/expired |
| `/loads/$loadId` | loadId | `loads.getForDriver` | driver; 403 if not assigned |
| `/admin/loads/$loadId` | loadId | `loads.getAdmin` | admin |
| `/admin/drivers/$driverId` | driverId | `drivers.getAdmin` | admin |
| `/admin/trucks/$truckId` | truckId | `trucks.getAdmin` | admin |
| `/admin/brokers/$brokerId` | brokerId | `brokers.getAdmin` + `brokers.getScorecard` | admin |
| `/admin/invoices/$invoiceId` | invoiceId | `invoices.getAdmin` | admin |
| `/admin/wall/$token` | token | `display_tokens.validate` + `wall.getDashboard` | token-only |

**Every ID loader must:**
1. Validate param is a UUID (or for tokens, non-empty opaque string)
2. Check row exists; throw `NotFoundError` → shell renders `ErrorState` with 404 copy
3. Check row is not soft-deleted (for deletable entities)
4. Check role+ownership (driver sees only own loads, admin sees all)
5. Return enough joined data that the first render has no waterfall; rely on TanStack Query for incremental refetch only

---

## 7. Data flow patterns (reused across routes)

### 7.1 SSR list page pattern

```ts
// src/routes/admin/loads/index.tsx
export const Route = createFileRoute('/admin/loads/')({
  beforeLoad: requireAdminSession,
  loader: async ({ context, deps }) => {
    return context.queryClient.ensureQueryData({
      queryKey: ['admin-loads', deps.filters],
      queryFn: () => loadsServerFns.listAdmin(deps.filters),
    });
  },
  component: AdminLoadsPage,
});
```

Every list page follows this shape: `beforeLoad` guard → `loader` prefetches into query client → component calls `useSuspenseQuery`.

### 7.2 Mutation → invalidation pattern

```ts
const mutation = useMutation({
  mutationFn: loadsServerFns.updateStatus,
  onSuccess: (updated) => {
    queryClient.setQueryData(['load', updated.id], updated);
    queryClient.invalidateQueries({ queryKey: ['admin-loads'] });
    queryClient.invalidateQueries({ queryKey: ['tracking-snapshot'] });
    toast.success('Status updated');
  },
  onError: mapAppErrorToToast,
});
```

Always surgically set the single-entity cache and invalidate list caches. Don't blanket-invalidate.

### 7.3 File upload pattern (docs)

```
1. client: documents.getUploadUrl({contextId, contextType, type, fileName, mimeType, sizeBytes})
   → server validates MIME + size against whitelist, returns {url, key, expiresIn}
2. client: browser PUT fileBlob to signed URL (progress UI)
3. client: documents.confirmUpload({key, fileName, mimeType, sizeBytes, contextId, contextType, type, expirationDate?})
   → server INSERTs documents row, fires any domain triggers (e.g. POD → updateLoadStatus + pod-delivery job)
   → TanStack Query invalidate relevant cache keys
4. UI: DocumentCard appears immediately with optimistic insert, swapped for server row on confirm
```

### 7.4 GPS tracking client loop

```
When load.status → en_route_pickup:
  - useEffect in AppShellDriver starts navigator.geolocation.watchPosition
  - On each position OR every 45s (whichever first, gated on moved >200m), POST /api/tracking/post
  - Server returns current load.status; if not in active range, client stops the loop
When load.status → delivered OR pod_uploaded:
  - watchPosition cleared
```

A small Zustand store `useTrackingStore` holds `{isActive, lastPost, currentAccuracy}` so `TrackingActiveBadge` can pulse without prop drilling.

### 7.5 Notifications polling

`NotificationsBell` mounts a 30s `refetchInterval` TanStack Query against `notifications.countMyUnread`. Opening the dropdown fires `notifications.listMine({limit:10, unreadOnly:true})`. Clicking a notification calls `notifications.markRead`, navigates to `notification.linkUrl`.

### 7.6 Theme

`ThemeToggle` writes a `theme=dark|light|system` cookie (12-month max age). Server reads cookie in root SSR render, sets `<html class>` before any paint. Client re-syncs on mount to respect system changes.

### 7.7 Error → UI mapping (consumes `05-TECH-CONTRACTS.md §14`)

| AppError code | UI |
|---|---|
| `UNAUTHORIZED` | redirect to `/login?from=…` |
| `FORBIDDEN` | full-page `ErrorState` with "Not allowed" copy |
| `NOT_FOUND` | full-page `ErrorState` 404 |
| `VALIDATION_FAILED` | TanStack Form sets field errors from `details.fieldErrors` |
| `BUSINESS_RULE_VIOLATED` | toast + `BannerAlert` if persistent (e.g. compliance block) |
| `CONFLICT` | toast with retry suggestion |
| `RATE_LIMITED` | toast with countdown to retryAfterSeconds |
| `INTERNAL` | `ErrorState` with Sentry event ID + Retry |

---

## 8. Responsive rules by route tree

| Tree | Primary device | Breakpoint behavior |
|---|---|---|
| Public | any | Centered card, fluid to 360px min width |
| Onboarding | mobile | Single column always; camera UX optimized for mobile |
| Driver | mobile | `DriverBottomNav` below `md`; `DriverTopBar` condensed; cards full-width |
| Admin | desktop | Sidebar collapses to drawer below `lg`; tables horizontally scrollable below `md` with sticky first column |
| Wall | TV | Fixed layout assumes ≥1920×1080, scales down gracefully but not designed for small screens |

All touch targets: min 44×44px on driver routes. Forms never require hover states.

---

## 9. Accessibility checklist (every page, every component)

- All form inputs have `<label>` or `aria-label`
- All buttons have accessible names (icon-only buttons require `aria-label`)
- Every interactive element reachable by keyboard, visible focus ring
- Color contrast AA min on both themes (verify `stone-600` on `stone-50` passes — it does)
- `prefers-reduced-motion` respected: no tracking badge pulse animation, no auto-refresh ticker scroll animation
- Maps always paired with a list view of the same data (never map-only)
- Toasts auto-dismiss at 5s min, persist on hover, also have a close button
- Every modal traps focus, dismissable via ESC + backdrop click (unless destructive)
- `role="status"` on loading skeletons for screen readers

---

## 10. Definition of Done — component level

A component is not "done" until:

- [ ] TypeScript props interface exported and explicit (no implicit any)
- [ ] Renders all three states when relevant (loading, empty, error)
- [ ] Dark + light mode both visually tested
- [ ] Works on smallest supported viewport (360×640)
- [ ] Keyboard accessible, focus visible
- [ ] No console.log, no TODO, no `any` without justification comment
- [ ] If it performs a mutation: optimistic updates + error rollback wired
- [ ] If it renders money: uses `MoneyCell` / `MoneyField` (never raw numbers)
- [ ] If it renders dates: uses `DateCell` (never raw ISO strings)
- [ ] If it renders a list: has a `data-testid` on the container for E2E tests

---

## 11. Build order (suggestion)

Phase maps to weeks from `01-PROJECT-BRIEF.md §8`.

**Week 1:**
1. `ui/` shadcn primitives + theme wiring
2. `layout/` shells + nav
3. `brand/` logo/wordmark
4. `feedback/` states + toasts
5. `forms/` TanStack Form wrappers (TextField, SelectField, etc.)
6. `/login`, `/forgot-password`, `/reset-password`, `/invite/$token`
7. Admin shell + placeholder `/admin/dashboard`
8. Driver shell + placeholder `/dashboard`

**Week 2:**
9. `DocumentUpload` + `DocumentCard` + `DocumentViewerModal` + `CameraCapture`
10. Onboarding flow routes
11. `/admin/drivers`, `/admin/drivers/invite`, `/admin/drivers/pending`, `/admin/drivers/$driverId`
12. `/admin/trucks` CRUD, `/admin/brokers` CRUD

**Week 3:**
13. `data/` tables + filters
14. `/admin/loads` (list + create + detail)
15. `/loads` + `/loads/$loadId` (driver)

**Week 4:**
16. `maps/` components
17. `/admin/tracking`
18. `tracking/` client hooks + `TrackingActiveBadge`
19. Live map widget on `/admin/dashboard`
20. Notifications bell + `/admin/notifications`

**Week 5:**
21. `/pay` (driver) + `/admin/pay`
22. `/admin/invoices` (list + create + detail)
23. Settlement statements tab + creative feat. 5 cron
24. POD auto-email (feat. 6) wiring
25. Expiration conflict banners (feat. 4)

**Week 6:**
26. Audit log viewer
27. `/admin/settings` + display tokens
28. `/admin/wall/$token` (feat. 8)
29. Broker scorecard panels (feat. 7)
30. Voice updates (feat. 3) if scope allows
31. AI rate con intake UI (feat. 2) if scope allows

**Week 7:** QA, polish, a11y audit, mobile pass, Sentry verify.

---

## 12. Open questions for implementation

1. Do we use a single `DataTable` abstraction or hand-roll where it hurts performance? (Recommendation: start with one; peel off `/admin/tracking` + `/admin/wall` which are map-first.)
2. Do voice update review cards need an undo window after auto-apply? (Recommendation: 10s undo toast post-apply when confidence ≥0.7 but <0.9.)
3. Should wall-mode support multiple token-bound variants (Dispatch view vs. Executive view)? (Recommendation: one layout for Phase 1; token name is for operator reference only.)
4. Where does the admin-impersonate-driver flow live for QA, if anywhere? (Recommendation: out of scope Phase 1 per brief §3.)

---

## 13. Page end-to-end breakdowns

> **Purpose of this section:** the five admin pages Gary opens most. Each entry below is self-contained — page responsibility, data contract, section-by-section component list, mutations, states, and cross-page invalidation. Use it as the build checklist for that page.
>
> **Order:** Dashboard → Loads → Trucks → Brokers → Tracking. Tracking is last because **Mapbox is not wired yet** — see §13.5 for what ships now vs. what waits.
>
> **Ownership rule:** each page owns exactly one responsibility. If a behavior doesn't match the "Responsibility" line, it belongs on a different page — do not smear logic across pages.

---

### 13.1 Dashboard — `/admin/dashboard`

**Responsibility:** single glance at today. Answer *"what needs my attention right now?"* — nothing else. No CRUD, no filters, no deep drilldown. Every card links to the page that owns the action.

**Covers routes:** `/admin/dashboard` only.

**Shell:** `AppShellAdmin` → `AdminSidebar` + `AdminTopBar` + `PageContainer`.

**Page anatomy (top to bottom):**

| Section | Component(s) | Data source | Purpose |
|---|---|---|---|
| Header | `PageHeader` title="Dashboard" | static | page title only |
| KPI row | 4× `KpiCard` inside a `KpiRow` grid | `dashboard.getKpis()` | active loads, completed this week, drivers on road now, invoices outstanding $ |
| Onboarding queue | `OnboardingQueueCard` | `drivers.countPendingApproval()` | inline count + link → `/admin/drivers/pending`; hidden if 0 |
| Expiring soon | `ExpiringSoonTable` (wraps `DataTable`, non-paginated, top 10) + `ExpirationBadge` per row | `documents.listExpiringSoon({withinDays:60, limit:10})` | color-coded, CTA → `/admin/documents` |
| Active loads | `ActiveLoadsList` (compact cards) + `StatusPill` | `loads.listActive({limit:20})` | click row → `/admin/loads/$loadId` |
| Live map preview | `LiveMapPreview` → **stubbed until Mapbox ships** (see §13.5). Ship a `LiveMapPlaceholder` with "Open full map" CTA → `/admin/tracking` | `tracking.getLiveFleetSnapshot()` fetched but rendered as list in placeholder | keeps Gary's muscle memory; swap implementation when Mapbox lands |
| Recent activity | `RecentActivityFeed` (wraps `Timeline`) | `audit.listRecent({limit:20})` | read-only audit feed |

**Loader (parallel):**
```ts
Promise.all([
  dashboard.getKpis(),
  documents.listExpiringSoon({ withinDays: 60, limit: 10 }),
  loads.listActive({ limit: 20 }),
  tracking.getLiveFleetSnapshot(),
  audit.listRecent({ limit: 20 }),
  drivers.countPendingApproval(),
])
```

**Polling cadence (TanStack Query `refetchInterval`):**
- Live map preview / fleet snapshot: **20s**
- KPIs + active loads: **60s**
- Expiring soon + recent activity + onboarding queue: **on focus only** (no polling)

**Mutations fired from this page:** none. Dashboard is read-only. Every CTA navigates elsewhere.

**States:**
- Loading: `LoadingSkeletonCard` × 4 for KPI row, `LoadingSkeletonRows` for tables, `LoadingSkeletonCard` for map preview
- Empty per section: each card renders its own `EmptyState` ("No expiring docs", "No active loads", "No recent activity") — never collapse the whole dashboard
- Error per section: `ErrorState` with retry inside that card only — one failing KPI does not blank the page

**Responsive:** KPI row collapses to 2-col on `md`, 1-col on `sm`. Map preview + active loads stack on mobile.

**Done criteria (page-specific):**
- [ ] Every card handles its own loading/empty/error independently
- [ ] No card blocks another's render (independent Suspense/Query boundaries)
- [ ] Hard refresh SSR-hydrates all 6 queries without waterfall
- [ ] Polling pauses when tab hidden (TanStack Query `refetchIntervalInBackground: false`)

---

### 13.2 Loads — `/admin/loads`, `/admin/loads/new`, `/admin/loads/$loadId`

**Responsibility:** the full life of a load — create, assign, monitor, override, close, cancel, document. The status machine lives here and **nowhere else**. Dashboard surfaces the current state of loads but never mutates; pay and invoicing *consume* completed loads but never change load status.

**Covers routes:** list, create, detail (admin variant). Driver-side load routes are in §4 of this doc.

**Shell:** `AppShellAdmin` for all three. Detail page adds `BreadcrumbTrail` (Loads > {loadNumber}).

#### 13.2.a List — `/admin/loads`

| Section | Component(s) | Data source |
|---|---|---|
| Header | `PageHeader` + "Create load" primary button → `/admin/loads/new` | static |
| Filters | `DataTableFilters`: status chips, driver `SearchCombobox`, broker `SearchCombobox`, date-range, text search (load#/ref/BOL) | `brokers.search`, `drivers.search` |
| Table | `DataTable` cols: load#, `StatusPill`, pickup→delivery (`AddressCell` compact), pickup `DateCell`, driver (`Avatar`+name), `MoneyCell` rate, broker name | `loads.listAdmin({filters, cursor, sort})` |
| Bulk | `DataTableBulkActions`: Export CSV | `loads.exportCsv(filters)` |
| Pagination | `Pagination` (cursor-based, per HP-9 of audit) | `nextCursor` in response |

**States:** `LoadingSkeletonTable` / `EmptyState` ("No loads yet — create your first" CTA) / `ErrorState`.

**Row click:** → `/admin/loads/$loadId`. Uses `<Link preload="intent">` to hover-preload the detail loader.

#### 13.2.b Create — `/admin/loads/new`

**Responsibility:** one form, one outcome — a load row in `draft` or `assigned` state plus its two `load_stops` and optional rate-con `documents` row. No partial saves beyond "Save as draft" (which is a full valid draft, not autosave).

| Section | Component(s) |
|---|---|
| AI draft banner | `AiDraftLoadBanner` — only if `?source=email_ai&draftId=…` |
| Broker | `SearchCombobox` (+ `BrokerQuickCreateDialog` for inline create) |
| Broker scorecard | `BrokerScorecardInline` (creative feat. 7) — renders below broker pick |
| Pickup group | `AddressAutocompleteField`, 2× `DateTimeField`, `TextField` contact name, `PhoneField` contact phone |
| Delivery group | same shape as pickup |
| Commodity | `TextField` commodity, `NumberField` weight lbs, `NumberField` pieces |
| Financials | `MoneyField` rate, `NumberField` miles, `TextField` referenceNumber, `TextAreaField` specialInstructions |
| Assignment | `SearchCombobox` driver (eligible only — active + non-expired docs), `SearchCombobox` truck (auto-suggests driver's default) |
| Rate confirmation | `DocumentUpload` type=`load_rate_confirmation` — required before assigning a driver |
| Actions | `FormActions`: "Save as draft" / "Save & assign" (primary) |

**AI pre-fill path:** each pre-filled field gets an `AiDraftFieldHint` + `AiConfidenceIndicator`. Driver-facing *confirm* gesture not required (Gary is admin) but each auto-filled field must be `touched` before submit enables — tracks accidental trust.

**Submit mutation:**
```ts
loads.create({
  brokerId, pickup, delivery, commodity, weight, pieces, rate, miles,
  ref, instructions, driverId?, truckId?, rateConDocumentId?
})
// server: generates loadNumber (PTL-YYYY-####, atomic)
// server: TX insert loads + 2 load_stops + link rateCon doc
// server: status = 'assigned' if driver set, else 'draft'
// server: if assigned → notifications row + email driver
// server: audit action='create' entity='load'
// client: setQueryData(['load', id]) + invalidate(['admin-loads'])
```

**Guardrails:** driver assignment blocked if compliance fail (`BUSINESS_RULE_VIOLATED` → `BannerAlert` with the reason: "CDL expired", "Medical expired").

#### 13.2.c Detail — `/admin/loads/$loadId`

**Responsibility:** single source of truth for one load — all state changes, documents, overrides, breadcrumbs, pay preview. Two-column desktop, stacked mobile.

| Area | Component(s) | Data source / mutation |
|---|---|---|
| Header | `LoadHeaderAdmin`: load#, `StatusPill`, Edit / Override Status / Cancel buttons | loader: `loads.getAdmin({loadId})` |
| Left col — pickup | `PickupCard` + `MapPickupDeliveryMini` (**stubbed until Mapbox**, see §13.5) | load payload |
| Left col — delivery | `DeliveryCard` + `MapPickupDeliveryMini` stub | load payload |
| Left col — commodity | `LoadCommodityCard` | load payload |
| Right col — assignment | `AssignmentCard` with `SwapDriverDialog` + `SwapTruckDialog` | `loads.assignDriver`, `loads.assignTruck` |
| Right col — financials | `FinancialsCard` (`MoneyCell` rate, miles, computed $/mi) | load payload |
| Right col — documents | `LoadDocumentsSection` → `DocumentCard[]` + per-type `DocumentUpload` (rate con, BOL, POD, lumper, scale, other) | `documents.getUploadUrl`, `documents.confirmUpload` |
| Right col — status | `LoadStatusTimeline` (wraps `Timeline`, reads `load_status_history`) | load payload |
| Right col — pay preview | `DriverPayPreviewCard` | `pay.previewForLoad({loadId})` |
| Bottom — breadcrumbs | `MapBreadcrumbTrail` (**stubbed until Mapbox**) | `tracking.getBreadcrumbsForLoad({loadId})` |
| Dialogs | `OverrideStatusDialog`, `SwapDriverDialog`, `SwapTruckDialog`, `CancelLoadDialog` — all variants of `ConfirmDialog` with required-reason field | respective mutations |

**Status machine component:** `LoadStatusAdvanceButton` is a driver-side component; admin uses `OverrideStatusDialog` which allows **any** transition with a required `reason` written to `load_status_history.reason` + audit.

**Cross-page invalidation on mutation:**
```
loads.updateStatus / overrideStatus / assignDriver / assignTruck / cancel →
  setQueryData(['load', id], updated)
  invalidate(['admin-loads'])          // list
  invalidate(['dashboard-kpis'])       // active-loads KPI
  invalidate(['dashboard-active-loads'])
  invalidate(['tracking-snapshot'])    // status may leave tracking set
  invalidate(['driver', assignedDriverId]) // if driver changed
```

**States + errors:** inherit from §7.7 error → UI map. `BUSINESS_RULE_VIOLATED` on assign (compliance) renders persistent `BannerAlert` at top of detail until resolved.

**Done criteria:**
- [ ] Every status transition writes `load_status_history` with lat/lng if available
- [ ] Override always requires reason; UI enforces + server enforces
- [ ] Soft-delete hides from list but detail link returns 404 shell
- [ ] Completing a load (status → `completed`) creates `driver_pay_records` visible in pay preview panel within one refetch

---

### 13.3 Trucks — `/admin/trucks`, `/admin/trucks/new`, `/admin/trucks/$truckId`

**Responsibility:** the fleet's physical assets — identity (unit #, VIN), compliance (registration, inspection, insurance expirations), and default driver assignment. Trucks **do not** know about loads directly; load ↔ truck happens on the load detail page. Expiration monitoring is a cron job, this page just renders the results.

**Covers routes:** list, create, detail.

#### 13.3.a List — `/admin/trucks`

| Section | Component(s) | Data source |
|---|---|---|
| Header | `PageHeader` + "Add truck" button → `/admin/trucks/new` | static |
| Filters | `DataTableFilters`: status chips (`active`/`in_shop`/`out_of_service`), "expiring soon" toggle, text search | — |
| Table | `DataTable` cols: unit# (mono), VIN (mono truncated), make/model/year, `StatusPill`, assigned driver (`Avatar`+name or "—"), registration `ExpirationBadge`, inspection `ExpirationBadge`, insurance `ExpirationBadge` | `trucks.list({filters, cursor})` |

**States:** standard three states. Empty CTA: "Add your first truck".

#### 13.3.b Create — `/admin/trucks/new`

| Section | Component(s) |
|---|---|
| Identity | `TextField` unitNumber, `VinField` (17-char + checksum), `TextField` make, `TextField` model, `NumberField` year |
| Plate | `TextField` licensePlate, `StateSelect` plateState |
| Compliance | 3× `DateField` — registration, inspection, insurance (all must be ≥ today) |
| Usage | `NumberField` currentMileage, `SelectField` status |
| Assignment | `SearchCombobox` assignedDriver (optional) |
| Actions | `FormActions`: Cancel / Create |

**Submit mutation:** `trucks.create` → audit → redirect `/admin/trucks/{id}`. VIN uniqueness enforced at DB level; server translates conflict to `CONFLICT` → inline error on VIN field.

#### 13.3.c Detail — `/admin/trucks/$truckId`

**Responsibility:** per-truck view. Includes document lifecycle + assignment history. Maintenance tab is Phase 2 placeholder only.

| Tab | Component(s) | Data source / mutation |
|---|---|---|
| Details | `TruckHeader` (unit#, VIN mono, `StatusPill`) + `TruckEditForm` (same shape as create) | `trucks.getAdmin({truckId})`, `trucks.update`, `trucks.setStatus` |
| Documents | `DocumentCard[]` grid (registration, insurance, inspection, other) + `DocumentUpload` per type with `ExpirationBadge` | `documents.getUploadUrl`, `documents.confirmUpload` |
| Assignment history | `Timeline` reconstructed from `audit_log` where entityType='truck' action='assign' | `audit.listForEntity({entityType:'truck', entityId})` |
| Maintenance | `Phase2Placeholder` card — "Maintenance scheduling ships in Phase 2" | — |

**Cross-page invalidation:**
```
trucks.update / setStatus / assignDriver / softDelete →
  setQueryData(['truck', id])
  invalidate(['admin-trucks'])        // list
  invalidate(['driver', driverId])    // if reassigned
  invalidate(['truck-search'])        // load-create combobox results
```

**Done criteria:**
- [ ] Expiration dates round-trip correctly through user TZ (admin TZ on admin side)
- [ ] Soft-delete removes from search comboboxes but keeps the row readable
- [ ] Upload of expirable doc type requires `expirationDate` — form refuses submit without it

---

### 13.4 Brokers — `/admin/brokers`, `/admin/brokers/new`, `/admin/brokers/$brokerId`

**Responsibility:** every entity Gary bills. Identity (company, MC#, DOT#), contacts, billing address + email, payment terms, star rating, **and** a computed scorecard (creative feat. 7). Brokers are **never** exposed to drivers — filter at query boundary.

**Covers routes:** list, create, detail.

#### 13.4.a List — `/admin/brokers`

| Section | Component(s) | Data source |
|---|---|---|
| Header | `PageHeader` + "Add broker" button | static |
| Filters | `DataTableFilters`: payment terms (`net_15`..`quick_pay`), star rating range, text search (company/MC#) | — |
| Table | `DataTable` cols: company, MC# (mono), contact name/email, payment terms chip, **grade badge** (`BrokerGradeBadge` — A/B/C/D/F from scorecard), loads YTD count, `MoneyCell` revenue YTD, `StarRatingDisplay` | `brokers.list({filters, cursor})` — each row carries cached `scorecard.grade` (1hr TTL LRU) |

**Grade badge note:** the grade is rendered server-side into the row payload so the list doesn't fan out N scorecard calls. If Gary recomputes a scorecard on the detail page, invalidate the list cache key.

#### 13.4.b Create — `/admin/brokers/new`

| Section | Component(s) |
|---|---|
| Identity | `TextField` companyName, `TextField` mcNumber, `TextField` dotNumber |
| Primary contact | `TextField` contactName, `PhoneField` contactPhone, `TextField` contactEmail |
| Billing | `TextField` billingEmail (defaults to contactEmail), `AddressAutocompleteField` full address |
| Terms | `SelectField` paymentTerms + conditional `TextField` paymentTermsOther |
| Rating | `TextField` creditRating (A/B+ free text), `StarRatingField` 1–5 |
| Notes | `TextAreaField` notes (admin-only, never sent to broker) |
| Actions | `FormActions` |

**Submit mutation:** `brokers.create` → audit → redirect. MC# uniqueness enforced via partial unique index (per `02-DATA-MODEL §4`); conflict → inline field error.

#### 13.4.c Detail — `/admin/brokers/$brokerId`

**Responsibility:** everything about one broker in tabs. **Loads** and **Invoices** tabs are read-only views scoped to this broker — they do NOT re-implement the full CRUD from those pages; they just filter and link out.

| Tab | Component(s) | Data source / mutation |
|---|---|---|
| Details | `BrokerHeader` (company, MC#, grade badge) + `BrokerEditForm` | `brokers.getAdmin({brokerId})`, `brokers.update`, `brokers.setStarRating` |
| **Scorecard** (feat. 7) | `BrokerScorecardPanel`: avg days to pay, on-time %, rate per mile, load volume, detention incidents, `StarRatingField` editable | `brokers.getScorecard({brokerId})` — cached 1hr in-memory LRU |
| Loads | `DataTable` scoped to `brokerId`; clicking a row opens `/admin/loads/$loadId` | `loads.listByBroker({brokerId, cursor})` |
| Invoices | `DataTable` scoped to `brokerId` with `StatusPill` (overdue = red), row → `/admin/invoices/$invoiceId` | `invoices.listByBroker({brokerId, cursor})` |
| Notes | `TextAreaField` auto-save, admin-only | `brokers.updateNotes` |

**Loader (parallel) for the page shell:**
```ts
Promise.all([
  brokers.getAdmin({ brokerId }),
  brokers.getScorecard({ brokerId }),   // prefetch for Scorecard tab
  loads.listByBroker({ brokerId, limit: 20 }), // prefetch for Loads tab
  invoices.listByBroker({ brokerId, limit: 20 }), // prefetch for Invoices tab
])
```

**Cross-page invalidation:**
```
brokers.update / setStarRating →
  setQueryData(['broker', id])
  invalidate(['admin-brokers'])       // list (grade may shift)
  invalidate(['broker-scorecard', id])
  invalidate(['broker-search'])       // load-create combobox
```

**Driver visibility rule (enforced at every read):** any query that joins loads → brokers must **strip** broker fields before returning to a driver session. See `02-DATA-MODEL §13`.

**Done criteria:**
- [ ] Scorecard never 500s the page — if computation fails, tab renders `ErrorState` with retry; other tabs still work
- [ ] MC# conflict on create surfaces as field error, not toast
- [ ] Soft-deleted brokers disappear from load-create combobox but remain readable from linked loads/invoices
- [ ] Grade badge color matches scorecard panel grade (single source of truth: the scorecard server fn)

---

### 13.5 Live Tracker — `/admin/tracking` ⚠️ Mapbox-blocked

**Responsibility:** real-time fleet awareness — where every active driver is, which load they're on, last ping, and historical breadcrumb for the current load. Not for dispatch decisions directly; dispatch happens on `/admin/loads/$loadId`. Tracker is a **monitor**, not a control surface.

**Covers routes:** `/admin/tracking`.

**Mapbox status:** **not wired yet.** Ship the **non-map half now**; stub the map. When Mapbox lands, drop it into the existing placeholder without refactoring the surrounding components.

#### What ships now (no Mapbox)

| Area | Component(s) | Data source | Ships now? |
|---|---|---|---|
| Shell | `AppShellAdmin` — map area replaced with `MapPlaceholderPanel` | — | ✅ |
| Side panel (left on desktop, top on mobile) | `MapSidePanel` wrapping `ActiveDriverList` | `tracking.getLiveFleetSnapshot()` | ✅ |
| `ActiveDriverList` rows | per-row: `Avatar`, driver name, load# link, `StatusPill`, last update `TimeAgo`, accuracy meters | snapshot payload | ✅ |
| Selected driver card | `DriverInfoCard`: load summary, computed ETA (if available), "View load" → `/admin/loads/$loadId`, "Show breadcrumbs" toggle (disabled, tooltip "Map coming soon") | `tracking.getBreadcrumbsForLoad({loadId})` — fetched but rendered as a `BreadcrumbListFallback` (time + lat/lng list) | ✅ as fallback list |
| Controls | `TrackingControls`: auto-refresh toggle (default on, 20s), manual refresh button, "Last updated Xs ago" | TanStack Query state | ✅ |
| Empty state | `EmptyState`: "No drivers tracking right now" + mini explainer of when tracking activates | — | ✅ |

#### What is stubbed (waiting on Mapbox)

| Component | Replacement now | Swap when Mapbox ships |
|---|---|---|
| `LiveFleetMap` | `MapPlaceholderPanel` — dark box, "Map view coming soon" copy, embedded `ActiveDriverList` compact variant | full Mapbox viewport + `MapMarkerDriver` per snapshot row + `MapMarkerStop` for selected driver's load stops |
| `MapBreadcrumbTrail` (on load detail §13.2.c + history tab on driver detail) | `BreadcrumbListFallback` — `Timeline` of lat/lng+timestamps | Mapbox path overlay on full map |
| `MapPickupDeliveryMini` (load detail §13.2.c) | `AddressCell` (pickup) + `AddressCell` (delivery) stacked with an "Open in Maps" deep-link button (uses `https://www.google.com/maps/?q=lat,lng`, no token needed) | small Mapbox static map with 2 markers |
| `LiveMapPreview` (dashboard §13.1) | `LiveMapPlaceholder` — KPI-style "N drivers active" card + CTA "Open tracker" | Mapbox mini-map with markers |

**Swap strategy:** every map component lives behind a named import. The stubs today and the Mapbox components later share identical props. Plan the Mapbox PR as **one commit per component swap** — no surrounding page rewrites.

**Loader + polling (works today, same shape when map arrives):**
```ts
// TanStack Query
useQuery({
  queryKey: ['tracking-snapshot'],
  queryFn: tracking.getLiveFleetSnapshot,
  refetchInterval: 20_000,
  refetchIntervalInBackground: false,
})

// on driver selection:
useQuery({
  queryKey: ['breadcrumbs', loadId],
  queryFn: () => tracking.getBreadcrumbsForLoad({ loadId }),
  enabled: !!selectedLoadId,
})
```

**Mutations fired from this page:** none. Pure monitoring. Any "action" button links out to the load detail where the status machine lives.

**Accessibility note (holds before + after map ships):** `ActiveDriverList` is the **primary** data surface, not a fallback. Per `brief §7` and this doc §9, the map is never the only way to access the data. Keyboard users and screen readers use the list exclusively.

**Cross-page invalidation consumed here:**
- `loads.updateStatus` / `overrideStatus` invalidates `['tracking-snapshot']` (see §13.2.c) — driver drops off the tracker when status leaves the tracking set
- `loads.cancel` — same

**Done criteria (pre-Mapbox):**
- [ ] Page is useful *without the map* — Gary can see every active driver, their load, and last ping
- [ ] 20s polling pauses on hidden tab
- [ ] Empty state is the default first-run experience (no drivers tracking)
- [ ] Component prop shapes match the future Mapbox components — PR to add the map should touch ≤ 5 files

**Done criteria (post-Mapbox swap, tracked for later):**
- [ ] `mapbox-gl` imported dynamically only (SSR-safe, per audit HP-3)
- [ ] Dark/light style matches app theme
- [ ] Marker color encodes driver status (uses same palette as `StatusPill`)
- [ ] Breadcrumb overlay uses `driver_locations` rows, respects 90d retention

---

### 13.6 Cross-page invariants (apply to all 5 pages above)

1. **SSR everywhere:** `createFileRoute(...).loader` prefetches into `context.queryClient` for every query the component uses (see §7.1 + audit CB-6). No "route has `useQuery` without a loader".
2. **Money:** always `MoneyCell` / `MoneyField`, never raw numbers.
3. **Dates:** always `DateCell`, resolved in admin TZ (`settings.company.timezone`).
4. **Phones:** always `PhoneField` for input, `PhoneCell` for display.
5. **Three states, per section:** loading skeleton, empty state, error state with retry + Sentry event ID.
6. **Cursor pagination** on every list (audit HP-9), never offset.
7. **Audit:** every mutation from any of these pages writes `audit_log` — verified by middleware, not opt-in.
8. **Responsibility isolation:** if you find yourself updating a load's status from the dashboard, stop — that logic belongs on `/admin/loads/$loadId`. Dashboard links out.
