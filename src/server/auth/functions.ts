import { createServerFn } from "@tanstack/react-start";
import {
  getRequest,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { z } from "zod";

import {
  AuthError,
  acceptInvite,
  getSession,
  type SessionUser,
} from "./api";
import { auth } from "./index";

/**
 * Server-function wrappers for the contract §2 surface that browsers can call
 * directly. Better Auth runs server-side; cookies it emits via `Set-Cookie`
 * are forwarded onto the outgoing TanStack Start response via
 * `setResponseHeader`.
 *
 * inviteDriver() is intentionally NOT exposed here — it's admin-only and
 * Session 2 owns the admin route that calls it (see src/server/auth/api.ts).
 */

function readHeaders(): Headers {
  const req = getRequest();
  if (!req) throw new AuthError("UNAUTHORIZED", "No request context");
  return req.headers;
}

/**
 * Forward Set-Cookie from a Better Auth response onto the outgoing TanStack
 * Start response. `getSetCookie()` is the spec-correct way to read multiple
 * Set-Cookie headers; older runtimes that only support `.get('set-cookie')`
 * coalesce them and we'd lose all but the first cookie.
 */
function forwardSetCookies(response: Response) {
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : (() => {
          const raw = response.headers.get("set-cookie");
          return raw ? [raw] : [];
        })();
  if (setCookies.length > 0) {
    setResponseHeader("set-cookie", setCookies);
  }
}

const SignInInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const signInFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => SignInInput.parse(data))
  .handler(async ({ data }): Promise<SessionUser> => {
    const response = await auth.api.signInEmail({
      body: { email: data.email, password: data.password },
      asResponse: true,
    });

    if (!response.ok) {
      throw new AuthError("UNAUTHORIZED", "Sign-in failed");
    }
    forwardSetCookies(response);

    // Re-read the session through our wrapper so we get SessionUser shape
    // (with driverId resolved). Use the request headers from the cookie we
    // just wrote — the Set-Cookie hasn't been applied to the request yet,
    // so we read from the JSON body Better Auth returned.
    const body = (await response.json().catch(() => null)) as
      | { user?: { id: string; email: string; role?: "admin" | "driver" } }
      | null;
    if (!body?.user) throw new AuthError("UNAUTHORIZED", "Sign-in failed");
    return {
      id: body.user.id,
      email: body.user.email,
      role: body.user.role ?? "driver",
      // driverId is resolved on the next request via getSessionFn; the
      // /login scaffold doesn't need it for the redirect decision.
      driverId: null,
    };
  });

export const signOutFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<void> => {
    const response = await auth.api.signOut({
      headers: readHeaders(),
      asResponse: true,
    });
    forwardSetCookies(response);
  },
);

export const getSessionFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionUser | null> => {
    return getSession(readHeaders());
  },
);

const AcceptInviteInput = z.object({
  token: z.string().min(8),
  password: z.string().min(12),
});

export const acceptInviteFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => AcceptInviteInput.parse(data))
  .handler(async ({ data }) => {
    return acceptInvite(data.token, data.password, readHeaders());
  });
