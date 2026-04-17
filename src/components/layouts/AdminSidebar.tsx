import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
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

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader className="pb-0">
        <BrandRow
          collapsed={collapsed}
          onToggle={toggleSidebar}
          showToggle={!isMobile}
        />
        {!collapsed && <SidebarSearch />}
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin px-1.5">
        {adminNavGroups.map((group, gi) => (
          <SidebarGroup key={group.id} className="py-1">
            {gi > 0 && (
              <SidebarSeparator className="mx-1.5 mb-2 bg-[var(--sidebar-border-strong)]/50" />
            )}
            {group.label && (
              <SidebarGroupLabel className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em]">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => (
                  <AdminNavItem key={item.to} item={item} />
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

function SidebarSearch() {
  return (
    <label className="relative mt-2 flex items-center">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-[var(--sidebar-muted)]"
      />
      <SidebarInput
        type="search"
        placeholder="Search…"
        className="h-8 pl-8 pr-12 text-xs"
        aria-label="Search"
      />
      <kbd
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-2 inline-flex h-5 items-center gap-0.5 rounded px-1.5",
          "bg-[var(--sidebar-kbd-bg)] text-[10px] font-medium text-[var(--sidebar-kbd-fg)]",
          "border border-[var(--sidebar-border-strong)]",
        )}
      >
        <span className="text-[11px] leading-none">⌘</span>
        <span className="leading-none">K</span>
      </kbd>
    </label>
  );
}

function AdminNavItem({
  item,
}: {
  item: (typeof adminNavGroups)[number]["items"][number];
}) {
  const { location } = useRouterState({
    select: (s) => ({ location: s.location }),
  });
  const isActive =
    location.pathname === item.to ||
    location.pathname.startsWith(item.to + "/");
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
            "!bg-[var(--sidebar-active-bg)]",
            "!text-[var(--sidebar-active-fg)]",
            "font-semibold",
            // Collapsed + active: richer treatment since there's no label
            // to carry the "active" signal. Ring + inner glow make it pop.
            "group-data-[collapsible=icon]:ring-1",
            "group-data-[collapsible=icon]:ring-[var(--primary)]/35",
            "group-data-[collapsible=icon]:shadow-[0_0_0_1px_rgb(242_122_26_/_0.15),0_0_14px_-4px_rgb(242_122_26_/_0.5)]",
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
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
      {item.badge && <NavBadge tone={item.badge.tone} />}
    </SidebarMenuItem>
  );
}

function NavBadge({ tone, count }: { tone: NavBadgeTone; count?: number }) {
  const label = count === undefined ? "" : String(count);
  const hasCount = label.length > 0;
  return (
    <SidebarMenuBadge
      className={cn(
        hasCount ? "px-1.5" : "h-2 w-2 min-w-0 !rounded-full p-0",
        toneBg(tone),
        hasCount && toneFg(tone),
      )}
    >
      {label}
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
