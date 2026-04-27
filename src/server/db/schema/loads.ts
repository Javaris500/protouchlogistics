import { sql } from "drizzle-orm";
import {
  decimal,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { driverProfiles } from "./drivers";
import { trucks } from "./trucks";
import { brokers } from "./brokers";
import { loadStatus, stopType } from "./_enums";

/**
 * Pay model: per-load `driverPayCents` (contract lock §1). The previous
 * `payModel`/`payRate` per-driver scheme is removed; Gary sets each load's
 * driver pay explicitly. `driverPayUpdatedAt` lets us audit edits without
 * digging through `audit_log`.
 *
 * Money rule: integer cents. `bigint` would be overkill — int4 caps at
 * ~$21.4M per load, far above any realistic single load.
 */
export const loads = pgTable(
  "loads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    loadNumber: text("load_number").notNull(),

    brokerId: uuid("broker_id")
      .notNull()
      .references(() => brokers.id, { onDelete: "restrict" }),
    assignedDriverId: uuid("assigned_driver_id").references(
      () => driverProfiles.id,
      { onDelete: "set null" },
    ),
    assignedTruckId: uuid("assigned_truck_id").references(() => trucks.id, {
      onDelete: "set null",
    }),

    status: loadStatus("status").notNull(),
    rate: integer("rate").notNull(),
    miles: integer("miles"),

    /**
     * What Gary pays the driver for this load, in cents. Null until set.
     * Required (NOT NULL via service-layer gate, not DB constraint, so
     * draft loads can exist) before transitioning to `completed`.
     */
    driverPayCents: integer("driver_pay_cents"),
    driverPayUpdatedAt: timestamp("driver_pay_updated_at", {
      withTimezone: true,
    }),

    commodity: text("commodity").notNull(),
    weight: integer("weight"),
    pieces: integer("pieces"),
    specialInstructions: text("special_instructions"),
    referenceNumber: text("reference_number"),
    bolNumber: text("bol_number"),

    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("loads_load_number_key").on(t.loadNumber),
    index("loads_assigned_driver_status_idx").on(t.assignedDriverId, t.status),
    index("loads_status_created_idx").on(t.status, t.createdAt),
    index("loads_broker_idx").on(t.brokerId),
  ],
);

export const loadStops = pgTable(
  "load_stops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    loadId: uuid("load_id")
      .notNull()
      .references(() => loads.id, { onDelete: "cascade" }),
    sequence: smallint("sequence").notNull(),
    stopType: stopType("stop_type").notNull(),

    companyName: text("company_name"),
    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    city: text("city").notNull(),
    state: varchar("state", { length: 2 }).notNull(),
    zip: text("zip").notNull(),

    lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
    lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),

    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
    arrivedAt: timestamp("arrived_at", { withTimezone: true }),
    departedAt: timestamp("departed_at", { withTimezone: true }),

    contactName: text("contact_name"),
    contactPhone: text("contact_phone"),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("load_stops_load_sequence_key").on(t.loadId, t.sequence),
  ],
);

/**
 * Immutable status-change log. Append-only.
 */
export const loadStatusHistory = pgTable(
  "load_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    loadId: uuid("load_id")
      .notNull()
      .references(() => loads.id, { onDelete: "cascade" }),
    fromStatus: loadStatus("from_status"),
    toStatus: loadStatus("to_status").notNull(),
    changedByUserId: uuid("changed_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reason: text("reason"),
    locationLat: decimal("location_lat", { precision: 10, scale: 7 }),
    locationLng: decimal("location_lng", { precision: 10, scale: 7 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("load_status_history_load_idx").on(t.loadId, sql`${t.changedAt} DESC`),
  ],
);

export type Load = typeof loads.$inferSelect;
export type NewLoad = typeof loads.$inferInsert;
export type LoadStop = typeof loadStops.$inferSelect;
export type LoadStatusHistoryEntry = typeof loadStatusHistory.$inferSelect;
