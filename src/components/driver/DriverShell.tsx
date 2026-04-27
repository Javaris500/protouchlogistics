import { type ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/lib/toast";

import { DriverSidebar } from "./DriverSidebar";
import { DriverTopbar } from "./DriverTopbar";
import { DriverBottomTabBar } from "./DriverBottomTabBar";

interface DriverShellProps {
  children: ReactNode;
  driverFirstName: string;
  driverLastName: string;
}

/**
 * Driver portal layout — mirrors AdminShell's three-tier breakpoint pattern:
 *   Mobile  (< md): bottom tab bar primary, no sidebar
 *   Tablet+ (md+):  floating sidebar + topbar, no tab bar
 *
 * The sidebar is intentionally collapsed-by-default on tablet so the content
 * column gets the breathing room. Drivers don't need persistent nav; they
 * land on Home and almost never wander.
 */
export function DriverShell({
  children,
  driverFirstName,
  driverLastName,
}: DriverShellProps) {
  return (
    <SidebarProvider
      defaultOpen
      className="min-h-dvh bg-[var(--surface)] text-[var(--foreground)]"
    >
      <DriverSidebar
        driverFirstName={driverFirstName}
        driverLastName={driverLastName}
      />
      <SidebarInset
        className={[
          "flex min-h-dvh flex-col",
          "bg-[var(--background)]",
          "md:my-2 md:mr-2",
          "md:rounded-[var(--radius-xl)] md:border md:border-[var(--border)] md:shadow-[var(--shadow)]",
          "overflow-hidden",
        ].join(" ")}
      >
        <DriverTopbar driverFirstName={driverFirstName} />
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div
            className={[
              "mx-auto w-full max-w-[1024px]",
              "px-3 py-4 sm:px-5 sm:py-6 md:px-6 md:py-7 lg:px-8 lg:py-8",
              "pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8",
            ].join(" ")}
          >
            {children}
          </div>
        </div>
      </SidebarInset>

      <DriverBottomTabBar />

      <Toaster />
    </SidebarProvider>
  );
}
