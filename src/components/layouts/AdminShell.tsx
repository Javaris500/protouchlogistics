import { type ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

interface AdminShellProps {
  children: ReactNode;
}

/**
 * Admin layout. Uses shadcn's `<Sidebar variant="floating"/>` — a dark card
 * that floats on a light surface. Content area is also a floating card on
 * desktop with rounded corners and border. Mobile gets full-width content
 * and the sidebar as a Sheet drawer.
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
          /* Desktop: floating card with gap from sidebar */
          "lg:my-2 lg:mr-2",
          "lg:rounded-[var(--radius-xl)] lg:border lg:border-[var(--border)] lg:shadow-[var(--shadow)]",
          "overflow-hidden",
        ].join(" ")}
      >
        <AdminTopbar />
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div
            className={[
              "mx-auto w-full max-w-[1400px]",
              // Tighter gutters on mobile so cards get more real estate,
              // scaling up for tablet and desktop.
              "px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8",
            ].join(" ")}
          >
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
