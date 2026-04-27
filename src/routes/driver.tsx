import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { DriverShell } from "@/components/driver/DriverShell";
import { getSessionFn } from "@/server/auth/functions";
import { getDriverSelfFn } from "@/server/functions/driver/me";

/**
 * Layout route for /driver/*. The brief §3.1 auth gate:
 *   - no session → redirect to /login
 *   - role !== 'driver' → redirect to /admin/dashboard
 *
 * Driver profile (firstName/lastName) is loaded once in the layout loader so
 * sidebar + topbar can use it without each child route re-fetching.
 */
export const Route = createFileRoute("/driver")({
  beforeLoad: async () => {
    const session = await getSessionFn();
    if (!session) {
      throw redirect({ to: "/login" });
    }
    if (session.role !== "driver") {
      throw redirect({ to: "/admin/dashboard" });
    }
    return { session };
  },
  loader: async () => {
    return getDriverSelfFn();
  },
  component: DriverLayout,
});

function DriverLayout() {
  const me = Route.useLoaderData();
  return (
    <DriverShell
      driverFirstName={me.firstName}
      driverLastName={me.lastName}
    >
      <Outlet />
    </DriverShell>
  );
}
