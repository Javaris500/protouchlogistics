import { createFileRoute, redirect } from "@tanstack/react-router";

import { getSessionFn } from "@/server/auth/functions";

/**
 * Root entry point. Sends users to where they belong:
 *   - admin → /admin/dashboard
 *   - driver → /driver
 *   - unauth → /login
 *
 * This app is invite-only. There is no public sign-up. Drivers are
 * created via admin invites at /accept-invite/$token.
 */
export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const user = await getSessionFn();
    if (!user) throw redirect({ to: "/login" });
    if (user.role === "admin") throw redirect({ to: "/admin/dashboard" });
    throw redirect({ to: "/driver" });
  },
});
