import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { adminNavGroups, type NavBadgeTone } from "./nav-items";

export function AdminSidebar() {
  const { state, toggleSidebar, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  // Compute once for the whole sidebar — every nav item compares against
  // this instead of running its own startsWith check. Guarantees that only
  // the most-specific matching nav item lights up.
  const activePath = useActiveNavPath();

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader className="border-b border-[var(--sidebar-border-strong)]/50 pb-3">
        <BrandRow
          collapsed={collapsed}
          onToggle={toggleSidebar}
          showToggle={!isMobile}
        />
      </SidebarHeader>

      <SidebarContent
        className={cn(
          "scrollbar-thin relative px-1.5",
          // Subtle scroll-fade at the top and bottom so long nav lists don't
          // collide visually with the fixed header/footer. Pure mask-image,
          // no extra DOM.
          "[mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%-12px),transparent)]",
        )}
      >
        {adminNavGroups.map((group, gi) => (
          <SidebarGroup key={group.id} className="py-1">
            {gi > 0 && (
              <SidebarSeparator className="mx-1.5 mb-2 bg-[var(--sidebar-border-strong)]/50" />
            )}
            {group.label && (
              <SidebarGroupLabel
                className={cn(
                  "mb-1.5 h-auto px-2 py-0.5",
                  "text-[10px] font-bold uppercase tracking-[0.16em]",
                  "text-[var(--sidebar-muted)]/90",
                )}
              >
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => (
                  <AdminNavItem
                    key={item.to}
                    item={item}
                    activePath={activePath}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-[var(--sidebar-border-strong)]">
        <UserCard collapsed={collapsed} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function BrandRow({
  collapsed,
  onToggle,
  showToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
  showToggle: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5",
        collapsed ? "flex-col gap-2 py-0.5" : "px-0.5",
      )}
    >
      <LogoMark />
      {!collapsed && (
        <div className="flex min-w-0 flex-1 flex-col leading-none">
          <span className="truncate text-[13px] font-bold tracking-tight text-[var(--sidebar-foreground)]">
            ProTouch
          </span>
          <span className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--sidebar-muted)]">
            Logistics
          </span>
        </div>
      )}
      {showToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar (⌘B)" : "Collapse sidebar (⌘B)"}
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
            "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-foreground)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
            "transition-colors",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} />
          ) : (
            <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
          )}
        </button>
      )}
    </div>
  );
}

/**
 * Inline SVG logo mark — a dark rounded tile with "PT" wordmark in the
 * ProTouch treatment: silver P + copper T with a subtle road suggestion
 * underneath. No external image dependency; scales crisply at any size.
 */
function LogoMark() {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex h-9 w-9 shrink-0 items-center justify-center",
        "rounded-[10px] overflow-hidden",
        "bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a]",
        "ring-1 ring-inset ring-white/[0.08]",
        "shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]",
      )}
    >
      <svg
        viewBox="0 0 36 36"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ptl-silver" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e5e5e5" />
            <stop offset="1" stopColor="#a3a3a3" />
          </linearGradient>
          <linearGradient id="ptl-copper" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fba85c" />
            <stop offset="1" stopColor="#e06a10" />
          </linearGradient>
        </defs>
        <text
          x="7"
          y="24"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="18"
          fontWeight="900"
          letterSpacing="-1"
          fill="url(#ptl-silver)"
        >
          P
        </text>
        <text
          x="18"
          y="24"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="18"
          fontWeight="900"
          letterSpacing="-1"
          fill="url(#ptl-copper)"
        >
          T
        </text>
        {/* Road motif under the wordmark */}
        <rect
          x="6"
          y="27"
          width="24"
          height="1.5"
          rx="0.75"
          fill="#525252"
          opacity="0.6"
        />
        <rect x="14" y="27.25" width="3" height="1" rx="0.5" fill="#f27a1a" />
        <rect x="19" y="27.25" width="3" height="1" rx="0.5" fill="#f27a1a" />
      </svg>
    </span>
  );
}

/**
 * The most-specific nav path that matches the current URL. Computed once per
 * render so every AdminNavItem agrees on which single item should be active.
 *
 * Without this: a parent path like "/admin/settings" and a child path like
 * "/admin/settings/audit" would both match their own `startsWith` rule when
 * the user is on the audit page, lighting up two nav items at once.
 */
function useActiveNavPath(): string | null {
  const { location } = useRouterState({
    select: (s) => ({ location: s.location }),
  });

  // Flatten all nav item paths, sort by length descending — the most specific
  // (deepest) route wins. If "/admin/settings/audit" matches, it's found
  // before "/admin/settings" and we stop there.
  const candidates = React.useMemo(() => {
    const paths = adminNavGroups.flatMap((g) => g.items.map((i) => i.to));
    return [...paths].sort((a, b) => b.length - a.length);
  }, []);

  return (
    candidates.find(
      (p) => location.pathname === p || location.pathname.startsWith(p + "/"),
    ) ?? null
  );
}

