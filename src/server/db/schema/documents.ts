import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { driverProfiles } from "./drivers";
import { trucks } from "./trucks";
import { loads } from "./loads";
import { documentType } from "./_enums";

/**
 * Polymorphic document store. Exactly one of (driverProfileId, truckId, loadId)
 * is non-null — enforced via a CHECK constraint added in the init migration
 * (drizzle does not emit cross-column CHECKs from the schema).
 */
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: documentType("type").notNull(),

    // Storage. `blobKey` is the path returned by uploadDoc().
    blobKey: text("blob_key").notNull(),
    fileName: text("file_name").notNull(),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
    mimeType: text("mime_type").notNull(),

    uploadedByUserId: uuid("uploaded_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    driverProfileId: uuid("driver_profile_id").references(
      () => driverProfiles.id,
      { onDelete: "cascade" },
    ),
    truckId: uuid("truck_id").references(() => trucks.id, {
      onDelete: "cascade",
    }),
    loadId: uuid("load_id").references(() => loads.id, { onDelete: "cascade" }),

    // Only set on expirable types (driver_cdl, driver_medical, truck_*).
    expirationDate: date("expiration_date"),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("documents_driver_idx").on(t.driverProfileId),
    index("documents_truck_idx").on(t.truckId),
    index("documents_load_idx").on(t.loadId),
    index("documents_expiration_idx")
      .on(t.expirationDate)
      .where(sql`${t.expirationDate} IS NOT NULL`),
  ],
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
