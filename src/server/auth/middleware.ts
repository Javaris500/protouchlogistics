import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import {
  AuthError,
  type SessionUser,
  getSession,
  requireAdmin,
  requireDriver,
} from "./api";

/**
 * Coarse auth middleware for TanStack Start server functions.
 *
 * Pattern: chain on `createServerFn(...)` via `.middleware([authRequired])`,
 * then read `context.user` (typed as `SessionUser`) inside the handler.
 *
 * Resource-level access (does this driver own this load?) is enforced
 * inside service code, not here — see 05-TECH-CONTRACTS §6.
 */

function readHeaders(): Headers {
  const req = getRequest();
  if (!req) throw new AuthError("UNAUTHORIZED", "No request context");
  return req.headers;
}

export const authRequired = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const user = await getSession(readHeaders());
    if (!user) throw new AuthError("UNAUTHORIZED", "Not signed in");
    return next({ context: { user } satisfies { user: SessionUser } });
  },
);

export const adminOnly = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const user = await requireAdmin(readHeaders());
    return next({ context: { user } });
  },
);

export const driverOnly = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const user = await requireDriver(readHeaders());
    return next({ context: { user } });
  },
);
