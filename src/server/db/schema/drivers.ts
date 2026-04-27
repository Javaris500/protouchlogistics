import { sql } from "drizzle-orm";
import {
  AnyPgColumn,
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { trucks } from "./trucks";
import { cdlClass } from "./_enums";

/**
 * One-to-one with `users` where role=driver. Pay configuration is intentionally
 * absent — pay is set per-load via `loads.driverPayCents` (see contract lock §1
 * and 12-CONTRACTS-LOCK.md). Phase 1 does not have a per-driver default rate.
 */
export const driverProfiles = pgTable(
  "driver_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    dob: date("dob").notNull(),
    phone: text("phone").notNull(),

    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    city: text("city").notNull(),
    state: varchar("state", { length: 2 }).notNull(),
    zip: text("zip").notNull(),

    emergencyContactName: text("emergency_contact_name").notNull(),
    emergencyContactPhone: text("emergency_contact_phone").notNull(),
    emergencyContactRelation: text("emergency_contact_relation").notNull(),

    cdlNumber: text("cdl_number").notNull(),
    cdlClass: cdlClass("cdl_class").notNull(),
    cdlState: varchar("cdl_state", { length: 2 }).notNull(),
    cdlExpiration: date("cdl_expiration").notNull(),
    medicalCardExpiration: date("medical_card_expiration").notNull(),

    hireDate: date("hire_date").notNull(),
    assignedTruckId: uuid("assigned_truck_id").references(
      (): AnyPgColumn => trucks.id,
      { onDelete: "set null" },
    ),
    notes: text("notes"),

    /**
     * Current parent step: "welcome" | "about" | "contact" | "cdl" |
     * "medical" | "review" | "complete". Sub-screens within cdl/medical
     * are tracked client-side via the `?sub=` URL param.
     */
    onboardingState: text("onboarding_state"),
    onboardingStartedAt: timestamp("onboarding_started_at", {
      withTimezone: true,
    }),
    onboardingCompletedAt: timestamp("onboarding_completed_at", {
      withTimezone: true,
    }),
    voiceConsentAt: timestamp("voice_consent_at", { withTimezone: true }),

    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("driver_profiles_user_id_key").on(t.userId),
    index("driver_profiles_cdl_expiration_idx").on(t.cdlExpiration),
    index("driver_profiles_medical_expiration_idx").on(t.medicalCardExpiration),
  ],
);

export type DriverProfile = typeof driverProfiles.$inferSelect;
export type NewDriverProfile = typeof driverProfiles.$inferInsert;

/**
 * Server-backed onboarding draft. Holds partial state while an invited user
 * walks through `/onboarding/*` so they can resume on any device. Replaces
 * the previous sessionStorage-only draft in `OnboardingProvider`.
 *
 * Lives one-to-one with `users` (not `driver_profiles`) because the row only
 * exists *before* a profile does. On final submit, `submitOnboardingProfileFn`
 * reads the draft, creates the `driver_profiles` row + any pending `documents`
 * rows, then deletes the draft.
 */
export const onboardingDrafts = pgTable("onboarding_drafts", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type OnboardingDraft = typeof onboardingDrafts.$inferSelect;
export type NewOnboardingDraft = typeof onboardingDrafts.$inferInsert;
