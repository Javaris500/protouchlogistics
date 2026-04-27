import { Link, useRouterState } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

import { driverNavItems } from "./driver-nav-items";

/**
 * Driver portal bottom nav — 4 tabs, no More menu. Driver-side surfaces are
 * shallow enough that everything fits.
 *
 * Visible only below `md` (matches the AdminShell breakpoint). On tablet
 * and desktop, the DriverSidebar takes over.
 */
export function DriverBottomTabBar() {
  const { location } = useRouterState({
    select: (s) => ({ location: s.location }),
  });

  const isActive = (to: string) => {
    if (to === "/driver") {
      // Exact match for Home so deeper routes don't keep it lit.
      return location.pathname === "/driver" || location.pathname === "/driver/";
    }
    return (
      location.pathname === to || location.pathname.startsWith(to + "/")
    );
  };

  return (
    <nav
      aria-label="Driver primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 md:hidden",
        "border-t border-border bg-[var(--background)]/95",
        "supports-[backdrop-filter]:bg-[var(--background)]/80 supports-[backdrop-filter]:backdrop-blur-xl",
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <div className="flex items-stretch">
        {driverNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => haptic.tap()}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5",
                "min-h-[56px] px-1 pt-2 pb-2.5",
                "transition-colors duration-150",
                "active:bg-muted/40",
                active
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted-foreground)]",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute left-1/2 top-1 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--primary)]"
                />
              )}
              <Icon
                className="size-5"
                strokeWidth={active ? 2.25 : 1.75}
                aria-hidden
              />
              <span className="text-[10px] font-semibold leading-none tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
