import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import { documents, driverProfiles, trucks } from "@/server/db/schema";
import { adminOnly } from "@/server/auth/middleware";
import { ConflictError, NotFoundError } from "@/server/errors";
import { record as auditRecord } from "@/server/services/audit.service";

/**
 * Trucks — admin server functions. Brief §3.2 priority 1.
 *
 * Soft delete only (`deletedAt` timestamp). The list excludes deleted rows
 * by default; pass `includeDeleted` if a future restore-archive UI lands.
 */

const TruckStatusZ = z.enum(["active", "in_shop", "out_of_service"]);

const PaginationZ = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  cursor: z.string().nullable().default(null),
});

const ListTrucksInput = PaginationZ.extend({
  status: TruckStatusZ.optional(),
});

export const listTrucks = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => ListTrucksInput.parse(data))
  .handler(async ({ data }) => {
    const conditions = [isNull(trucks.deletedAt)];
    if (data.status) conditions.push(eq(trucks.status, data.status));
    if (data.cursor) {
      conditions.push(sql`${trucks.createdAt} < ${new Date(data.cursor)}`);
    }

    const rows = await db
      .select({
        id: trucks.id,
        unitNumber: trucks.unitNumber,
        vin: trucks.vin,
        make: trucks.make,
        model: trucks.model,
        year: trucks.year,
        licensePlate: trucks.licensePlate,
        plateState: trucks.plateState,
        registrationExpiration: trucks.registrationExpiration,
        insuranceExpiration: trucks.insuranceExpiration,
        annualInspectionExpiration: trucks.annualInspectionExpiration,
        currentMileage: trucks.currentMileage,
        status: trucks.status,
        assignedDriverId: trucks.assignedDriverId,
        driverFirstName: driverProfiles.firstName,
        driverLastName: driverProfiles.lastName,
        notes: trucks.notes,
        createdAt: trucks.createdAt,
        updatedAt: trucks.updatedAt,
      })
      .from(trucks)
      .leftJoin(driverProfiles, eq(driverProfiles.id, trucks.assignedDriverId))
      .where(and(...conditions))
      .orderBy(desc(trucks.createdAt))
      .limit(data.limit + 1);

    const page = rows.slice(0, data.limit);
    const lastRow = page[page.length - 1];
    const nextCursor =
      rows.length > data.limit && lastRow ? lastRow.createdAt.toISOString() : null;

    return {
      trucks: page.map((r) => ({
        id: r.id,
        unitNumber: r.unitNumber,
        vin: r.vin,
        make: r.make,
        model: r.model,
        year: r.year,
        licensePlate: r.licensePlate,
        plateState: r.plateState,
        registrationExpiration: r.registrationExpiration,
        insuranceExpiration: r.insuranceExpiration,
        annualInspectionExpiration: r.annualInspectionExpiration,
        currentMileage: r.currentMileage,
        status: r.status,
        assignedDriver:
          r.assignedDriverId &&
          (r.driverFirstName || r.driverLastName)
            ? {
                id: r.assignedDriverId,
                firstName: r.driverFirstName ?? "",
                lastName: r.driverLastName ?? "",
              }
            : null,
        notes: r.notes,
        updatedAt: r.updatedAt.toISOString(),
      })),
      nextCursor,
    };
  });

const GetTruckInput = z.object({ truckId: z.string().uuid() });

export const getTruck = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => GetTruckInput.parse(data))
  .handler(async ({ data }) => {
    const truck = await db.query.trucks.findFirst({
      where: eq(trucks.id, data.truckId),
    });
    if (!truck || truck.deletedAt) throw new NotFoundError("Truck");

    const assignedDriver = truck.assignedDriverId
      ? await db.query.driverProfiles.findFirst({
          where: eq(driverProfiles.id, truck.assignedDriverId),
        })
      : null;

    const docs = await db.query.documents.findMany({
      where: eq(documents.truckId, truck.id),
      orderBy: [desc(documents.createdAt)],
    });

    return { truck, assignedDriver, documents: docs };
  });

const CreateTruckInput = z.object({
  unitNumber: z.string().min(1),
  vin: z.string().min(11).max(17),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1980).max(2100),
  licensePlate: z.string().min(1),
  plateState: z.string().length(2),
  registrationExpiration: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  insuranceExpiration: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  annualInspectionExpiration: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currentMileage: z.number().int().min(0),
  status: TruckStatusZ.default("active"),
  notes: z.string().nullable().optional(),
});

