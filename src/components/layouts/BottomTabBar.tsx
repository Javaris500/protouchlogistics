import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Package, Users, Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

import { MoreMenuSheet } from "./MoreMenuSheet";

/**
 * Four-item primary nav for mobile only (below `md` / 768px). Tablets and
 * desktop keep the sidebar — a tablet at 768px+ has enough room for the
 * icon-collapsed sidebar without crowding content.
 *
 * We intentionally cap at 3 destinations + a "More" sheet so the bar never
 * gets crowded — four 44px tap targets fit comfortably across a narrow
 * phone in portrait.
 *
 * Picks match Gary's operational priority: Home / Loads / Drivers / More.
 * Live Tracking + Trucks + Brokers + Invoices + Documents + Analytics +
 * Settings all live in the More sheet.
 */
const TABS = [
  { label: "Home", to: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Loads", to: "/admin/loads", icon: Package },
  { label: "Drivers", to: "/admin/drivers", icon: Users },
] as const;

export function BottomTabBar() {
  const [moreOpen, setMoreOpen] = React.useState(false);

  const { location } = useRouterState({
    select: (s) => ({ location: s.location }),
  });
  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <>
      <nav
        aria-label="Primary"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 md:hidden",
          "border-t border-border bg-[var(--background)]/95",
          "supports-[backdrop-filter]:bg-[var(--background)]/80 supports-[backdrop-filter]:backdrop-blur-xl",
          // Respect the iPhone home indicator / Android gesture bar.
          "pb-[env(safe-area-inset-bottom)]",
        )}
      >
        <div className="flex items-stretch">
          {TABS.map((t) => (
            <TabButton
              key={t.to}
              to={t.to}
              label={t.label}
              icon={t.icon}
              active={isActive(t.to)}
            />
          ))}
          <button
            type="button"
            onClick={() => {
              haptic.tap();
              setMoreOpen(true);
            }}
            aria-label="More navigation"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5",
              "min-h-[56px] px-1 pt-2 pb-2.5",
              "text-[var(--muted-foreground)] transition-colors",
              "active:bg-muted/40",
              moreOpen && "text-[var(--primary)]",
            )}
          >
            <Menu
              className="size-5"
              strokeWidth={moreOpen ? 2.25 : 1.75}
              aria-hidden
            />
            <span className="text-[10px] font-semibold leading-none tracking-tight">
              More
            </span>
          </button>
        </div>
      </nav>

      <MoreMenuSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        tabPaths={new Set(TABS.map((t) => t.to))}
      />
    </>
  );
}

function TabButton({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      onClick={() => haptic.tap()}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center gap-0.5",
        "min-h-[56px] px-1 pt-2 pb-2.5",
        "transition-colors duration-150",
        "active:bg-muted/40",
        active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]",
      )}
    >
      {/* Active "dot" above the icon — subtle cue, doesn't shout. */}
      {active && (
        <span
          aria-hidden
          className="absolute left-1/2 top-1 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--primary)]"
        />
      )}
      <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
      <span className="text-[10px] font-semibold leading-none tracking-tight">
        {label}
      </span>
    </Link>
  );
}
