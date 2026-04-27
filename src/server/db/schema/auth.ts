import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { citext } from "./_types";
import { userRole, userStatus } from "./_enums";

/**
 * Single identity table. Both Gary (admin) and drivers live here.
 *
 * Password material lives on `accounts.password` (Better Auth's credential
 * ledger), not here — this table is identity + role + status only. `name` is
 * required by Better Auth; we seed it from email on invite and refresh it
 * once the driver completes the about-step (firstName + lastName).
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: citext("email").notNull(),
    name: text("name").notNull(),
    role: userRole("role").notNull(),
    status: userStatus("status").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    twoFactorSecret: text("two_factor_secret"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    /**
     * Set when (a) the bootstrap/invite password has been rotated AND
     * (b) for admins, 2FA is enabled. Middleware `requireAdminReady`
     * blocks the admin app until non-null. See 05-TECH-CONTRACTS §4.2.
     */
    firstLoginCompletedAt: timestamp("first_login_completed_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_email_key").on(t.email)],
);

/**
 * Better Auth managed. Durations: admin 7d, driver 30d. HttpOnly, secure,
 * sameSite=lax — configured in src/server/auth.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_token_key").on(t.token),
    index("sessions_user_expires_idx").on(t.userId, t.expiresAt),
  ],
);

/**
 * Better Auth's credential ledger. One row per (userId, providerId). For
 * Phase 1 we only have the email/password provider, so each user has exactly
 * one row here.
 */
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  providerId: text("provider_id").notNull(),
  accountId: text("account_id").notNull(),
  // Email/password credential. Hash format owned by Better Auth.
  password: text("password"),
  // OAuth fields — unused in Phase 1 but Better Auth touches them at write
  // time for any provider it adds, so include them now to avoid a follow-up
  // migration if/when SSO arrives.
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  idToken: text("id_token"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Better Auth verification tokens (email verification, password reset, etc.).
 */
export const verificationTokens = pgTable("verification_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * One-shot driver invite tokens. Gary creates one, the driver consumes it.
 * 7-day TTL by default. `acceptedAt` flips on acceptInvite() to prevent reuse.
 */
export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: citext("email").notNull(),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    invitedByUserId: uuid("invited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("invites_token_key").on(t.token),
    index("invites_email_idx").on(t.email),
  ],
);

/**
 * Single-row settings table. Bootstrap script writes the company name +
 * timezone here on first deploy.
 */
export const companySettings = pgTable("company_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Invite = typeof invites.$inferSelect;
