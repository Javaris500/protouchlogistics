import {
  AnyPgColumn,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { driverProfiles } from "./drivers";
import { truckStatus } from "./_enums";

export const trucks = pgTable(
  "trucks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    unitNumber: text("unit_number").notNull(),
    vin: text("vin").notNull(),
    make: text("make").notNull(),
    model: text("model").notNull(),
    year: integer("year").notNull(),
    licensePlate: text("license_plate").notNull(),
    plateState: varchar("plate_state", { length: 2 }).notNull(),
    registrationExpiration: date("registration_expiration").notNull(),
    insuranceExpiration: date("insurance_expiration").notNull(),
    annualInspectionExpiration: date("annual_inspection_expiration").notNull(),
    currentMileage: integer("current_mileage").notNull(),
    status: truckStatus("status").notNull(),
    assignedDriverId: uuid("assigned_driver_id").references(
      (): AnyPgColumn => driverProfiles.id,
      { onDelete: "set null" },
    ),
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
    uniqueIndex("trucks_unit_number_key").on(t.unitNumber),
    uniqueIndex("trucks_vin_key").on(t.vin),
    index("trucks_status_idx").on(t.status),
  ],
);

export type Truck = typeof trucks.$inferSelect;
export type NewTruck = typeof trucks.$inferInsert;
