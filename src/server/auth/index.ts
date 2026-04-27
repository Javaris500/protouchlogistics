import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "@/server/db";
import { env } from "@/server/env";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/server/db/schema";

/**
 * Better Auth instance — single source of truth for password hashing, session
 * cookies, and Better Auth's built-in HTTP endpoints (`/api/auth/*`).
 *
 * Why these flags:
 * - `usePlural: true` — our tables are `users`/`sessions`/`accounts`. Better
 *   Auth's default is singular; the flag flips its internal model resolution.
 * - `verification: verificationTokens` — explicit because our table name
 *   doesn't share Better Auth's default (`verification`).
 * - Custom user fields (role, status, …) are mirrored under `user.additionalFields`
 *   so Better Auth knows to read/write them on the `users` row.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema: {
      users,
      sessions,
      accounts,
      // Our table is named verification_tokens; map by alias.
      verifications: verificationTokens,
    },
  }),
  baseURL:
    env.BETTER_AUTH_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"),
  secret: env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: 12,
  },
  user: {
    additionalFields: {
      // role/status are required in the DB but provided by our app code, not
      // by the sign-up form. defaultValue lets Better Auth's signUpEmail
      // succeed with a safe driver default; seed/inviteAccept code overwrites
      // with the correct values immediately after creation.
      role: {
        type: "string",
        required: true,
        defaultValue: "driver",
        input: false,
      },
      status: {
        type: "string",
        required: true,
        defaultValue: "pending_approval",
        input: false,
      },
      twoFactorEnabled: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      twoFactorSecret: { type: "string", required: false },
      lastLoginAt: { type: "date", required: false },
      firstLoginCompletedAt: { type: "date", required: false },
    },
  },
  session: {
    /**
     * 7d default (admin). Driver session lifetime is 30d but Better Auth
     * does not key cookie TTL by role — Phase 1 ships 7d for everyone and
     * Phase 2 can extend per-role via a `customizeSession` callback.
     */
    expiresIn: 7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  // Origin/CSRF allowlist. Without the production alias here, Better Auth
  // rejects sign-in POSTs from https://<project>.vercel.app because VERCEL_URL
  // is the per-deployment URL (e.g. <project>-abc123.vercel.app), not the alias
  // the user actually visits. VERCEL_PROJECT_PRODUCTION_URL covers that gap.
  trustedOrigins: [
    env.BETTER_AUTH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    process.env.VERCEL_BRANCH_URL
      ? `https://${process.env.VERCEL_BRANCH_URL}`
      : null,
    process.env.NODE_ENV === "production" ? null : "http://localhost:3000",
  ].filter((url): url is string => Boolean(url)),
  advanced: {
    // Our schema uses uuid PKs with `defaultRandom()`. Setting generateId
    // to false defers ID assignment to the DB default so Better Auth
    // doesn't try to insert its own random string into a uuid column.
    database: { generateId: false },
  },
});
