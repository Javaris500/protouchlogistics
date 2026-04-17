import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Settings "hub" removed — the six-card grid pointed to routes that don't
 * exist yet (Company info / Timezone / Appearance / 2FA / API keys /
 * Display tokens). For now, /admin/settings lands directly on Preferences,
 * the only fully-built subpage. Audit log has its own sidebar entry.
 *
 * When additional settings subpages ship, bring the hub back and wire each
 * card to a real route.
 */
export const Route = createFileRoute("/admin/settings/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/settings/preferences" });
  },
});