function AdminNavItem({
  item,
  activePath,
}: {
  item: (typeof adminNavGroups)[number]["items"][number];
  activePath: string | null;
}) {
  const isActive = activePath === item.to;
  const Icon = item.icon;

  return (
    <SidebarMenuItem className="group/nav-item relative">
      {/* Left accent bar — only in expanded mode. In collapsed mode the
          button itself carries the active signal (tinted bg + ring), so
          the bar would just peek out from a rounded square and look noisy. */}
      {isActive && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2",
            "h-5 w-[3px] rounded-full bg-[var(--primary)]",
            "shadow-[0_0_8px_rgba(242,122,26,0.55)]",
            "group-data-[collapsible=icon]:hidden",
          )}
        />
      )}
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.label}
        size="default"
        className={cn(
          "transition-all duration-150",
          // Collapsed: square → circle for icon parity with topbar buttons
          "group-data-[collapsible=icon]:!rounded-full",
          !isActive &&
            "text-[var(--sidebar-muted)] hover:text-[var(--sidebar-foreground)]",
          isActive && [
            // Clear the CVA's flat bg-color so the gradient reads cleanly
            "!bg-transparent",
            // Expanded active: horizontal copper gradient "lit" from the
            // left accent bar outward — stronger near the bar, fading to
            // transparent on the right so the pill feels radiant, not stamped.
            "bg-[image:linear-gradient(90deg,rgb(242_122_26_/_0.16)_0%,rgb(242_122_26_/_0.06)_55%,transparent_100%)]",
            // Inset copper hairline — defines the pill against the panel
            // without adding visual noise.
            "shadow-[inset_0_0_0_1px_rgb(242_122_26_/_0.12)]",
            "!text-[var(--sidebar-active-fg)]",
            "font-semibold",
            // Collapsed + active: the pill is a circle, so swap the linear
            // gradient for a centered radial glow. Outer ring + soft halo
            // make the icon feel illuminated rather than pressed.
            "group-data-[collapsible=icon]:bg-[image:radial-gradient(circle_at_center,rgb(242_122_26_/_0.22)_0%,rgb(242_122_26_/_0.04)_80%)]",
            "group-data-[collapsible=icon]:ring-1",
            "group-data-[collapsible=icon]:ring-[var(--primary)]/35",
            "group-data-[collapsible=icon]:!shadow-[0_0_0_1px_rgb(242_122_26_/_0.18),0_0_16px_-4px_rgb(242_122_26_/_0.55)]",
          ],
        )}
      >
        <Link to={item.to} aria-current={isActive ? "page" : undefined}>
          <Icon
            strokeWidth={1.75}
            className={cn(
              "transition-colors",
              isActive
                ? "text-[var(--primary)]"
                : "text-[var(--sidebar-muted)] group-hover/nav-item:text-[var(--sidebar-foreground)]",
            )}
          />
          <span className="group-data-[collapsible=icon]:hidden">
            {item.label}
          </span>
        </Link>
      </SidebarMenuButton>
      {item.badge && <NavBadge tone={item.badge.tone} />}
    </SidebarMenuItem>
  );
}

function NavBadge({ tone, count }: { tone: NavBadgeTone; count?: number }) {
  // Only render when there's an actual count to show. Empty "dot" placeholders
  // looked noisy on static nav items that haven't been data-wired yet.
  // When the counters (pendingApprovals, overdueInvoices, expiringDocs, etc.)
  // start returning real numbers, this renders the tinted count pill.
  if (count === undefined || count <= 0) return null;
  return (
    <SidebarMenuBadge className={cn("px-1.5", toneBg(tone), toneFg(tone))}>
      {count}
    </SidebarMenuBadge>
  );
}

function toneBg(tone: NavBadgeTone): string {
  switch (tone) {
    case "primary":
      return "bg-[var(--primary)]";
    case "warning":
      return "bg-[var(--warning)]";
    case "danger":
      return "bg-[var(--danger)]";
    default:
      return "bg-[var(--sidebar-elevated)]";
  }
}

function toneFg(tone: NavBadgeTone): string {
  switch (tone) {
    case "primary":
      return "text-[var(--primary-foreground)]";
    case "warning":
      return "text-[var(--warning-foreground)]";
    case "danger":
      return "text-[var(--danger-foreground)]";
    default:
      return "text-[var(--sidebar-foreground)]";
  }
}

function UserCard({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-[var(--radius-md)] p-2",
        "transition-colors",
        collapsed && "justify-center p-1",
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          "bg-gradient-to-br from-[var(--primary-light)] to-[var(--primary-hover)]",
          "text-[11px] font-bold tracking-tight text-[var(--primary-foreground)]",
          "ring-1 ring-inset ring-white/20",
          "shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]",
        )}
      >
        GT
        {/* Subtle online dot — quiet cue that the session is live. */}
        <span
          aria-hidden="true"
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full",
            "bg-[var(--success)]",
            "ring-2 ring-[var(--sidebar)]",
          )}
        />
      </div>
      {!collapsed && (
        <>
          <div className="flex min-w-0 flex-1 flex-col leading-none">
            <span className="truncate text-[13px] font-medium text-[var(--sidebar-foreground)]">
              Gary Tavel
            </span>
            <span className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--sidebar-muted)]">
              Admin
            </span>
          </div>
          <button
            type="button"
            aria-label="Sign out"
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-elevated)] hover:text-[var(--sidebar-foreground)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
              "transition-colors",
            )}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
