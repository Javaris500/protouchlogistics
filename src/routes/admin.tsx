import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/layouts/AdminShell";

/**
 * Layout route for /admin/*. In Phase 1 this will gain a server-side
 * `beforeLoad` guard that enforces role=admin + status=active.
 * For now: pure layout wrapper so the shell is testable without auth.
 */
export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
