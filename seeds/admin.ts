/**
 * Seed Gary as the bootstrap admin. Idempotent — bails out cleanly if any
 * admin user already exists.
 *
 * Run: `npm run seed:admin`
 *
 * Reads ADMIN_SEED_EMAIL + ADMIN_SEED_PASSWORD from .env.local. Per
 * 05-TECH-CONTRACTS §4.2 the password is rotated on first sign-in via the
 * `firstLoginCompletedAt` gate.
 *
 * Writes directly to users + accounts using bcrypt. We deliberately do NOT
 * go through Better Auth's `auth.api.signUpEmail` here — that wrapper hangs
 * on Vercel functions; src/server/auth/functions.ts now uses a direct
 * bcrypt path and this seed has to match its hash format.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { accounts, users } from "@/server/db/schema";
import { env } from "@/server/env";

const BCRYPT_COST = 10;

async function main() {
  const existing = await db.query.users.findFirst({
    where: eq(users.role, "admin"),
  });
  if (existing) {
    console.log(
      `Admin already exists: ${existing.email}; rotating password hash to bcrypt format.`,
    );
    const hash = await bcrypt.hash(
      env.ADMIN_SEED_PASSWORD.normalize("NFKC"),
      BCRYPT_COST,
    );
    const credAccount = await db.query.accounts.findFirst({
      where: eq(accounts.userId, existing.id),
    });
    if (credAccount) {
      await db
        .update(accounts)
        .set({ password: hash, providerId: "credential" })
        .where(eq(accounts.id, credAccount.id));
    } else {
      await db.insert(accounts).values({
        userId: existing.id,
        providerId: "credential",
        accountId: existing.id,
        password: hash,
      });
    }
    console.log(`  → updated accounts.password for ${existing.email}`);
    return;
  }

  const hash = await bcrypt.hash(
    env.ADMIN_SEED_PASSWORD.normalize("NFKC"),
    BCRYPT_COST,
  );

  const [created] = await db
    .insert(users)
    .values({
      email: env.ADMIN_SEED_EMAIL,
      name: "Gary Tavel",
      role: "admin",
      status: "active",
      emailVerified: true,
    })
    .returning({ id: users.id });
  if (!created) throw new Error("user insert returned no row");

  await db.insert(accounts).values({
    userId: created.id,
    providerId: "credential",
    accountId: created.id,
    password: hash,
  });

  console.log(`Seeded admin: ${env.ADMIN_SEED_EMAIL} (id=${created.id})`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
