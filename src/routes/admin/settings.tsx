import * as React from "react";
import {
  Link,
  Outlet,
  createFileRoute,
  useRouterState,
} from "@tanstack/react-router";
import {
  History,
  Plug,
  Settings as SettingsIcon,
  SlidersHorizontal,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { cn } from "@/lib/utils";

/**
 * Settings layout route.
 *
 * Wraps Preferences / Integrations / Audit log as a single tabbed hub so:
 *   1. They share one sidebar entry ("Settings") — fixes the "three items
 *      highlight at once" bug we used to see when the sidebar had separate
 *      nav entries for all three.
 *   2. They share a single PageHeader — sub-pages only render their own
 *      body, not another header.
 *
 * Tabs are Link-based instead of Radix TabsTrigger because content is
 * routed through <Outlet />, not swapped in-place. The visual styling
 * matches the Tabs primitive (`src/components/ui/tabs.tsx`) so tab UI is
 * consistent across the admin.
 */

export const Route = createFileRoute("/admin/settings")({
  component: SettingsLayout,
});

const TABS = [
  {
    to: "/admin/settings/preferences",
    label: "Preferences",
    icon: SlidersHorizontal,
  },
  {
    to: "/admin/settings/integrations",
    label: "Integrations",
    icon: Plug,
  },
  {
    to: "/admin/settings/audit",
    label: "Audit log",
    icon: History,
  },
] as const;

function SettingsLayout() {
  const { pathname } = useRouterState({ select: (s) => s.location });

  // Exact match for the tab itself or any nested deep link under it.
  const activeTab =
    TABS.find((t) => pathname === t.to || pathname.startsWith(t.to + "/")) ??
    TABS[0];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Preferences, integrations, and the immutable audit log — all in one place."
      />

      {/* Tab bar — matches the Tabs primitive's underline variant */}
      <div
        role="tablist"
        aria-label="Settings sections"
        className={cn(
          "relative flex h-10 items-stretch gap-5 sm:gap-6",
          "border-b border-[var(--border)]",
          "w-full max-w-full overflow-x-auto scrollbar-none",
        )}
      >
        {TABS.map((tab) => {
          const active = activeTab.to === tab.to;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              role="tab"
              aria-selected={active}
              className={cn(
                "group relative inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap",
                "px-0.5 text-sm font-medium",
                "transition-colors duration-150",
                "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
                // Inactive vs active color
                active
                  ? "text-[var(--foreground)] font-semibold"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                // Copper underline (pseudo-element, animates in)
                "after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:h-[2px]",
                "after:rounded-full after:bg-[var(--primary)]",
                "after:origin-center after:scale-x-0 after:opacity-0",
                "after:transition-[transform,opacity] after:duration-200 after:ease-out",
                active && "after:scale-x-100 after:opacity-100",
                // Hover hint on inactive tabs
                !active &&
                  "hover:after:scale-x-100 hover:after:opacity-40 hover:after:bg-[var(--border-strong)]",
              )}
            >
              <Icon
                className={cn(
                  "size-4 transition-colors",
                  active
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-foreground)]",
                )}
              />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Active tab renders here */}
      <div className="animate-in fade-in-0 duration-200">
        <Outlet />
      </div>
    </div>
  );
}

/**
 * The default Settings icon is used only in the sidebar; exported here so
 * nav-items can still reference a stable icon if this file ever changes.
 */
export const SettingsTabs = TABS;
export { SettingsIcon };
