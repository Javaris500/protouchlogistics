import { getRequest } from "@tanstack/react-start/server";

import { AuthError, requireDriver, type SessionUser } from "@/server/auth/api";

export interface DriverContext {
  sessionUser: SessionUser;
  driverId: string;
}

/**
 * Resolve the signed-in driver's session + driverId, or throw.
 *
 * Wraps the contract §2 `requireDriver(headers)` for use inside
 * driver-scoped server functions where we always need the session driver's
 * profile id to scope queries. `requireDriver` already throws when there's
 * no session or the role isn't 'driver' — we layer one extra check on top
 * for the (unusual) case of a driver session with no profile row, since
 * downstream queries would silently match zero rows otherwise.
 */
export async function requireDriverContext(): Promise<DriverContext> {
  const req = getRequest();
  if (!req) throw new AuthError("UNAUTHORIZED", "No request context");
  const sessionUser = await requireDriver(req.headers);
  if (!sessionUser.driverId) {
    throw new AuthError(
      "FORBIDDEN",
      "Driver session has no profile — finish onboarding first",
    );
  }
  return { sessionUser, driverId: sessionUser.driverId };
}
