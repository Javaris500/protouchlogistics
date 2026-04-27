/**
 * Seed Railway with the minimum demo data Gary should see on first login:
 *
 *   - one company_settings row (name + timezone)
 *   - one broker (CH Robinson, MC#123456, net_30)
 *   - one truck (2022 Freightliner Cascadia, status=active)
 *   - one driver invite token (testdriver@example.com)
 *
 * Idempotent — safe to re-run. Each entity is checked before insert; the
 * second run prints "already seeded" for everything.
 *
 * NO loads, NO documents, NO past pay periods. Phase 1's first-login
 * experience is "empty cockpit + send your first invite"; loads get
 * created live with Gary on the call.
 *
 * Run: `npm run seed:demo`
 *
 * Prerequisites:
 *   - .env.local populated (DATABASE_URL etc.)
 *   - `npm run seed:admin` has run (Gary must exist; demo seed exits if
 *     it can't find an admin user — invites need an inviter)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/server/db";
import {
  brokers,
  companySettings,
  invites,
  trucks,
  users,
} from "@/server/db/schema";
import { inviteDriver } from "@/server/auth/api";
import { env } from "@/server/env";

const DEMO_DRIVER_EMAIL = "testdriver@example.com";
const DEMO_BROKER_MC = "123456";
const DEMO_TRUCK_VIN = "1FUJGLDR5NLAA1234"; // 2022 Cascadia VIN shape

async function ensureCompanySettings(): Promise<void> {
  const existing = await db.query.companySettings.findFirst();
  if (existing) {
    console.log(
      `  ✓ company_settings already seeded (${existing.name}, ${existing.timezone})`,
    );
    return;
  }
  const [row] = await db
    .insert(companySettings)
    .values({
      name: "ProTouch Logistics",
      timezone: "America/Chicago",
    })
    .returning();
  console.log(`  + company_settings: ${row.name} / ${row.timezone}`);
}

async function ensureAdmin(): Promise<{ id: string; email: string }> {
  const existing = await db.query.users.findFirst({
    where: eq(users.role, "admin"),
    columns: { id: true, email: true },
  });
  if (!existing) {
    throw new Error(
      "No admin user found. Run `npm run seed:admin` before `npm run seed:demo` — the invite token needs an inviter.",
    );
  }
  console.log(`  ✓ admin: ${existing.email}`);
  return existing;
}

async function ensureBroker(): Promise<void> {
  const existing = await db.query.brokers.findFirst({
    where: eq(brokers.mcNumber, DEMO_BROKER_MC),
  });
  if (existing) {
    console.log(
      `  ✓ broker already exists: ${existing.companyName} (MC#${existing.mcNumber})`,
    );
    return;
  }
  const [row] = await db
    .insert(brokers)
    .values({
      companyName: "CH Robinson",
      mcNumber: DEMO_BROKER_MC,
      dotNumber: "987654",
      contactName: "Sarah Mitchell",
      contactPhone: "+15551234567",
      contactEmail: "sarah.mitchell@chrobinson.example.com",
      billingEmail: "billing@chrobinson.example.com",
      addressLine1: "14701 Charlson Rd",
      city: "Eden Prairie",
      state: "MN",
      zip: "55347",
      paymentTerms: "net_30",
      starRating: 4,
    })
    .returning();
  console.log(`  + broker: ${row.companyName} (MC#${row.mcNumber}, net_30)`);
}

async function ensureTruck(): Promise<void> {
  const existing = await db.query.trucks.findFirst({
    where: eq(trucks.vin, DEMO_TRUCK_VIN),
  });
  if (existing) {
    console.log(
      `  ✓ truck already exists: unit ${existing.unitNumber} (VIN ${existing.vin})`,
    );
    return;
  }

  // Generate realistic future expirations relative to today so the dashboard
  // doesn't render a "documents expiring" warning on day one.
  const today = new Date();
  const monthsOut = (m: number) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + m);
    return d.toISOString().slice(0, 10);
  };

  const [row] = await db
    .insert(trucks)
    .values({
      unitNumber: "101",
      vin: DEMO_TRUCK_VIN,
      make: "Freightliner",
      model: "Cascadia",
      year: 2022,
      licensePlate: "PTL-101",
      plateState: "TX",
      registrationExpiration: monthsOut(12),
      insuranceExpiration: monthsOut(8),
      annualInspectionExpiration: monthsOut(10),
      currentMileage: 245000,
      status: "active",
    })
    .returning();
  console.log(
    `  + truck: unit ${row.unitNumber} (${row.year} ${row.make} ${row.model}, VIN ${row.vin})`,
  );
}

async function ensureInvite(
  adminUserId: string,
): Promise<{ inviteUrl: string; token: string; reused: boolean }> {
  // Idempotency: a still-valid, unconsumed invite for this email counts.
  const existing = await db.query.invites.findFirst({
    where: and(
      eq(invites.email, DEMO_DRIVER_EMAIL),
      isNull(invites.acceptedAt),
    ),
  });
  if (existing) {
    const baseUrl = env.BETTER_AUTH_URL ?? "http://localhost:3000";
    console.log(
      `  ✓ invite already exists for ${DEMO_DRIVER_EMAIL} (token ${existing.token.slice(0, 8)}…)`,
    );
    return {
      inviteUrl: `${baseUrl}/accept-invite/${existing.token}`,
      token: existing.token,
      reused: true,
    };
  }

  const created = await inviteDriver({
    email: DEMO_DRIVER_EMAIL,
    invitedByUserId: adminUserId,
  });
  console.log(`  + invite: ${DEMO_DRIVER_EMAIL}`);
  return { ...created, reused: false };
}

async function main(): Promise<void> {
  console.log("Seeding demo data into Railway…\n");

  await ensureCompanySettings();
  const admin = await ensureAdmin();
  await ensureBroker();
  await ensureTruck();
  const invite = await ensureInvite(admin.id);

  console.log(`
✓ Demo seed complete.

Forward this invite URL to your first driver:
  ${invite.inviteUrl}

They click it, set a password (≥12 chars), and walk through onboarding.
`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Demo seed failed:", err);
    process.exit(1);
  });
