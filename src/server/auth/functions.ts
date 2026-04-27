import { createHmac, randomBytes, scrypt as scryptCb } from "node:crypto";

import { createServerFn } from "@tanstack/react-start";
import {
  getRequest,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import { accounts, sessions, users } from "@/server/db/schema";
import { env } from "@/server/env";

import {
  AuthError,
  acceptInvite,
  getSession,
  type SessionUser,
} from "./api";

/**
 * Direct auth implementation. We deliberately do NOT call `auth.api.signInEmail`
 * / `signUpEmail` / `signOut` from in-process: those calls hang the Vercel
 * function for the full 300s timeout (debugged 2026-04-27 — symptom is no
 * stack trace, no logs, just a function timeout). The cause sits inside
 * Better Auth's API wrapper when invoked outside an HTTP request, and
 * isolating it would have eaten the launch window.
 *
 * What we keep: the same DB tables (`users`, `accounts`, `sessions`) and the
 * same cookie format Better Auth uses, so `auth.api.getSession()` (called
 * from `getSessionFn` and `requireAdmin`/`requireDriver` middleware) reads
 * the session cookie we write here without changes.
 *
 * Cookie shape (matches Better Auth defaults):
 *   name: __Secure-better-auth.session_token   (prod)
 *         better-auth.session_token            (dev)
 *   value: ${token}.${HMAC_SHA256(secret, token, base64urlnopad)}
 *   attrs: HttpOnly; Path=/; SameSite=Lax; Secure (prod); Max-Age=expiresIn
 *
 * Password hash format (matches @better-auth/utils/password):
 *   "${saltHex}:${keyHex}" with scrypt N=16384 r=16 p=1 dkLen=64.
 */

function scrypt(
  password: string,
  salt: string,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

const SCRYPT_N = 16384;
const SCRYPT_R = 16;
const SCRYPT_P = 1;
const SCRYPT_DKLEN = 64;
const SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2;

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const COOKIE_PREFIX = "better-auth";
const COOKIE_NAME = "session_token";
const isProd = env.NODE_ENV === "production";
const SECURE_COOKIE = isProd;
const FULL_COOKIE_NAME = SECURE_COOKIE
  ? `__Secure-${COOKIE_PREFIX}.${COOKIE_NAME}`
  : `${COOKIE_PREFIX}.${COOKIE_NAME}`;

function readHeaders(): Headers {
  const req = getRequest();
  if (!req) throw new AuthError("UNAUTHORIZED", "No request context");
  return req.headers;
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password.normalize("NFKC"), salt, SCRYPT_DKLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  return `${salt}:${key.toString("hex")}`;
}

async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  const [salt, keyHex] = hash.split(":");
  if (!salt || !keyHex) return false;
  const target = await scrypt(password.normalize("NFKC"), salt, SCRYPT_DKLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  return target.toString("hex") === keyHex;
}

// Match better-call's signed-cookie format exactly (its `getSignedCookie`
// asserts `signature.length === 44 && signature.endsWith("=")` — i.e. base64
// SHA-256 with padding, NOT base64url). The `value.signature` string is then
// URL-encoded as a whole before being placed in the Set-Cookie header.
function signCookieValue(value: string): string {
  const sig = createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(value)
    .digest("base64");
  return encodeURIComponent(`${value}.${sig}`);
}

function buildSetCookieHeader(value: string, maxAgeSec: number): string {
  const parts = [
    `${FULL_COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSec}`,
  ];
  if (SECURE_COOKIE) parts.push("Secure");
  return parts.join("; ");
}

async function createSessionAndSetCookie(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  const req = getRequest();
  const ipAddress =
    req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = req?.headers.get("user-agent") ?? null;

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
    ipAddress,
    userAgent,
  });

  const signed = signCookieValue(token);
  setResponseHeader(
    "set-cookie",
    buildSetCookieHeader(signed, SESSION_TTL_SECONDS),
  );
}

const SignInInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const signInFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => SignInInput.parse(data))
  .handler(async ({ data }): Promise<SessionUser> => {
    const t0 = Date.now();
    const log = (step: string, extra?: Record<string, unknown>) => {
      console.log(
        JSON.stringify({ at: "signInFn", ms: Date.now() - t0, step, ...extra }),
      );
    };
    log("enter");
    const email = data.email.trim().toLowerCase();
    log("findUser:start", { email });
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true, email: true, role: true },
    });
    log("findUser:done", { found: !!user });
    if (!user) {
      log("hash-throwaway:start");
      await hashPassword(data.password).catch(() => undefined);
      log("hash-throwaway:done");
      throw new AuthError("UNAUTHORIZED", "Invalid email or password");
    }

    log("findAccount:start");
    const credAccount = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, user.id),
        eq(accounts.providerId, "credential"),
      ),
      columns: { password: true },
    });
    log("findAccount:done", { hasPw: !!credAccount?.password });
    if (!credAccount?.password) {
      throw new AuthError("UNAUTHORIZED", "Invalid email or password");
    }

    log("scrypt:start");
    const ok = await verifyPassword(credAccount.password, data.password);
    log("scrypt:done", { ok });
    if (!ok) {
      throw new AuthError("UNAUTHORIZED", "Invalid email or password");
    }

    log("session:start");
    await createSessionAndSetCookie(user.id);
    log("session:done");

    // Driver profile lookup happens on the next request via getSessionFn;
    // /login redirect decision uses role only.
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      driverId: null,
    };
  });

export const signOutFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<void> => {
    const headers = readHeaders();
    const cookieHeader = headers.get("cookie") ?? "";
    const match = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${FULL_COOKIE_NAME}=`));
    if (match) {
      const raw = match.slice(FULL_COOKIE_NAME.length + 1);
      const dotIdx = raw.lastIndexOf(".");
      const token = dotIdx >= 0 ? raw.slice(0, dotIdx) : raw;
      if (token) {
        await db.delete(sessions).where(eq(sessions.token, token));
      }
    }
    setResponseHeader("set-cookie", buildSetCookieHeader("", 0));
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

const SignUpInput = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  name: z.string().min(1).max(120).optional(),
});

/**
 * Public driver self-signup. Creates a `users` row with role='driver' and
 * status='pending_approval', plus the matching `accounts` credential row.
 * Caller redirects to /onboarding; Gary approves via /admin/drivers/pending.
 */
export const signUpFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => SignUpInput.parse(data))
  .handler(async ({ data }): Promise<SessionUser> => {
    const email = data.email.trim().toLowerCase();
    const fallbackName = email.split("@")[0] ?? email;
    const name = data.name?.trim() || fallbackName;

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true },
    });
    if (existing) {
      throw new AuthError(
        "UNAUTHORIZED",
        "An account with this email already exists.",
      );
    }

    const passwordHash = await hashPassword(data.password);

    const [created] = await db
      .insert(users)
      .values({
        email,
        name,
        role: "driver",
        status: "pending_approval",
      })
      .returning({ id: users.id, email: users.email, role: users.role });
    if (!created) {
      throw new AuthError("UNAUTHORIZED", "Sign-up failed");
    }

    await db.insert(accounts).values({
      userId: created.id,
      providerId: "credential",
      accountId: created.id,
      password: passwordHash,
    });

    await createSessionAndSetCookie(created.id);

    return {
      id: created.id,
      email: created.email,
      role: created.role,
      driverId: null,
    };
  });
