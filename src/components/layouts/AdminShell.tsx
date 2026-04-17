import { type ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/lib/toast";

import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { BottomTabBar } from "./BottomTabBar";

interface AdminShellProps {
  children: ReactNode;
}

/**
 * Admin layout.
 *
 * Breakpoints — "smart" means each tier earns its treatment:
 *
 *   Mobile   (< md, < 768px)
 *     - Primary nav: BottomTabBar (Home · Loads · Drivers · More)
 *     - No sidebar — phone viewports are too narrow to share with a nav rail
 *     - 12px gutters, full-bleed content
 *     - Safe-area inset bottom so nothing hides behind the home indicator
 *
 *   Tablet   (md – lg, 768–1023px)
 *     - Sidebar visible, defaults to expanded, user can collapse to icons
 *       (Cmd/Ctrl+B). Cookie persists the choice per-device.
 *     - Floating inset card content, 20-24px gutters
 *     - BottomTabBar hidden
 *
 *   Desktop  (lg+, 1024px+)
 *     - Sidebar expanded by default, generous 32px gutters
 *     - Same inset-card content as tablet, just more breathing room
 *
 * The sidebar's own breakpoint (`sidebar.tsx` `useMediaQuery`) is pinned to
 * `(min-width: 768px)` to match this file. Keep them in sync if you change
 * one.
 */
export function AdminShell({ children }: AdminShellProps) {
  return (
    <SidebarProvider
      defaultOpen
      className="min-h-dvh bg-[var(--surface)] text-[var(--foreground)]"
    >
      <AdminSidebar />
      <SidebarInset
        className={[
          "flex min-h-dvh flex-col",
          "bg-[var(--background)]",
          /* Tablet + desktop: floating card with gap from sidebar */
          "md:my-2 md:mr-2",
          "md:rounded-[var(--radius-xl)] md:border md:border-[var(--border)] md:shadow-[var(--shadow)]",
          "overflow-hidden",
        ].join(" ")}
      >
        <AdminTopbar />
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div
            className={[
              "mx-auto w-full max-w-[1400px]",
              // Mobile → tablet → desktop gutter scaling
              "px-3 py-4 sm:px-5 sm:py-6 md:px-6 md:py-7 lg:px-8 lg:py-8",
              // Reserve BottomTabBar height (~64px) + iPhone home indicator
              // on mobile only. Tablet + desktop have no tab bar.
              "pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8",
            ].join(" ")}
          >
            {children}
          </div>
        </div>
      </SidebarInset>

      {/* Mobile primary nav. Self-hides via `md:hidden`. */}
      <BottomTabBar />

      {/* Toast outlet — renders transient feedback from any button across
          the admin. Module-level singleton; one `<Toaster/>` per app. */}
      <Toaster />
    </SidebarProvider>
  );
}
