# ProTouch Logistics — Frontend Architecture Deep Dive (Opus Review)

> This audit supersedes the prior Haiku-generated audit. It was re-run against the full
> body of reference documents (01-05) by Opus with the express purpose of finding
> the gaps, contradictions, and factual errors the smaller model missed.

---

## Executive Summary

- **Status:** **NEEDS CHANGES — CONDITIONAL GO**
- **Critical Blockers:** 6 (all fixable in planning, zero of them architectural re-writes)
- **High-Priority Changes:** 12
- **Timeline Impact:** **On schedule** if blockers are addressed before Week 1 sprint starts. Addressing them mid-build adds 1-2 weeks.

### The short version

The prior audit (from the Haiku-level model) rubber-stamped all 20 sections and produced code samples that **will not compile or run** against the locked tech stack. The single worst issue: **every dynamic-route path in the prior audit uses Next.js bracket syntax (`[$loadId].tsx`) instead of TanStack Start's dollar-prefix syntax (`$loadId.tsx`)**. That alone would break file-based routing on day one.

Below I list what's actually wrong, what was omitted entirely, and what the correct pattern looks like. Everything references concrete file paths or concrete framework APIs — no hand-waving.

---

## 🚨 Critical Blockers (must fix before Week 1)

### CB-1 — Wrong TanStack Start route syntax throughout
**Severity:** Critical — nothing routes.
**Where:** Section 1 of prior audit (every dynamic route).

The audit wrote:
```
src/routes/admin/loads/[$loadId].tsx        ❌ Next.js syntax
src/routes/__layout.tsx                     ❌ Next.js App Router-ish
src/routes/__layout-driver.tsx              ❌ Not a TanStack Start convention
```

TanStack Start (file-based, Vite-powered) uses:
```
src/routes/admin/loads/$loadId.tsx          ✅ dollar prefix = dynamic param
src/routes/_admin.tsx                       ✅ underscore prefix = pathless layout
src/routes/admin/_authenticated.loads.tsx   ✅ layout composition via dot notation
src/routes/__root.tsx                       ✅ double-underscore ONLY for root
src/routes/admin.loads.$loadId.tsx          ✅ flat-file variant is also legal
```

Convention reference:
- `$param.tsx` → path parameter (single `$`)
- `_layout.tsx` → pathless layout wrapper (single leading `_`)
- `__root.tsx` → application root only
- `route.loads.$loadId.tsx` → nested-within-folder via dot notation

**Fix:** rewrite the entire route-tree diagram. I've included the corrected layout in **Appendix A**.

---

### CB-2 — `voiceUpdate` server function is absent from the API contract
**Severity:** Critical — feature is unimplementable as specified.
**Where:** 04-CREATIVE-FEATURES §Feature 3, 05-TECH-CONTRACTS §9 (missing).

Creative Feature 3 (Driver Voice Updates) says POST `/api/loads/:loadId/voice-update`. It is rate-limited in 05-TECH-CONTRACTS §12 (`voiceUpdate`, 10/min) — but **no corresponding server function is catalogued in §9**. The audit didn't flag it.

Because it's absent:
- No input/output schema exists (the Zod contract in the creative doc is client-facing only).
- There is no audit-log action name reserved.
- There is no compliance-check path for driver's `voiceConsentAt`.

**Fix:** add to 05-TECH-CONTRACTS §9 under a new §9.13:
| Function | Middleware | Input | Output |
|---|---|---|---|
| `submitVoiceUpdate` | driverOnly, rate-limit, audit | `{loadId, audioKey, durationMs}` | `{noteId, extractedIntent, proposedStatus?, proposedEtaAt?, requiresConfirmation}` |
| `applyVoiceUpdate` | driverOnly, audit | `{noteId, confirm:true, corrections?}` | `{load}` |

The audio itself should follow the normal upload pattern (signed PUT → key → confirm), not be multipart-proxied through the server function. The prior audit had it doing `submitVoiceUpdate({loadId, audio: Blob})` — which breaks the "never proxy files through our server" rule in 05-TECH-CONTRACTS §10.

---

### CB-3 — GPS tracking sample is fundamentally wrong
**Severity:** Critical — feature does not behave as specified.
**Where:** Section 11 of prior audit (`useGpsTracking`).

The prior sample uses `navigator.geolocation.watchPosition`, which **fires on every location change from the OS** — not every 45s and not on 200m-moved thresholds. `intervalRef` is declared but never assigned. The cleanup clears an interval that was never set, and never clears the `watchId` returned by `watchPosition`. Result: permanent location callback leak across route changes, no throttling, and battery drain.

