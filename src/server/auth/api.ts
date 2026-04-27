import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/server/db";
import { driverProfiles, invites, users } from "@/server/db/schema";
import { env } from "@/server/env";
import { auth } from "./index";

export type Role = "admin" | "driver";

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  driverId: string | null;
};

export class AuthError extends Error {
  constructor(
    public readonly code:
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "INVITE_INVALID"
      | "INVITE_EXPIRED",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

const INVITE_TTL_DAYS = 7;

async function toSessionUser(input: {
  userId: string;
  email: string;
  role: Role;
}): Promise<SessionUser> {
  // driverId resolves for ANY user with a driver_profile, regardless of role.
  // This lets Gary (role='admin') also have a driver_profile and be assignable
  // to loads. UI uses driverId presence — not role — to decide if /driver is
  // accessible.
  const profile = await db.query.driverProfiles.findFirst({
    where: eq(driverProfiles.userId, input.userId),
    columns: { id: true },
  });
  return {
    id: input.userId,
    email: input.email,
    role: input.role,
    driverId: profile?.id ?? null,
  };
}

/**
 * Contract §2 — signIn. Headers carry the cookie jar; Better Auth writes
 * the session cookie on success.
 */
export async function signIn(
  email: string,
  password: string,
  headers: Headers,
): Promise<SessionUser> {
  const result = await auth.api.signInEmail({
    body: { email, password },
    headers,
  });
  if (!result?.user) throw new AuthError("UNAUTHORIZED", "Sign-in failed");

  // Better Auth returns the user with our additionalFields merged in.
  const role = (result.user as { role?: Role }).role ?? "driver";
  return toSessionUser({
    userId: result.user.id,
    email: result.user.email,
    role,
  });
}

export async function signOut(headers: Headers): Promise<void> {
  await auth.api.signOut({ headers });
}

export async function getSession(
  headers: Headers,
): Promise<SessionUser | null> {
  const result = await auth.api.getSession({ headers });
  if (!result?.user) return null;
  const role = (result.user as { role?: Role }).role ?? "driver";
  return toSessionUser({
    userId: result.user.id,
    email: result.user.email,
    role,
  });
}

export async function requireAdmin(headers: Headers): Promise<SessionUser> {
  const user = await getSession(headers);
  if (!user) throw new AuthError("UNAUTHORIZED", "Not signed in");
  if (user.role !== "admin") {
    throw new AuthError("FORBIDDEN", "Admin access required");
  }
  return user;
}

export async function requireDriver(headers: Headers): Promise<SessionUser> {
  const user = await getSession(headers);
  if (!user) throw new AuthError("UNAUTHORIZED", "Not signed in");
  // Allow either: a user with role='driver', OR an admin who has gone
  // through onboarding and has a driver_profile (Gary's dual-mode case).
  // Driver-scoped server functions then scope queries by driverId — never
  // by role — so the admin-as-driver path is data-safe.
  if (user.role !== "driver" && !user.driverId) {
    throw new AuthError("FORBIDDEN", "Driver access required");
  }
  return user;
}

/**
 * Contract §2 — inviteDriver. Creates a one-shot 7-day token. Does NOT
 * pre-create the user row; that happens on `acceptInvite` so the password
 * is hashed by Better Auth's runtime path (not a separate code path that
 * could drift).
 */
export async function inviteDriver(input: {
  email: string;
  invitedByUserId: string;
}): Promise<{ inviteUrl: string; token: string }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  await db.insert(invites).values({
    email: input.email,
    token,
    expiresAt,
    invitedByUserId: input.invitedByUserId,
  });

  const baseUrl = env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return { inviteUrl: `${baseUrl}/accept-invite/${token}`, token };
}

/**
 * Contract §2 — acceptInvite. Validates the token, creates the user via
 * Better Auth's signUp (so password hash format matches sign-in), flips
 * role/status to driver+pending_approval, marks the invite consumed, and
 * signs the user in.
 */
export async function acceptInvite(
  token: string,
  password: string,
  headers: Headers,
): Promise<SessionUser> {
  const now = new Date();
  const invite = await db.query.invites.findFirst({
    where: and(
      eq(invites.token, token),
      gt(invites.expiresAt, now),
      isNull(invites.acceptedAt),
    ),
  });
  if (!invite) throw new AuthError("INVITE_INVALID", "Invite invalid or expired");

  const created = await auth.api.signUpEmail({
    body: {
      email: invite.email,
      password,
      name: invite.email,
    },
  });
  if (!created?.user) {
    throw new AuthError("INVITE_INVALID", "Could not create account");
  }

  await db
    .update(users)
    .set({
      role: "driver",
      status: "pending_approval",
      emailVerified: false,
    })
    .where(eq(users.id, created.user.id));

  await db
    .update(invites)
    .set({ acceptedAt: now })
    .where(eq(invites.id, invite.id));

  await auth.api.signInEmail({
    body: { email: invite.email, password },
    headers,
  });

  return toSessionUser({
    userId: created.user.id,
    email: invite.email,
    role: "driver",
  });
}
