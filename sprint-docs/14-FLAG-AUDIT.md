# Flag Audit — `feat/infra-auth` (post-Session 1)

**Date:** 2026-04-26
**Branch:** `feat/infra-auth` @ `3b5361e`
**Audited by:** orchestrator

Sweep covered: `import.meta.env.*`, `process.env.*`, `isDev`/`isProd`, NODE_ENV checks, `FAKE_*` mock data, `Dev` nav sections, feature-flag-style names, and config-style toggles (timeouts, cookie TTLs, retry caps, mime allowlists). The result is everything in the codebase that conditionally changes behavior.

---

## 1. Build/runtime mode flags

| Flag | Type | Default | Where it's read | Who can flip it | What depends on it |
|---|---|---|---|---|---|
| `import.meta.env.DEV` | Vite build flag | `true` in `vite dev`, `false` in `vite build` | `OnboardingFooter.tsx:28`, `routes/onboarding/welcome.tsx:35`, `routes/onboarding/pending.tsx:10`, doc-comment in `lib/onboarding/fake-data.ts:3` | Vite (build mode); humans by running `npm run dev` vs `npm run build` | The onboarding "Skip step (dev)" button rendering, dev-only "Skip welcome" link on /onboarding/welcome, dev hint on /onboarding/pending |
| `process.env.NODE_ENV` | Node runtime | `"development"` if unset | `src/server/env.ts:22` | Hosting platform (Vercel sets `production` on prod) | Currently typed but not branched on. Reserved for future server-side dev/prod logic (e.g. Sentry dsn, log verbosity) |

**Risk:** the `isDev` gates correctly disappear in `vite build`, so no dev-only code ships to prod. Confirmed — those branches are tree-shaken on production builds.

---

## 2. Required environment variables (typed via `src/server/env.ts`)

These are not flags so much as configuration; included for completeness because the typed loader **throws at module load** if any required key is missing. Every server-side import of `@/server/env` transitively boots the validator.

| Key | Required? | Default | Source | Used by |
|---|---|---|---|---|
| `DATABASE_URL` | ✓ | — | Railway Postgres | `src/server/db/index.ts`, `drizzle.config.ts`, `seeds/admin.ts` |
| `BETTER_AUTH_SECRET` | ✓ | — | Generated (`crypto.randomBytes(32).toString('base64')`) | Better Auth (cookie signing, CSRF) |
| `BETTER_AUTH_URL` | optional | falls back to `http://localhost:3000` inside `src/server/auth/index.ts:32` | Vercel preview URL | Better Auth `trustedOrigins` (only added to the list when this var is set) and the invite URL builder in `src/server/auth/api.ts` |
| `BLOB_READ_WRITE_TOKEN` | ✓ | — | Vercel Blob | `uploadDoc / deleteBlob / blobExists` in storage helper, `readBlobBytes` in AI helper |
| `AI_GATEWAY_API_KEY` | ✓ | — | Vercel AI Gateway | `gateway()` provider initializes from env automatically |
| `ADMIN_SEED_EMAIL` | ✓ | — | Manual | `seeds/admin.ts` |
| `ADMIN_SEED_PASSWORD` | ✓ | — | Manual | `seeds/admin.ts` |
| `VERCEL_OIDC_TOKEN` | n/a | — | Vercel | Set by `vercel env pull`, not consumed by app code today |

**Risk:** `BETTER_AUTH_URL` being unset in production silently leaves `trustedOrigins` empty and falls back to localhost — Better Auth then refuses cross-origin requests from the Vercel preview URL. The 3.7 deploy step **must** set this before the first sign-in attempt.

---

## 3. Onboarding "Skip / autofill" flags (DEV-only)

The onboarding flow ships a "Skip step (dev)" button that:
1. Calls `update(FAKE_*)` with canned values from `src/lib/onboarding/fake-data.ts`
2. Logs `console.info("[DEV] skipped step: ...")`
3. Advances to the next step

| Trigger | File | Renders when | Side effect |
|---|---|---|---|
| Skip welcome (dev) link | `routes/onboarding/welcome.tsx:134` | `import.meta.env.DEV` | Navigates to `/onboarding/about` |
| Skip step (dev) button | `OnboardingFooter.tsx:73` | `isDev && onSkip` | Whatever the route's `onSkip` handler does |
| `routes/onboarding/about.tsx:79` | handleSkip → FAKE_ABOUT | always present, but only fires through DEV-gated footer | Pre-fills the about step |
| `routes/onboarding/contact.tsx:87` | handleSkip → FAKE_CONTACT | same | Pre-fills contact step |
| `routes/onboarding/cdl.tsx:135` | handleSkip → FAKE_CDL | same | Pre-fills CDL step |
| `routes/onboarding/medical.tsx:111` | handleSkip → FAKE_MEDICAL | same | Pre-fills medical step |
| `routes/onboarding/pending.tsx:103` | DEV-gated debug panel | `isDev` | Pending-state diagnostics |

**Risk:** all gated correctly. The `handleSkip` functions are defined unconditionally, but the footer only renders the button when `isDev`, so prod users have no path to fire them.

**Forward action (Session 3):** when wiring the real OCR + server-backed onboarding, the FAKE_* dataset stays useful for fast cycles. Do NOT remove `lib/onboarding/fake-data.ts` — keep it dev-gated behind `isDev`.

---

## 4. Admin sidebar "Dev" section

| Flag | Where | Behavior |
|---|---|---|
| Sidebar `Dev` group with one item ("Onboarding" → `/onboarding`) | `src/components/layouts/nav-items.ts:99` | **Currently always renders** — there is no `isDev` gate around it |