Additional missing pieces the prior audit didn't identify:
1. **Wake Lock API** — a mobile tab is suspended in the background on iOS after ~30s. `navigator.wakeLock.request('screen')` must be called when entering `en_route_pickup` and released on `delivered`. Otherwise tracking silently dies when the driver dims the screen.
2. **Permissions pre-check** — `navigator.permissions.query({name:'geolocation'})` must gate the UI (show "Enable location" CTA on `denied`) rather than failing silently inside the watcher.
3. **Throttling state machine** — the spec is "every 45s OR on 200m movement, whichever first." Correct shape:
   ```ts
   // start watchPosition for movement events
   // AND start a 45s setInterval as the floor
   // post whichever fires first; reset both after a post
   // dedupe with haversine(lastPostedCoord, current) < 200 && dt < 45s → skip
   ```
4. **Offline queue** — truckers spend real time in dead zones. Push to IndexedDB when `navigator.onLine === false`, drain on `online` event. Not addressed.
5. **Server "stop" signal** — 05-TECH-CONTRACTS §11 says `postLocation` returns `ack: false` when status left the tracking set. The hook must honor this and stop. The prior audit ignored it.

**Fix:** use the corrected hook in **Appendix B**.

---

### CB-4 — The "ErrorBoundary" sample is not a React error boundary
**Severity:** Critical — won't catch render errors.
**Where:** Section 16 of prior audit.

The sample uses `useState` + `window.addEventListener('error', ...)` inside a function component. That catches global `window.onerror` events, **not React render-phase errors**. React does not report render errors to `window.onerror`. You need either a class component implementing `componentDidCatch` / `getDerivedStateFromError`, or use `react-error-boundary`'s `<ErrorBoundary>`.

Additionally, because we're on TanStack Router, errors thrown in route `loader`/`beforeLoad` are handled by per-route `errorComponent` / `notFoundComponent` — a totally separate mechanism from React error boundaries. The audit discussed neither.

**Fix — three layers:**
1. **Router-level:** `errorComponent` + `notFoundComponent` on `__root.tsx` and each segment (auth, admin, driver).
2. **React-level:** `react-error-boundary` wrapping `<RouterProvider/>` and again inside each feature-level chunk (`<LiveMap/>`, `<VoiceRecorder/>`, `<InvoicePdfViewer/>`).
3. **Async-level:** `window.addEventListener('unhandledrejection', ...)` → Sentry (prior audit only handled `error`).

---

### CB-5 — TanStack Form Zod integration is syntactically broken
**Severity:** Critical — code won't compile.
**Where:** Section 3 of prior audit.

```tsx
<form.Field name="brokerId" validators={{onChange: z.string().min(1)}}>  // ❌
```

TanStack Form does not accept a raw Zod schema. You need the adapter:
```tsx
import { zodValidator } from '@tanstack/zod-form-adapter';

<form.Field name="brokerId" validators={{onChange: zodValidator(z.string().min(1))}}>
  {(field) => (
    <FormField label="Broker" error={field.state.meta.errors?.join(', ')}>
      {/* errors is ValidationError[], NOT string[] — join/format explicitly */}
    </FormField>
  )}
</form.Field>
```

Also missing from the prior audit:
- **Server-error → field mapping.** 05-TECH-CONTRACTS §8.4 says server returns `{ok:false, error:{code:'VALIDATION_FAILED', details:{fieldErrors: {...}}}}`. The client form must apply these. Pattern:
  ```ts
  form.setFieldMeta(path, (old) => ({...old, errors: serverFieldErrors[path]}));
  ```
- **`form.state.canSubmit` gating** instead of manually ANDing field validity.
- **`subscribe` selector** to prevent whole-form re-renders when a single field changes.
- **`validateOnBlur` vs `validateOnChange`** UX choice — currency / phone should be onBlur (avoids premature "invalid").

---

### CB-6 — TanStack Start SSR data-flow is completely absent
**Severity:** Critical architectural gap.
**Where:** Section 4 of prior audit.

The audit treats TanStack Query as a pure client-side library. TanStack **Start** is SSR-first. For every route that renders data, the idiomatic pattern is:
```ts
export const Route = createFileRoute('/admin/loads/$loadId')({
  loader: async ({context, params}) => {
    return context.queryClient.ensureQueryData(loadByIdOptions(params.loadId));
  },
  component: LoadDetailPage,
});
```
This gives: server-rendered initial HTML, cached payload on client hydration, zero waterfall on hover-preload, and zero flash.

Nowhere does the prior audit mention:
- `context: { queryClient }` in `createRouter`
- `ensureQueryData` / `prefetchQuery` in route loaders
- `dehydrate()` / `HydrationBoundary` for SSR hydration
- `notFoundMode: 'root'` + router-level error handling
- `router.load()` for hover-preloading via `<Link preload="intent">`

