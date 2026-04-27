import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOutFn } from "@/server/auth/functions";
import { useRouter } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

import { driverNavItems } from "./driver-nav-items";

interface Props {
  driverFirstName: string;
  driverLastName: string;
}

export function DriverSidebar({ driverFirstName, driverLastName }: Props) {
  const { state, toggleSidebar, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
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
          "[mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%-12px),transparent)]",
        )}
      >
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {driverNavItems.map((item) => (
                <DriverNavLink
                  key={item.to}
                  item={item}
                  activePath={activePath}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-[var(--sidebar-border-strong)]">
        <UserCard
          collapsed={collapsed}
          firstName={driverFirstName}
          lastName={driverLastName}
        />
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
            Driver
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
          <linearGradient id="ptl-driver-silver" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e5e5e5" />
            <stop offset="1" stopColor="#a3a3a3" />
          </linearGradient>
          <linearGradient id="ptl-driver-copper" x1="0" y1="0" x2="0" y2="1">
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
          fill="url(#ptl-driver-silver)"
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
          fill="url(#ptl-driver-copper)"
        >
          T
        </text>
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

function useActiveNavPath(): string | null {
  const { location } = useRouterState({
    select: (s) => ({ location: s.location }),
  });

  const candidates = React.useMemo(() => {
    return [...driverNavItems.map((i) => i.to)].sort(
      (a, b) => b.length - a.length,
    );
  }, []);

  return (
    candidates.find(
      (p) => location.pathname === p || location.pathname.startsWith(p + "/"),
    ) ?? null
  );
}

function DriverNavLink({
  item,
  activePath,
}: {
  item: (typeof driverNavItems)[number];
  activePath: string | null;
}) {
  const isActive = activePath === item.to;
  const Icon = item.icon;

  return (
    <SidebarMenuItem className="group/nav-item relative">
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
          "group-data-[collapsible=icon]:!rounded-full",
          !isActive &&
            "text-[var(--sidebar-muted)] hover:text-[var(--sidebar-foreground)]",
          isActive && [
            "!bg-transparent",
            "bg-[image:linear-gradient(90deg,rgb(242_122_26_/_0.16)_0%,rgb(242_122_26_/_0.06)_55%,transparent_100%)]",
            "shadow-[inset_0_0_0_1px_rgb(242_122_26_/_0.12)]",
            "!text-[var(--sidebar-active-fg)]",
            "font-semibold",
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
    </SidebarMenuItem>
  );
}

function UserCard({
  collapsed,
  firstName,
  lastName,
}: {
  collapsed: boolean;
  firstName: string;
  lastName: string;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOutFn();
      await router.navigate({ to: "/login" });
    } finally {
      setSigningOut(false);
    }
  }

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
        {initials || "?"}
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
              {firstName} {lastName}
            </span>
            <span className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--sidebar-muted)]">
              Driver
            </span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label="Sign out"
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-elevated)] hover:text-[var(--sidebar-foreground)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
              "transition-colors",
              signingOut && "opacity-50",
            )}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
