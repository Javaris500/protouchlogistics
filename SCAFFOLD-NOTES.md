# Scaffold Notes (read me first)

This is a **layout-only** scaffold of the ProTouch admin app. No auth, no
database, no server functions yet. The goal is to get the admin shell +
sidebar visible and responsive before any feature work starts.

## Install & run

```
npm install
npm run dev
```

Open http://localhost:3000. You'll land on `/admin/dashboard` (the `/` route
redirects there).

If `npm run dev` fails with *"Cannot find module './routeTree.gen'"* on the
first run, that's the TanStack Router plugin generating the route tree.
Re-run `npm run dev` — it writes the file once and stabilises.

## Stack installed

- TanStack Router + Vite (file-based routing)
- React 19 + TypeScript strict mode
- Tailwind CSS v4 (CSS-first tokens via `@theme`)
- lucide-react icons
- `class-variance-authority` + `tailwind-merge` for shadcn-style variants
- TanStack Query (client set up, no queries yet)

TanStack Start (SSR + server functions) is **not** installed yet — add it
once we start wiring data. The route-tree and layout shell are
compatible with Start; the upgrade is a Vite plugin swap, not a rewrite.

## What's done

- Design tokens locked in `src/styles/globals.css` (`@theme inline`),
  light + dark, matching 01-PROJECT-BRIEF §4.
- `AdminShell` — rounded shell layout (sidebar on left, content card on
  right, breathing gap between them on desktop).
- `AdminSidebar` — desktop, collapsible (icons-only ↔ labeled), with
  toggle button and hover states. Collapse state persisted in cookie.
- `AdminMobileDrawer` — slide-in overlay with backdrop, 44px touch
  targets, close-on-link-tap, Escape-to-close, body-scroll-lock.
- `AdminTopbar` — mobile menu trigger (lg:hidden), search, notifications,
  theme toggle. Hidden on desktop search collapses to icon on narrow
  viewports.
- `SidebarProvider` — state + cookie persistence + responsive behaviour.
- Placeholder pages for every route that appears in the sidebar, so
  nothing 404s while you click around.
- No-flash theme: inline script in `index.html` reads the theme cookie
  before React hydrates.

## What's NOT done (intentional)

- **Sidebar visual design** — waiting for Gary's screenshot. Current
  styling is neutral placeholder. All colors pull from the design tokens,
  so restyling = CSS variable swap, not component rewrite.
- Auth guards — `beforeLoad` on `/admin` layout will be added when Better
  Auth is wired.
- Dashboard widgets, tracking map, tables, forms — all pages render a
  `<PagePlaceholder/>`.
- shadcn/ui primitives beyond `Button` — add with `npx shadcn@latest add
  <name>` once we need them.

## Route tree

```
/                       → redirect to /admin/dashboard
/admin/                 → redirect to /admin/dashboard
/admin                  → AdminShell layout
  /admin/dashboard
  /admin/tracking
  /admin/loads
  /admin/drivers
  /admin/trucks
  /admin/brokers
  /admin/invoices
  /admin/pay
  /admin/documents
  /admin/analytics
  /admin/settings
  /admin/settings/audit
```

## Key files

| File | Purpose |
|---|---|
| `src/styles/globals.css` | Design tokens + Tailwind v4 setup |
| `src/components/layouts/AdminShell.tsx` | Rounded shell wrapper |
| `src/components/layouts/AdminSidebar.tsx` | Desktop sidebar (collapsible) |
| `src/components/layouts/AdminMobileDrawer.tsx` | Mobile slide-in drawer |
| `src/components/layouts/AdminTopbar.tsx` | Header bar |
| `src/components/layouts/SidebarProvider.tsx` | Sidebar state + cookie |
| `src/components/layouts/nav-items.ts` | Single source of truth for nav |
| `src/hooks/use-sidebar.ts` | Sidebar context + cookie helpers |
| `src/hooks/use-media-query.ts` | Responsive breakpoint hook |

## To restyle the sidebar from the screenshot

1. Adjust CSS variables on `:root` and `.dark` in `globals.css`:
   `--sidebar`, `--sidebar-foreground`, `--sidebar-active-bg`,
   `--sidebar-active-fg`, `--sidebar-hover-bg`, `--sidebar-border`,
   `--radius-2xl`.
2. Tweak typography, spacing, and icon size inside `AdminSidebar.tsx` —
   the structure is stable; only class names change.
3. Mobile drawer mirrors the desktop sidebar in `AdminMobileDrawer.tsx`;
   same tokens, same nav source.