**Risk:** **medium.** The Dev section is a developer convenience to jump into the driver-onboarding flow from the admin sidebar. In production, an admin would see a "Dev" group that links to a flow they shouldn't normally use. Two paths:

1. (Recommended) Wrap it in `import.meta.env.DEV` inside `AdminSidebar.tsx` so prod builds drop it
2. Leave it — Gary is the only admin and the link is harmless

**Decision left to orchestrator.** Tagging Session 2 to take a position when wiring the admin sidebar against real data.

---

## 5. Auth / runtime configuration toggles (`src/server/auth/index.ts`)

These are not feature flags but they're conditional behavior worth knowing:

| Setting | Value | What it controls |
|---|---|---|
| `emailAndPassword.enabled` | `true` | Whether the credential provider is mounted (yes — only provider in Phase 1) |
| `emailAndPassword.autoSignIn` | `false` | Whether Better Auth auto-signs-in on sign-up. We do this manually after `acceptInvite` so we can also flip role/status first |
| `emailAndPassword.minPasswordLength` | `12` | Per-policy minimum |
| `session.expiresIn` | `7 * 24 * 60 * 60` (7d) | Session cookie lifetime — same for admin and driver in Phase 1; data-model §1 specifies 30d for drivers, deferred to Phase 2 |
| `session.updateAge` | `24 * 60 * 60` (1d) | How often Better Auth slides the session expiry on activity |
| `session.cookieCache.enabled` | `true` | In-memory cookie cache to skip DB hits for getSession |
| `session.cookieCache.maxAge` | `300` (5 min) | TTL on the cookie cache |
| `advanced.database.generateId` | `false` | Defer ID generation to Postgres `defaultRandom()` (uuid). Required because Better Auth's default string IDs don't fit our uuid columns |
| `user.additionalFields.role.defaultValue` | `"driver"` | Default role on `signUpEmail`. Seed/acceptInvite immediately overwrites |
| `user.additionalFields.status.defaultValue` | `"pending_approval"` | Default status. Seed immediately bumps to `active`; acceptInvite leaves it for the driver-approval flow |

**Risk:** the 7d session is a deliberate Phase-1 simplification. Document the data-model 30d driver session as a Phase 2 task.

---

## 6. Router / query config (`src/router.tsx`)

| Setting | Value | What it controls |
|---|---|---|
| `QueryClient.defaultOptions.queries.staleTime` | `5 * 60 * 1000` (5 min) | How long fetched data is considered fresh |
| `QueryClient.defaultOptions.queries.refetchOnWindowFocus` | `true` | Auto-refetch when the tab regains focus |
| `defaultPreload` | `"intent"` | Preload routes on hover/focus |
| `defaultPreloadStaleTime` | `0` | Always re-preload on intent (don't cache the preload) |
| `scrollRestoration` | `true` | Restore scroll position on back/forward |

These are global. Sessions 2 + 3 should not change them without orchestrator review — they affect every route.

---

## 7. Storage / AI hard caps (`src/server/storage/index.ts`, `src/server/ai/index.ts`)

| Constant | Value | Effect |
|---|---|---|
| `MAX_FILE_BYTES` | 25 MB | uploadDoc throws if file is larger. Matches 02-DATA-MODEL §6 |
| `ALLOWED_MIME_TYPES` | `pdf, jpeg, png, heic, webp` | uploadDoc throws on anything else |
| `MAX_ATTEMPTS` | 2 | extractCdl / extractMedicalCard return null after this many failures |
| `MODEL_ID` | `"anthropic/claude-haiku-4-5"` | AI Gateway provider/model string |

Constants live at module scope; flipping requires a code change + redeploy.

---

## 8. Theme bootstrap (`src/routes/__root.tsx`)

Inline `<script>` runs before paint to apply the user's theme without FOUC:

```js
(function(){
  try {
    var c = document.cookie.match(/(?:^|; )theme=([^;]+)/);
    var s = c ? decodeURIComponent(c[1]) : null;
    var p = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var t = s === "light" || s === "dark" ? s : (p ? "dark" : "light");
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.dataset.theme = t;
  } catch(_) {}
}());
```

| Input | Effect |
|---|---|
| `theme=light` cookie | Force light mode |
| `theme=dark` cookie | Force dark mode |
| No cookie + `prefers-color-scheme: dark` | Dark mode |
| No cookie + light system pref (or no media query) | Light mode |

The cookie is set elsewhere (theme toggle in admin shell — likely in `AdminTopbar.tsx`). Audited as informational; not a feature flag, but it does conditionally change rendering.

---

## 9. Summary — recommendations for the orchestrator

| Priority | Recommendation |
|---|---|
| **High** | Set `BETTER_AUTH_URL` in Vercel before the first sign-in attempt, otherwise `trustedOrigins` is empty and login fails on the preview URL |
| **Medium** | Decide whether the admin sidebar "Dev" section should be DEV-gated or shipped to prod. If gated, the wrap goes in `AdminSidebar.tsx` (not `nav-items.ts`) so the data is preserved but not rendered |
| **Low** | Phase 2: implement role-aware session lifetimes (admin 7d, driver 30d) — currently both are 7d |
| **Low** | Phase 2: when Vercel Blob exposes time-bound signing, swap `getSignedUrl`'s pass-through implementation to call it |
| **Info** | The `FAKE_*` autofill dataset is correctly DEV-gated. Keep it for Session 3's onboarding work — it's the fastest path to test the flow |