**Fix:** require this pattern on every route that has a `useQuery`. "Route has useQuery → route has a loader" should be a lint rule.

---

## ⚠️ High-Priority Changes (not blockers but they will bite)

### HP-1 — Mobile driver layout contradicts mobile-first requirement
The audit has `__layout-driver.tsx` defined as "side nav, breadcrumb, logout". But 01-PROJECT-BRIEF §4 + 03-ROUTES-AND-FEATURES §4 both require **bottom nav on mobile** for drivers. Side nav + breadcrumb is the admin pattern. Need two layout components: `DriverLayoutMobile` (bottom tab bar, drawer for secondary) and `DriverLayoutDesktop` (sidebar) — rendered conditionally via `useMediaQuery`, or one component branching on viewport with responsive Tailwind.

### HP-2 — Conversational onboarding is absent from route list
04-CREATIVE-FEATURES §Feature 10 specifies **one-question-per-screen** with 11 discrete screens (welcome, name, dob, phone, home-address, emergency-contact, cdl-photo, cdl-details, medical-photo, medical-expiry, review). The route list in the prior audit has only 5 onboarding routes (profile, license, medical, review, pending). That's the old design, not the creative feature. Either:
- Fold the 11 screens into 5 logical groups and document which sub-steps belong to each, OR
- Use nested sub-routes `/onboarding/profile/name`, `/onboarding/profile/dob`, etc.

Also missing: `sessionStorage` save-as-you-go scaffolding for the onboarding draft state (the creative doc specifies this is the ONE place sessionStorage is acceptable).

### HP-3 — Mapbox SSR crash + token exposure not handled
- `mapbox-gl` touches `window` at import. It will crash during TanStack Start SSR. Requires **dynamic import** inside a `useEffect`, OR a wrapper component imported via `const Map = lazy(() => import('@/components/features/LiveMap'))` + `<Suspense>`.
- `mapbox-gl/dist/mapbox-gl.css` must be imported once at `__root.tsx` or the map renders broken.
- `mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN` — and the env var MUST be `VITE_` prefixed (01-PROJECT-BRIEF lists `MAPBOX_ACCESS_TOKEN`, unprefixed — it will be undefined on the client).
- Mapbox tokens need URL restriction in Mapbox console to avoid quota theft.

