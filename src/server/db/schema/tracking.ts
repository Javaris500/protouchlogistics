import { sql } from "drizzle-orm";
import {
  bigserial,
  decimal,
  index,
  pgTable,
  real,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { driverProfiles } from "./drivers";
import { loads } from "./loads";

/**
 * High-volume append-only breadcrumb table. Posting cadence is 45s or 200m of
 * movement, whichever first. Idempotency on (driver, load, recordedAt) so
 * client retries (spotty cellular) don't double-write.
 *
 * Phase 1: keep everything for ~1 year. `cleanup-driver-locations.ts` ships
 * as a no-op stub so Phase 2 can flip retention without a deploy.
 */
export const driverLocations = pgTable(
  "driver_locations",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    driverProfileId: uuid("driver_profile_id")
      .notNull()
      .references(() => driverProfiles.id, { onDelete: "cascade" }),
    loadId: uuid("load_id").references(() => loads.id, { onDelete: "set null" }),
    lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
    lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
    accuracyMeters: real("accuracy_meters"),
    headingDegrees: real("heading_degrees"),
    speedMps: real("speed_mps"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("driver_locations_driver_recorded_idx").on(
      t.driverProfileId,
      sql`${t.recordedAt} DESC`,
    ),
    index("driver_locations_load_recorded_idx").on(t.loadId, t.recordedAt),
    // BRIN scales naturally with append-only time-series.
    index("driver_locations_recorded_brin_idx")
      .using("brin", t.recordedAt)
      .with({ pages_per_range: 32 }),
    uniqueIndex("driver_locations_idem_key").on(
      t.driverProfileId,
      t.loadId,
      t.recordedAt,
    ),
  ],
);

export type DriverLocation = typeof driverLocations.$inferSelect;
export type NewDriverLocation = typeof driverLocations.$inferInsert;
