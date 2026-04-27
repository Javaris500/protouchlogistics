import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { citext } from "./_types";
import { paymentTerms } from "./_enums";

export const brokers = pgTable(
  "brokers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyName: text("company_name").notNull(),
    mcNumber: text("mc_number"),
    dotNumber: text("dot_number"),

    contactName: text("contact_name").notNull(),
    contactPhone: text("contact_phone").notNull(),
    contactEmail: citext("contact_email").notNull(),
    billingEmail: citext("billing_email"),

    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    city: text("city").notNull(),
    state: varchar("state", { length: 2 }).notNull(),
    zip: text("zip").notNull(),

    paymentTerms: paymentTerms("payment_terms").notNull(),
    paymentTermsOther: text("payment_terms_other"),
    creditRating: text("credit_rating"),
    starRating: smallint("star_rating").notNull().default(0),
    notes: text("notes"),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Partial unique on mc_number ignoring soft-deleted rows. Two admins (or
    // an admin + the rate-con ingest) racing on the same MC# get a clean
    // conflict instead of a duplicate.
    uniqueIndex("brokers_mc_unique")
      .on(t.mcNumber)
      .where(sql`${t.mcNumber} IS NOT NULL AND ${t.deletedAt} IS NULL`),
    index("brokers_company_name_idx").on(t.companyName),
  ],
);

export type Broker = typeof brokers.$inferSelect;
export type NewBroker = typeof brokers.$inferInsert;