### HP-4 — Document upload's `fetch` can't show progress
`fetch(url, {method:'PUT', body:file})` has no `onUploadProgress`. To meet the UX "Uploading: progress bar (0-100%)" you must use `XMLHttpRequest` or the `axios` library. The prior audit uses fetch — the progress bar won't work. Also missing:
- HEIC preview fallback (iPhones shoot HEIC by default; non-Safari browsers can't decode). Server-side conversion or `heic2any` on upload.
- Upload progress in the UI is not the same as "virus scan" completion. For PODs, rate-cons, legal docs, a post-upload scan status should be surfaced ("Scanned ✓" or "Pending scan"). Phase 2 acceptable, but put it in the roadmap.
- **`extractKeyFromUrl(url)`** in the prior audit is nonsense: the server already returns `fileKey` explicitly per 05-TECH-CONTRACTS §10. Use it directly.

### HP-5 — Load status → UI button mapping is not a design
The audit calls out a "Large status advance button that does the right thing based on current status." But the status machine has 11 states and per-role transition rules (03-ROUTES-AND-FEATURES §2.3). That's a real state machine requiring:
- **Typed transition map**: `{[from]: {[to]: {label, icon, requires: 'pod' | 'location' | null, allowedRoles}}}`.
- **Disabled vs hidden transitions** with tooltip copy explaining why ("Upload POD to continue").
- **Override path for admin** (03 says admin can jump any transition with reason).
- **Optimistic update** pattern + rollback on server rejection (05-TECH-CONTRACTS §7).

Ship it as a component: `<LoadStatusAdvanceButton load={load} role={role} />`. Catalog in the component list.

### HP-6 — Notifications architecture has no real-time plan
03-ROUTES-AND-FEATURES §5 has a 17-row notification matrix. The audit lists `NotificationBell` but doesn't specify:
- **Transport**: polling every 30-60s vs SSE vs WebSocket. Given Phase 1 single-instance Vercel deploy, polling is fine. Decide and document.
- **Unread-count** badge with cache invalidation on mark-read.
- **Toast for high-priority events** (e.g., driver reports issue via voice → gary gets toast + bell).
- **Notification permissions** (Web Push is Phase 2; flag that).

### HP-7 — AI rate-con draft review UI is missing from admin routes
Feature 2 produces a draft load with extracted fields + confidence scores. `/admin/loads/new` is a blank form. There's no route/component for "Review this AI-extracted draft." Add:
- `/admin/loads/$loadId` in `status='draft' and metadata.source='email_ai'` renders a **diff/confidence view**: each field shows the extracted value, the confidence (%), and a subtle indicator on low-confidence fields.
- Inline "confirm extraction" UX before save.

### HP-8 — Driver compliance banner is unspecified
01-PROJECT-BRIEF §3: "Warning banner shown to driver starting 30 days before expiration." 03 has the workflow. The audit's driver dashboard spec doesn't include this banner. Add:
- `<ComplianceBanner variant="warning|error" />` — rendered in `DriverLayout` above content for all driver routes.
- Data comes from `getDriverDashboard` response (already spec'd in 05 §9.11 as `alerts`).

### HP-9 — Wall Mode has a token-leak surface
Feature 8 renders `/admin/wall/$token`. The audit flags "no auth" but misses:
- **Token in URL = token in browser history, referrer headers, screenshots, logs.** Use URL fragment (`#token=...`) so it's never sent to server in Referer — but then server poll must re-receive it. Alternative: exchange token once for a short-lived session cookie scoped to `/admin/wall`. I recommend the latter.
- **Rate-limit** the wall-data endpoint aggressively (token is theft-attractive).
- **IP allowlist** option per display token (Gary can paste his office WAN IP).
- **Content isolation**: wall-mode page must render zero PII beyond first names of drivers and load numbers. The audit doesn't constrain the payload.

### HP-10 — Timezone/display contracts are hand-waved on frontend
Money and dates are spec'd on the server. On the client we need concrete utilities:
- `formatCents(cents: number) → '$1,234.56'` — single source of truth, via `Intl.NumberFormat('en-US',{style:'currency',currency:'USD'})`. Do not re-implement inline.
- `formatInstant(date: Date|string, tz: string, pattern?: string) → string` — via `date-fns-tz` (already endorsed in 05-TECH-CONTRACTS §8.6).
- `<Money value={cents}/>` + `<LocalTime at={iso} tz={tz}/>` components so TZ is never forgotten.
- Admin TZ comes from `getCompanySettings().timezone`; driver TZ from `driver_profiles.timezone` (ADD this column — it's missing from the data model, which means the audit didn't catch that gap either).

### HP-11 — Sentry setup is wrong for a TanStack Start app
- `import.meta.env.VITE_SENTRY_DSN` is correct on the client, but 01-PROJECT-BRIEF lists `SENTRY_DSN` unprefixed (server-only). Need BOTH: `SENTRY_DSN` on server, `VITE_SENTRY_DSN` (or `PUBLIC_SENTRY_DSN` if we set that prefix in Vite config) on client. Clarify in `.env.example`.
- `new Sentry.Replay()` is deprecated → use `Sentry.replayIntegration()`.
- `Sentry.tanstackRouterV1BrowserTracingIntegration({router})` for proper per-route performance instrumentation.
- **Session Replay PII risk**: drivers' voice note transcripts, CDL images, home addresses will all leak into replay. Configure `maskAllInputs: true`, `blockSelector: '.mapboxgl-canvas, [data-private]'`, and `networkDetailAllowUrls` to exclude document download endpoints.

### HP-12 — Accessibility's "blunt reduce-motion" will break essential UX
```css
@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
```
This kills skeleton shimmer (which conveys loading state to users who rely on it), button focus transitions, and the tracking-active pulse indicator. Prefer:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
Also missing: focus management after SPA route change (screen reader users need the new page title announced — add `aria-live="assertive"` region or use `@reach/announce`).

---

## Section-by-Section Findings (condensed)

| # | Section | Status | Critical notes |
|---|---|---|---|
| 1 | Route structure | **FAIL** | See CB-1 (wrong syntax throughout) and HP-2 (conversational onboarding missing) |
| 2 | Component architecture | PASS w/ gaps | Missing: `LoadStatusAdvanceButton`, `ComplianceBanner`, `VoiceRecorder`, `DocumentUpload`, `Money`, `LocalTime`, `BrokerSelect` (async), `DriverSelect`, `AddressAutocomplete`, `MapboxMap`, `BreadcrumbOverlay` |
| 3 | Forms (TanStack Form + Zod) | **FAIL** | See CB-5 (missing `@tanstack/zod-form-adapter`, broken error rendering, no server-error mapping) |
| 4 | State/data fetching | **FAIL** | See CB-6 (no SSR/loader pattern) |
| 5 | TypeScript strictness | PASS w/ gaps | Missing: branded-type adoption list (LoadId, DriverId, TruckId, BrokerId, InvoiceId, DocumentId, NotificationId — should match the uuid columns); `satisfies` pattern for route definitions; exhaustive switch on `LoadStatus` should `assertNever` |
| 6 | Route guards | **FAIL** | `beforeLoad` returns shape mismatches 05-TECH-CONTRACTS `AuthContext`; infinite-redirect risk when status is neither admin-happy nor driver-happy; guards missing from `/invite/$token` and `/admin/wall/$token`; no `context.auth` seeded in `createRouter` |
| 7 | Responsive design | PARTIAL | See HP-1 (driver layout contradiction). Admin-on-tablet breakpoint strategy ignored. Touch-target 44px should be enforced via component (Button, IconButton sizes). |
| 8 | Form states | PASS w/ gaps | No double-submit / idempotency-key pattern. No optimistic mutation catalog. No `aria-busy` + `aria-live` coordination. |
| 9 | Table/list states | PASS w/ gaps | 05-TECH-CONTRACTS §8.1 uses **cursor pagination**; the audit demos **offset pagination** (`page`/`pageSize`). Incompatible — rewrite. Virtualization: use `@tanstack/react-virtual`, not `react-window` (native to stack). |
| 10 | Mapbox GL JS | **FAIL** | See HP-3 (SSR crash, token env, CSS import all missing). No clustering plan for 100+ drivers. No custom-marker plan. No theme sync (app dark mode ↔ map style). |
| 11 | GPS tracking | **FAIL** | See CB-3. |
| 12 | Document upload | PARTIAL FAIL | See HP-4. Also missing: **rate limit 30/min** per 05 §12 must be surfaced in UI as "Too many uploads, wait X seconds"; concurrent-upload conflict UX. |
| 13 | Voice recording | PARTIAL FAIL | See CB-2. Also: `MediaRecorder` on iOS Safari <14.3 unsupported — need feature detection + graceful fallback to a text-note form. `URL.createObjectURL` leaks a blob URL (no `revokeObjectURL`). Consent-capture UI is not routed anywhere (first-use modal on `/loads/$loadId`? Document it.). |
| 14 | Accessibility | PARTIAL | See HP-12. Missing: dialog focus trap (shadcn provides via Radix — note it); skip-link on every layout; landmark roles (`main`, `nav`, `complementary`); Windows high-contrast / `forced-colors` audit; live-region for toast. |
| 15 | Performance | PARTIAL | See HP-3. Missing: bundle visualizer (`rollup-plugin-visualizer`), route-level code-split verification, image pipeline (R2 has no transformer — either Cloudflare Images add-on or `unplugin-imagemin` at build), `<link rel=preload>` for Mapbox CSS/JS on admin routes. |
| 16 | Error boundaries | **FAIL** | See CB-4. |
| 17 | Dark mode | PARTIAL | **FOUC** risk: must set `<html class>` **before** React hydrates, via an inline script in `<head>` that reads the theme cookie. Not addressed. `matchMedia('(prefers-color-scheme: dark)')` for `'system'` default. Tailwind v4 `@theme inline` vs v3 `darkMode: 'class'` — pick one, document. |
| 18 | Sentry | PARTIAL FAIL | See HP-11. |
| 19 | Testing | PARTIAL | Missing: **Playwright MediaRecorder flag** (`--use-fake-ui-for-media-stream`), **geolocation permission grant** pattern (`context.grantPermissions(['geolocation'])`), **MSW** for mocking server functions in component tests, visual-regression strategy for dark/light. |
| 20 | Creative features on FE | PARTIAL | See HP-2, HP-7, HP-9. Broker scorecard inline (A, B+, 31d avg) on broker-select during load creation was spec'd — not in audit. |

---

## Component Build Checklist (ordered)

### Foundation (Week 0 / pre-sprint)
- [ ] Tailwind + shadcn theme (light + dark, primary=copper)
- [ ] `<Money/>`, `<LocalTime/>`, `<Percent/>`, `<Basispoints/>` primitives
- [ ] `<FormField/>`, `<Fieldset/>`, `<ErrorSummary/>` form primitives
- [ ] `<EmptyState/>`, `<ErrorState/>`, `<LoadingSkeleton/>`, `<Pagination/>` (cursor-based)
- [ ] `<Money/>` formatters + Intl setup
- [ ] `ErrorBoundary` (react-error-boundary wrapper) + router `errorComponent`
- [ ] Theme provider + inline-script cookie hydrator
- [ ] Sentry init (client + server, correct env split)
- [ ] Axios-based upload client with progress
- [ ] `useMediaQuery`, `useWakeLock`, `useGpsTracker`, `useVoiceRecorder` hooks

### Layouts
- [ ] `__root.tsx` (meta, scripts, root error component)
- [ ] `_auth.tsx` (redirects authed to dashboard; renders `/login`, `/forgot-password`, `/reset-password`, `/invite/$token`)
- [ ] `_admin.tsx` (admin layout + guards, sidebar desktop)
- [ ] `_driver.tsx` (driver layout, mobile bottom nav + desktop sidebar, compliance banner, tracking-active pill)
- [ ] `_onboarding.tsx` (progress bar, step-counter, save-as-you-go)
- [ ] `/admin/wall/$token` has its own bare layout — no nav, no chrome

### Forms
- [ ] `CreateLoadForm`, `AssignLoadForm`, `UnassignLoadForm`, `UpdateLoadStatusForm`, `CancelLoadForm`, `OverrideStatusForm`
- [ ] `InviteDriverForm`, `ApproveDriverForm`, `RejectDriverForm`, `UpdateDriverForm`, `SuspendDriverForm`
- [ ] `CreateTruckForm`, `UpdateTruckForm`, `AssignTruckForm`
- [ ] `CreateBrokerForm`, `UpdateBrokerForm`
- [ ] `DocumentUploadForm` (with expiration date for expirable types)
- [ ] `CreateInvoiceForm`, `MarkInvoicePaidForm`, `VoidInvoiceForm`, `AdjustPayForm`
- [ ] `CompanySettingsForm`, `CreateDisplayTokenForm`
- [ ] Driver onboarding step forms (matches whichever route design wins HP-2)

### Feature components
- [ ] `<LoadList/>`, `<LoadRow/>`, `<LoadCard/>`, `<LoadStatusPill/>`, `<LoadStatusAdvanceButton/>`, `<LoadStatusHistoryTimeline/>`
- [ ] `<LiveMap/>`, `<BreadcrumbOverlay/>`, `<ActiveDriversPanel/>`, `<LoadPickupDeliveryMap/>`
- [ ] `<DriverDocuments/>`, `<TruckDocuments/>`, `<LoadDocuments/>`, `<GlobalDocumentLibrary/>`, `<ExpirationDashboard/>`
- [ ] `<PaySummary/>`, `<PayRecordDetail/>`, `<PeriodSelector/>`, `<PayCsvExport/>`
- [ ] `<InvoiceList/>`, `<InvoiceLineItems/>`, `<InvoicePdfPreview/>`, `<SendInvoiceModal/>`
- [ ] `<BrokerScorecard/>`, `<BrokerScorecardInline/>` (next to broker dropdown during load create)
- [ ] `<NotificationBell/>`, `<NotificationList/>`, `<NotificationToast/>`, `<UnreadBadge/>`
- [ ] `<AuditLogViewer/>` + `<AuditChangesDiff/>` (before/after JSON diff)
- [ ] `<VoiceRecorder/>` + `<VoiceConsentGate/>` + `<VoiceTranscriptReview/>`
- [ ] `<AiExtractedLoadReview/>` (HP-7) with per-field confidence
- [ ] `<WallDashboard/>` (tickers, ticker-row, big-map, active-loads ticker)
- [ ] `<ComplianceBanner/>` + `<ExpirationBanner/>` + `<TrackingActivePill/>`

### Shared
- [ ] `<Navbar/>`, `<Sidebar/>`, `<BottomNav/>`, `<Breadcrumbs/>`
- [ ] `<AddressAutocomplete/>` (Google Places, debounced, lat/lng on select)
- [ ] `<BrokerSelect/>`, `<DriverSelect/>`, `<TruckSelect/>` (all async, debounced, searchable)
- [ ] `<DatePicker/>` (date-fns-tz aware), `<DateRangePicker/>`
- [ ] `<PhoneInput/>` (E.164 normalization on blur)

---

## Frontend Go/No-Go Decision

**Decision: CONDITIONAL GO.**

Conditions (all must be satisfied before Week 1 sprint starts):
1. Rewrite route-tree diagram using actual TanStack Start file conventions (CB-1) and review against the concrete Appendix A file tree.
2. Add `submitVoiceUpdate` / `applyVoiceUpdate` to 05-TECH-CONTRACTS §9; update schema in 02-DATA-MODEL to add `voiceConsentAt`, `timezone` to `driver_profiles` (CB-2, HP-10).
3. Replace GPS hook with the corrected throttled+wake-lock+offline-queue implementation (CB-3).
4. Adopt `react-error-boundary` + router `errorComponent` on all layouts; remove the window-error-listener pseudo-boundary (CB-4).
5. Add `@tanstack/zod-form-adapter`; write the server-error → field-error shim; document validator patterns (CB-5).
6. Establish the "route has data → route has a loader" rule; write an ADR specifying `createRouter({context:{queryClient}})` + `ensureQueryData` pattern (CB-6).
7. Resolve the HP-1, HP-2, HP-3, HP-7 route/layout gaps in the diagram (not as code, as decisions in the planning docs).

If all seven ship in the planning phase, the project is on schedule. If we push them into Week 1, expect a 1-2 week slip.

---

# Appendix A — Corrected Route Tree (TanStack Start)

```
src/
└── routes/
    ├── __root.tsx                              # root: <Outlet/>, theme, meta, errorComponent
    │
    ├── _auth.tsx                               # pathless: redirects authed users away
    │   ├── login.tsx
    │   ├── forgot-password.tsx
    │   ├── reset-password.tsx                  # reads ?token=
    │   └── invite.$token.tsx                   # dynamic param
    │
    ├── _driver.tsx                             # pathless: driver guard + layout
    │   ├── dashboard.tsx
    │   ├── loads.tsx                           # my loads list (index)
    │   ├── loads.$loadId.tsx
    │   ├── documents.tsx
    │   ├── pay.tsx
    │   ├── pay.$periodId.tsx
    │   ├── profile.tsx
    │   └── settings.tsx
    │
    ├── _onboarding.tsx                         # pathless: onboarding guard + progress layout
    │   └── onboarding/
    │       ├── welcome.tsx
    │       ├── name.tsx
    │       ├── dob.tsx
    │       ├── phone.tsx
    │       ├── home-address.tsx
    │       ├── emergency-contact.tsx
    │       ├── cdl-photo.tsx
    │       ├── cdl-details.tsx
    │       ├── medical-photo.tsx
    │       ├── medical-details.tsx
    │       ├── review.tsx
    │       └── pending.tsx
    │   # alternatively, one file-per-group: profile.tsx | license.tsx | medical.tsx | review.tsx | pending.tsx
    │
    └── admin/                                  # admin namespace
        ├── _layout.tsx                         # admin guard + desktop-first shell
        ├── dashboard.tsx
        ├── loads.index.tsx
        ├── loads.new.tsx
        ├── loads.$loadId.tsx
        ├── drivers.index.tsx
        ├── drivers.invite.tsx
        ├── drivers.pending.tsx
        ├── drivers.$driverId.tsx
        ├── trucks.index.tsx
        ├── trucks.new.tsx
        ├── trucks.$truckId.tsx
        ├── brokers.index.tsx
        ├── brokers.new.tsx
        ├── brokers.$brokerId.tsx
        ├── tracking.tsx                        # full-screen; opts out of admin shell via its own _layout.tsx override
        ├── documents.tsx
        ├── invoices.index.tsx
        ├── invoices.new.tsx
        ├── invoices.$invoiceId.tsx
        ├── pay.tsx
        ├── notifications.tsx
        ├── settings.index.tsx
        ├── settings.preferences.tsx
        ├── settings.audit.tsx
        └── wall.$token.tsx                     # own bare layout; no admin guard; token exchange in loader
```

File naming note: TanStack Start accepts either the flat-file `admin.loads.$loadId.tsx` form or the nested-folder `admin/loads/$loadId.tsx` form. Pick one and stick to it. I recommend nested folders for readability at this scale.

---

# Appendix B — Corrected GPS Tracking Hook

```ts
// src/hooks/use-gps-tracking.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { postLocation } from '@/server/functions/tracking/post';
import { haversineMeters } from '@/lib/geo';
import type { LoadId } from '@/lib/branded-types';

const POST_INTERVAL_MS = 45_000;
const MIN_DISTANCE_M = 200;

type QueuedPost = {
  loadId: LoadId;
  lat: number;
  lng: number;
  accuracyMeters: number | null;
  headingDegrees: number | null;
  speedMps: number | null;
  recordedAt: string;
};

export function useGpsTracking(loadId: LoadId, enabled: boolean) {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPostRef = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const latestPosRef = useRef<GeolocationPosition | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const offlineQueueRef = useRef<QueuedPost[]>([]);

  const flushOfflineQueue = useCallback(async () => {
    while (offlineQueueRef.current.length > 0 && navigator.onLine) {
      const next = offlineQueueRef.current[0];
      try {
        await postLocation({ data: next });
        offlineQueueRef.current.shift();
      } catch {
        break; // stop draining; will retry on next online event
      }
    }
  }, []);

  const postIfThresholdMet = useCallback(
    async (force = false) => {
      const pos = latestPosRef.current;
      if (!pos) return;

      const now = Date.now();
      const last = lastPostRef.current;
      const moved = last
        ? haversineMeters(last.lat, last.lng, pos.coords.latitude, pos.coords.longitude)
        : Infinity;
      const elapsed = last ? now - last.at : Infinity;

      if (!force && moved < MIN_DISTANCE_M && elapsed < POST_INTERVAL_MS) return;

      const payload: QueuedPost = {
        loadId,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyMeters: pos.coords.accuracy ?? null,
        headingDegrees: Number.isFinite(pos.coords.heading) ? pos.coords.heading : null,
        speedMps: Number.isFinite(pos.coords.speed) ? pos.coords.speed : null,
        recordedAt: new Date(pos.timestamp).toISOString(),
      };

      if (!navigator.onLine) {
        offlineQueueRef.current.push(payload);
        return;
      }

      try {
        const res = await postLocation({ data: payload });
        lastPostRef.current = { lat: payload.lat, lng: payload.lng, at: now };
        if (!res.ack) {
          // Server signaled stop (status left tracking set)
          stopTracking();
        }
      } catch (err) {
        offlineQueueRef.current.push(payload);
        setError((err as Error).message);
      }
    },
    [loadId]
  );

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch {
      /* non-fatal */
    }
  }, []);

  const startTracking = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported');
      return;
    }
    const perm = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
    if (perm?.state === 'denied') {
      setError('Location permission denied');
      return;
    }

    await requestWakeLock();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        latestPosRef.current = pos;
        void postIfThresholdMet(false);
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 }
    );

    // Floor: force-post every 45s regardless of movement
    timerRef.current = setInterval(() => void postIfThresholdMet(true), POST_INTERVAL_MS);

    setIsActive(true);
  }, [postIfThresholdMet, requestWakeLock]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
    setIsActive(false);
  }, []);

  // Drain offline queue when connectivity returns
  useEffect(() => {
    const handler = () => void flushOfflineQueue();
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  }, [flushOfflineQueue]);

  // Re-acquire wake lock if tab becomes visible again
  useEffect(() => {
    const handler = () => {
      if (isActive && document.visibilityState === 'visible') void requestWakeLock();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [isActive, requestWakeLock]);

  // React to enabled flag (status-driven)
  useEffect(() => {
    if (enabled && !isActive) void startTracking();
    if (!enabled && isActive) stopTracking();
    return () => {
      if (isActive) stopTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { isActive, error };
}
```

# Appendix C — TanStack Form + Zod, done right

```tsx
// src/components/forms/CreateLoadForm.tsx
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { CreateLoadInputSchema } from '@/server/schemas/loads';
import { createLoad } from '@/server/functions/loads/create';
import { toast } from 'sonner';

export function CreateLoadForm() {
  const qc = useQueryClient();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (input: unknown) => createLoad({ data: input }),
    onSuccess: (result) => {
      if (!result.ok) return; // validation errors handled below
      qc.invalidateQueries({ queryKey: ['loads'] });
      toast.success(`Load ${result.data.loadNumber} created`);
      router.navigate({ to: '/admin/loads/$loadId', params: { loadId: result.data.id } });
    },
  });

  const form = useForm({
    defaultValues: {
      brokerId: '',
      pickup: { /* ... */ },
      delivery: { /* ... */ },
      commodity: '',
      rate: 0,
      /* ... */
    },
    validatorAdapter: zodValidator(),
    validators: { onChange: CreateLoadInputSchema },
    onSubmit: async ({ value, formApi }) => {
      const result = await mutation.mutateAsync(value);
      if (!result.ok && result.error.code === 'VALIDATION_FAILED') {
        const fieldErrors = (result.error.details as { fieldErrors?: Record<string, string[]> })
          ?.fieldErrors ?? {};
        for (const [path, errors] of Object.entries(fieldErrors)) {
          formApi.setFieldMeta(path as never, (old) => ({ ...old, errors }));
        }
        return;
      }
      if (!result.ok) {
        toast.error(result.error.message);
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      noValidate
      aria-busy={form.state.isSubmitting}
    >
      <form.Field name="brokerId">
        {(field) => (
          <FormField
            label="Broker"
            error={field.state.meta.errors.map(String).join(', ') || undefined}
          >
            <BrokerSelect
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              disabled={form.state.isSubmitting}
              aria-invalid={field.state.meta.errors.length > 0}
              aria-describedby={field.state.meta.errors.length ? `${field.name}-error` : undefined}
            />
          </FormField>
        )}
      </form.Field>

      {/* ...more fields... */}

      <form.Subscribe
        selector={(s) => [s.canSubmit, s.isSubmitting] as const}
      >
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create Load'}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
```

---

## Closing note

The prior audit's strength was coverage — it walked through all 20 sections. Its weakness was **ground truth**: it validated the prompt's sample code against the prompt itself rather than against the locked stack. On a paid client engagement that pattern produces code that builds clean on day one and explodes on day two when real behavior is exercised. The seven conditional items above close that gap. Everything else in the prior audit (naming conventions, color system, semantic HTML, 44px touch targets, etc.) holds up and does not need rework.
