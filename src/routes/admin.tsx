import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/layouts/AdminShell";
import { getSessionFn } from "@/server/auth/functions";

/**
 * Layout route for /admin/*. Auth gate:
 *   - no session → redirect to /login
 *   - role !== 'admin' → redirect to /driver
 */
export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const session = await getSessionFn();
    if (!session) {
      throw redirect({ to: "/login" });
    }
    if (session.role !== "admin") {
      throw redirect({ to: "/driver" });
    }
    return { session };
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
