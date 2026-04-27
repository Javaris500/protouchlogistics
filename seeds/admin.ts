/**
 * Seed Gary as the bootstrap admin. Idempotent — bails out cleanly if any
 * admin user already exists.
 *
 * Run: `npm run seed:admin`
 *
 * Reads ADMIN_SEED_EMAIL + ADMIN_SEED_PASSWORD from .env.local. The brief
 * §3.4 spec — the password is rotated on first sign-in via the
 * `firstLoginCompletedAt` gate (per 05-TECH-CONTRACTS §4.2).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { env } from "@/server/env";

async function main() {
  const existing = await db.query.users.findFirst({
    where: eq(users.role, "admin"),
  });
  if (existing) {
    console.log(
      `Admin already exists: ${existing.email}; seed is a no-op.`,
    );
    return;
  }

  const created = await auth.api.signUpEmail({
    body: {
      email: env.ADMIN_SEED_EMAIL,
      password: env.ADMIN_SEED_PASSWORD,
      name: "Gary Tavel",
    },
  });
  if (!created?.user) {
    throw new Error("signUpEmail returned no user");
  }

  await db
    .update(users)
    .set({ role: "admin", status: "active", emailVerified: true })
    .where(eq(users.id, created.user.id));

  console.log(
    `Seeded admin: ${env.ADMIN_SEED_EMAIL} (id=${created.user.id})`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