export const createTruck = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => CreateTruckInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      // Pre-check unique constraints to surface a friendlier error than the
      // raw Postgres unique-violation. The DB still has the unique indexes
      // as a backstop.
      const conflict = await tx
        .select({ unit: trucks.unitNumber, vin: trucks.vin })
        .from(trucks)
        .where(
          and(
            isNull(trucks.deletedAt),
            sql`(${trucks.unitNumber} = ${data.unitNumber} OR ${trucks.vin} = ${data.vin})`,
          ),
        )
        .limit(1);
      const conflictRow = conflict[0];
      if (conflictRow) {
        throw new ConflictError(
          conflictRow.unit === data.unitNumber
            ? `Truck unit ${data.unitNumber} already exists`
            : `VIN ${data.vin} is already on file`,
        );
      }

      const [created] = await tx
        .insert(trucks)
        .values({ ...data, notes: data.notes ?? null })
        .returning();
      if (!created) {
        throw new Error("Failed to insert truck");
      }

      await auditRecord(
        {
          userId: context.user.id,
          action: "truck.created",
          entityType: "truck",
          entityId: created.id,
          changes: { unitNumber: created.unitNumber },
        },
        tx,
      );
      return { truck: created };
    });
  });

const UpdateTruckInput = z.object({
  truckId: z.string().uuid(),
  patch: CreateTruckInput.partial().refine(
    (p) => Object.keys(p).length > 0,
    { message: "Patch must contain at least one field" },
  ),
});

export const updateTruck = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => UpdateTruckInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      const truck = await tx.query.trucks.findFirst({
        where: eq(trucks.id, data.truckId),
      });
      if (!truck || truck.deletedAt) throw new NotFoundError("Truck");

      const [updated] = await tx
        .update(trucks)
        .set({ ...data.patch, updatedAt: new Date() })
        .where(eq(trucks.id, truck.id))
        .returning();

      await auditRecord(
        {
          userId: context.user.id,
          action: "truck.updated",
          entityType: "truck",
          entityId: truck.id,
          changes: data.patch as Record<string, unknown>,
        },
        tx,
      );
      return { truck: updated };
    });
  });

const DeleteTruckInput = z.object({ truckId: z.string().uuid() });

export const deleteTruck = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => DeleteTruckInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      const truck = await tx.query.trucks.findFirst({
        where: eq(trucks.id, data.truckId),
      });
      if (!truck || truck.deletedAt) throw new NotFoundError("Truck");

      const now = new Date();
      await tx
        .update(trucks)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(trucks.id, truck.id));

      await auditRecord(
        {
          userId: context.user.id,
          action: "truck.deleted",
          entityType: "truck",
          entityId: truck.id,
        },
        tx,
      );
      return { ok: true as const };
    });
  });

const AssignTruckInput = z.object({
  truckId: z.string().uuid(),
  driverId: z.string().uuid().nullable(),
});

export const assignTruckToDriver = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => AssignTruckInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      const truck = await tx.query.trucks.findFirst({
        where: eq(trucks.id, data.truckId),
      });
      if (!truck || truck.deletedAt) throw new NotFoundError("Truck");

      if (data.driverId) {
        const driver = await tx.query.driverProfiles.findFirst({
          where: eq(driverProfiles.id, data.driverId),
        });
        if (!driver || driver.deletedAt) throw new NotFoundError("Driver");
      }

      const now = new Date();
      await tx
        .update(trucks)
        .set({ assignedDriverId: data.driverId, updatedAt: now })
        .where(eq(trucks.id, truck.id));

      // Mirror on driver_profiles to keep the bidirectional pointer in sync.
      // First, clear any previous assignment to this truck on other drivers.
      if (data.driverId) {
        await tx
          .update(driverProfiles)
          .set({ assignedTruckId: null, updatedAt: now })
          .where(eq(driverProfiles.assignedTruckId, truck.id));
        await tx
          .update(driverProfiles)
          .set({ assignedTruckId: truck.id, updatedAt: now })
          .where(eq(driverProfiles.id, data.driverId));
      } else {
        await tx
          .update(driverProfiles)
          .set({ assignedTruckId: null, updatedAt: now })
          .where(eq(driverProfiles.assignedTruckId, truck.id));
      }

      await auditRecord(
        {
          userId: context.user.id,
          action: data.driverId ? "truck.assigned" : "truck.unassigned",
          entityType: "truck",
          entityId: truck.id,
          changes: { driverId: data.driverId },
        },
        tx,
      );
      return { ok: true as const };
    });
  });
