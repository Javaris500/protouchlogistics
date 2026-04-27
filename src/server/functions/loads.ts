import { createServerFn } from "@tanstack/react-start";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import {
  brokers,
  documents,
  driverProfiles,
  loadStatusHistory,
  loadStops,
  loads,
  notifications,
  trucks,
} from "@/server/db/schema";
import { adminOnly } from "@/server/auth/middleware";
import {
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
} from "@/server/errors";
import { record as auditRecord } from "@/server/services/audit.service";

/**
 * Loads — admin server functions. Brief §3.2 priority 3 + §3.4.
 *
 * Server-side rule mirrors per 05-TECH-CONTRACTS §9.5 + 12-CONTRACTS-LOCK §1.x:
 *
 *   1. Completion gate. `updateLoadStatus → 'completed'` throws
 *      BusinessRuleError when `loads.driverPayCents IS NULL`.
 *   2. Pay locked after close. `updateLoadDriverPay` throws ForbiddenError
 *      when `load.status === 'completed'`.
 *   3. Pay-changed notification. On any change to `driverPayCents`, stamp
 *      `driverPayUpdatedAt = now()` and fire a `pay_changed` notification
 *      to the assigned driver (no-op when unassigned).
 */

const LOAD_STATUSES = [
  "draft",
  "assigned",
  "accepted",
  "en_route_pickup",
  "at_pickup",
  "loaded",
  "en_route_delivery",
  "at_delivery",
  "delivered",
  "pod_uploaded",
  "completed",
  "cancelled",
] as const;
const LoadStatusZ = z.enum(LOAD_STATUSES);
type LoadStatusValue = (typeof LOAD_STATUSES)[number];

const PaginationZ = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  cursor: z.string().nullable().default(null),
});

const ListLoadsInput = PaginationZ.extend({
  status: LoadStatusZ.optional(),
  brokerId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  truckId: z.string().uuid().optional(),
});

export const listLoadsAdmin = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => ListLoadsInput.parse(data ?? {}))
  .handler(async ({ data }) => {
    const conditions = [isNull(loads.deletedAt)];
    if (data.status) conditions.push(eq(loads.status, data.status));
    if (data.brokerId) conditions.push(eq(loads.brokerId, data.brokerId));
    if (data.driverId)
      conditions.push(eq(loads.assignedDriverId, data.driverId));
    if (data.truckId) conditions.push(eq(loads.assignedTruckId, data.truckId));
    if (data.cursor) {
      conditions.push(sql`${loads.createdAt} < ${new Date(data.cursor)}`);
    }

    const rows = await db
      .select({
        id: loads.id,
        loadNumber: loads.loadNumber,
        status: loads.status,
        rate: loads.rate,
        miles: loads.miles,
        commodity: loads.commodity,
        referenceNumber: loads.referenceNumber,
        driverPayCents: loads.driverPayCents,
        driverPayUpdatedAt: loads.driverPayUpdatedAt,
        createdAt: loads.createdAt,
        updatedAt: loads.updatedAt,
        brokerId: loads.brokerId,
        brokerCompany: brokers.companyName,
        assignedDriverId: loads.assignedDriverId,
        driverFirstName: driverProfiles.firstName,
        driverLastName: driverProfiles.lastName,
        assignedTruckId: loads.assignedTruckId,
        truckUnitNumber: trucks.unitNumber,
      })
      .from(loads)
      .leftJoin(brokers, eq(brokers.id, loads.brokerId))
      .leftJoin(
        driverProfiles,
        eq(driverProfiles.id, loads.assignedDriverId),
      )
      .leftJoin(trucks, eq(trucks.id, loads.assignedTruckId))
      .where(and(...conditions))
      .orderBy(desc(loads.createdAt))
      .limit(data.limit + 1);

    const page = rows.slice(0, data.limit);
    const lastRow = page[page.length - 1];
    const nextCursor =
      rows.length > data.limit && lastRow ? lastRow.createdAt.toISOString() : null;

    const ids = page.map((r) => r.id);
    const stopRows = ids.length
      ? await db
          .select()
          .from(loadStops)
          .where(inArray(loadStops.loadId, ids))
          .orderBy(asc(loadStops.sequence))
      : [];
    const stopsByLoad = new Map<string, typeof stopRows>();
    for (const s of stopRows) {
      const existing = stopsByLoad.get(s.loadId) ?? [];
      existing.push(s);
      stopsByLoad.set(s.loadId, existing);
    }

    return {
      loads: page.map((r) => {
        const ls = stopsByLoad.get(r.id) ?? [];
        const pickup = ls.find((s) => s.stopType === "pickup") ?? null;
        const delivery =
          [...ls].reverse().find((s) => s.stopType === "delivery") ?? null;
        return {
          id: r.id,
          loadNumber: r.loadNumber,
          status: r.status,
          rateCents: r.rate,
          miles: r.miles,
          commodity: r.commodity,
          referenceNumber: r.referenceNumber,
          driverPayCents: r.driverPayCents,
          driverPayUpdatedAt: r.driverPayUpdatedAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          broker: { id: r.brokerId, companyName: r.brokerCompany ?? "" },
          driver:
            r.assignedDriverId &&
            (r.driverFirstName || r.driverLastName)
              ? {
                  id: r.assignedDriverId,
                  firstName: r.driverFirstName ?? "",
                  lastName: r.driverLastName ?? "",
                }
              : null,
          truck:
            r.assignedTruckId && r.truckUnitNumber
              ? { id: r.assignedTruckId, unitNumber: r.truckUnitNumber }
              : null,
          pickup: pickup
            ? {
                city: pickup.city,
                state: pickup.state,
                windowStart: pickup.windowStart.toISOString(),
                windowEnd: pickup.windowEnd.toISOString(),
              }
            : null,
          delivery: delivery
            ? {
                city: delivery.city,
                state: delivery.state,
                windowStart: delivery.windowStart.toISOString(),
                windowEnd: delivery.windowEnd.toISOString(),
              }
            : null,
        };
      }),
      nextCursor,
    };
  });

const GetLoadInput = z.object({ loadId: z.string().uuid() });

export const getLoadAdmin = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => GetLoadInput.parse(data))
  .handler(async ({ data }) => {
    const load = await db.query.loads.findFirst({
      where: eq(loads.id, data.loadId),
    });
    if (!load || load.deletedAt) throw new NotFoundError("Load");

    const broker = await db.query.brokers.findFirst({
      where: eq(brokers.id, load.brokerId),
    });
    const driver = load.assignedDriverId
      ? await db.query.driverProfiles.findFirst({
          where: eq(driverProfiles.id, load.assignedDriverId),
        })
      : null;
    const truck = load.assignedTruckId
      ? await db.query.trucks.findFirst({
          where: eq(trucks.id, load.assignedTruckId),
        })
      : null;

    const stops = await db
      .select()
      .from(loadStops)
      .where(eq(loadStops.loadId, load.id))
      .orderBy(asc(loadStops.sequence));

    const history = await db
      .select()
      .from(loadStatusHistory)
      .where(eq(loadStatusHistory.loadId, load.id))
      .orderBy(desc(loadStatusHistory.changedAt));

    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.loadId, load.id))
      .orderBy(desc(documents.createdAt));

    return {
      load: {
        ...load,
        rateCents: load.rate,
        driverPayUpdatedAt: load.driverPayUpdatedAt?.toISOString() ?? null,
        createdAt: load.createdAt.toISOString(),
        updatedAt: load.updatedAt.toISOString(),
        deletedAt: null,
      },
      broker,
      driver,
      truck,
      stops: stops.map((s) => ({
        ...s,
        windowStart: s.windowStart.toISOString(),
        windowEnd: s.windowEnd.toISOString(),
        arrivedAt: s.arrivedAt?.toISOString() ?? null,
        departedAt: s.departedAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      history: history.map((h) => ({
        ...h,
        changedAt: h.changedAt.toISOString(),
        createdAt: h.createdAt.toISOString(),
      })),
      documents: docs.map((d) => ({
        ...d,
        expirationDate: d.expirationDate ?? null,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
    };
  });

const StopInputZ = z.object({
  stopType: z.enum(["pickup", "delivery"]),
  sequence: z.number().int().min(0),
  companyName: z.string().nullable().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().nullable().optional(),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().min(3),
  lat: z.number(),
  lng: z.number(),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  contactName: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const CreateLoadInput = z.object({
  loadNumber: z.string().min(1),
  brokerId: z.string().uuid(),
  assignedDriverId: z.string().uuid().nullable().optional(),
  assignedTruckId: z.string().uuid().nullable().optional(),
  status: LoadStatusZ.default("draft"),
  rateCents: z.number().int().min(0),
  miles: z.number().int().min(0).nullable().optional(),
  commodity: z.string().min(1),
  weight: z.number().int().min(0).nullable().optional(),
  pieces: z.number().int().min(0).nullable().optional(),
  specialInstructions: z.string().nullable().optional(),
  referenceNumber: z.string().nullable().optional(),
  bolNumber: z.string().nullable().optional(),
  driverPayCents: z.number().int().min(0).nullable().optional(),
  stops: z.array(StopInputZ).min(2),
});

export const createLoad = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => CreateLoadInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      const [created] = await tx
        .insert(loads)
        .values({
          loadNumber: data.loadNumber,
          brokerId: data.brokerId,
          assignedDriverId: data.assignedDriverId ?? null,
          assignedTruckId: data.assignedTruckId ?? null,
          status: data.status,
          rate: data.rateCents,
          miles: data.miles ?? null,
          commodity: data.commodity,
          weight: data.weight ?? null,
          pieces: data.pieces ?? null,
          specialInstructions: data.specialInstructions ?? null,
          referenceNumber: data.referenceNumber ?? null,
          bolNumber: data.bolNumber ?? null,
          driverPayCents: data.driverPayCents ?? null,
          driverPayUpdatedAt: data.driverPayCents != null ? new Date() : null,
          createdByUserId: context.user.id,
        })
        .returning();
      if (!created) throw new Error("Failed to insert load");

      await tx.insert(loadStops).values(
        data.stops.map((s) => ({
          loadId: created.id,
          stopType: s.stopType,
          sequence: s.sequence,
          companyName: s.companyName ?? null,
          addressLine1: s.addressLine1,
          addressLine2: s.addressLine2 ?? null,
          city: s.city,
          state: s.state,
          zip: s.zip,
          lat: s.lat.toString(),
          lng: s.lng.toString(),
          windowStart: new Date(s.windowStart),
          windowEnd: new Date(s.windowEnd),
          contactName: s.contactName ?? null,
          contactPhone: s.contactPhone ?? null,
          notes: s.notes ?? null,
        })),
      );

      await auditRecord(
        {
          userId: context.user.id,
          action: "load.created",
          entityType: "load",
          entityId: created.id,
          changes: { loadNumber: created.loadNumber, status: created.status },
        },
        tx,
      );

      return {
        load: {
          ...created,
          rateCents: created.rate,
          driverPayUpdatedAt: created.driverPayUpdatedAt?.toISOString() ?? null,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
          deletedAt: created.deletedAt ? created.deletedAt.toISOString() : null,
        },
      };
    });
  });

const UpdateLoadInput = z.object({
  loadId: z.string().uuid(),
  patch: z
    .object({
      loadNumber: z.string().min(1).optional(),
      brokerId: z.string().uuid().optional(),
      assignedDriverId: z.string().uuid().nullable().optional(),
      assignedTruckId: z.string().uuid().nullable().optional(),
      rateCents: z.number().int().min(0).optional(),
      miles: z.number().int().min(0).nullable().optional(),
      commodity: z.string().min(1).optional(),
      weight: z.number().int().min(0).nullable().optional(),
      pieces: z.number().int().min(0).nullable().optional(),
      specialInstructions: z.string().nullable().optional(),
      referenceNumber: z.string().nullable().optional(),
      bolNumber: z.string().nullable().optional(),
    })
    .refine((p) => Object.keys(p).length > 0, {
      message: "Patch must contain at least one field",
    }),
});

export const updateLoad = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => UpdateLoadInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      const load = await tx.query.loads.findFirst({
        where: eq(loads.id, data.loadId),
      });
      if (!load || load.deletedAt) throw new NotFoundError("Load");

      const { rateCents, ...rest } = data.patch;
      await tx
        .update(loads)
        .set({
          ...rest,
          ...(rateCents !== undefined ? { rate: rateCents } : {}),
          updatedAt: new Date(),
        })
        .where(eq(loads.id, load.id));

      await auditRecord(
        {
          userId: context.user.id,
          action: "load.updated",
          entityType: "load",
          entityId: load.id,
          changes: data.patch as Record<string, unknown>,
        },
        tx,
      );

      return { ok: true as const };
    });
  });

/**
 * §3.4 Rule 2 + Rule 3 live here.
 */
const UpdateLoadDriverPayInput = z.object({
  loadId: z.string().uuid(),
  driverPayCents: z.number().int().min(0).nullable(),
});

export const updateLoadDriverPay = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => UpdateLoadDriverPayInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      const load = await tx.query.loads.findFirst({
        where: eq(loads.id, data.loadId),
      });
      if (!load || load.deletedAt) throw new NotFoundError("Load");

      // Rule 2: pay is locked after completion.
      if (load.status === "completed") {
        throw new ForbiddenError(
          "Pay is locked after a load is completed",
        );
      }

      // No-op when value didn't change.
      if (load.driverPayCents === data.driverPayCents) {
        return {
          ok: true as const,
          driverPayCents: load.driverPayCents,
          driverPayUpdatedAt: load.driverPayUpdatedAt?.toISOString() ?? null,
        };
      }

      const now = new Date();
      const [updated] = await tx
        .update(loads)
        .set({
          driverPayCents: data.driverPayCents,
          driverPayUpdatedAt: now,
          updatedAt: now,
        })
        .where(eq(loads.id, load.id))
        .returning();
      if (!updated) throw new Error("Failed to update pay");

      // Rule 3: pay_changed notification → assigned driver.
      if (load.assignedDriverId) {
        const driver = await tx.query.driverProfiles.findFirst({
          where: eq(driverProfiles.id, load.assignedDriverId),
          columns: { userId: true },
        });
        if (driver) {
          await tx.insert(notifications).values({
            userId: driver.userId,
            type: "pay_changed",
            title: `Pay updated on ${load.loadNumber}`,
            body: formatPayChangeBody(
              load.driverPayCents,
              data.driverPayCents,
            ),
            linkUrl: `/driver/loads/${load.id}`,
            metadata: {
              loadId: load.id,
              priorCents: load.driverPayCents,
              nextCents: data.driverPayCents,
            },
          });
        }
      }

      await auditRecord(
        {
          userId: context.user.id,
          action: "load.pay_updated",
          entityType: "load",
          entityId: load.id,
          changes: {
            priorCents: load.driverPayCents,
            nextCents: data.driverPayCents,
          },
        },
        tx,
      );

      return {
        ok: true as const,
        driverPayCents: updated.driverPayCents,
        driverPayUpdatedAt: updated.driverPayUpdatedAt?.toISOString() ?? null,
      };
    });
  });

const AssignLoadInput = z.object({
  loadId: z.string().uuid(),
  driverId: z.string().uuid(),
  truckId: z.string().uuid().nullable().optional(),
});

export const assignLoad = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => AssignLoadInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      const load = await tx.query.loads.findFirst({
        where: eq(loads.id, data.loadId),
      });
      if (!load || load.deletedAt) throw new NotFoundError("Load");
      if (load.status !== "draft" && load.status !== "assigned") {
        throw new BusinessRuleError(
          "Only draft or assigned loads can be reassigned",
          { currentStatus: load.status },
        );
      }

      // 12-CONTRACTS-LOCK §1.x compliance gate: assigning requires the
      // driver's CDL + medical card to be valid in the future.
      const driver = await tx.query.driverProfiles.findFirst({
        where: eq(driverProfiles.id, data.driverId),
      });
      if (!driver || driver.deletedAt) throw new NotFoundError("Driver");

      const today = new Date().toISOString().slice(0, 10);
      if (driver.cdlExpiration < today) {
        throw new BusinessRuleError(
          "Driver's CDL is expired and cannot accept loads",
          { cdlExpiration: driver.cdlExpiration },
        );
      }
      if (driver.medicalCardExpiration < today) {
        throw new BusinessRuleError(
          "Driver's medical card is expired and cannot accept loads",
          { medicalCardExpiration: driver.medicalCardExpiration },
        );
      }

      if (data.truckId) {
        const truck = await tx.query.trucks.findFirst({
          where: eq(trucks.id, data.truckId),
        });
        if (!truck || truck.deletedAt) throw new NotFoundError("Truck");
      }

      const now = new Date();
      const fromStatus = load.status;
      const toStatus: LoadStatusValue = "assigned";

      await tx
        .update(loads)
        .set({
          assignedDriverId: data.driverId,
          assignedTruckId: data.truckId ?? load.assignedTruckId,
          status: toStatus,
          updatedAt: now,
        })
        .where(eq(loads.id, load.id));

      await tx.insert(loadStatusHistory).values({
        loadId: load.id,
        fromStatus,
        toStatus,
        changedByUserId: context.user.id,
      });

      await auditRecord(
        {
          userId: context.user.id,
          action: "load.assigned",
          entityType: "load",
          entityId: load.id,
          changes: { driverId: data.driverId, truckId: data.truckId ?? null },
        },
        tx,
      );

      return { ok: true as const };
    });
  });

const UnassignLoadInput = z.object({
  loadId: z.string().uuid(),
  reason: z.string().min(1),
});

export const unassignLoad = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => UnassignLoadInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      const load = await tx.query.loads.findFirst({
        where: eq(loads.id, data.loadId),
      });
      if (!load || load.deletedAt) throw new NotFoundError("Load");
      if (!load.assignedDriverId) {
        throw new BusinessRuleError("Load is not assigned to a driver");
      }

      const now = new Date();
      const fromStatus = load.status;
      const toStatus: LoadStatusValue = "draft";

      await tx
        .update(loads)
        .set({
          assignedDriverId: null,
          status: toStatus,
          updatedAt: now,
        })
        .where(eq(loads.id, load.id));

      await tx.insert(loadStatusHistory).values({
        loadId: load.id,
        fromStatus,
        toStatus,
        changedByUserId: context.user.id,
        reason: data.reason,
      });

      await auditRecord(
        {
          userId: context.user.id,
          action: "load.unassigned",
          entityType: "load",
          entityId: load.id,
          changes: { reason: data.reason },
        },
        tx,
      );

      return { ok: true as const };
    });
  });

/**
 * §3.4 Rule 1 lives here.
 */
const UpdateLoadStatusInput = z.object({
  loadId: z.string().uuid(),
  toStatus: LoadStatusZ,
  reason: z.string().nullable().optional(),
});

export const updateLoadStatus = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => UpdateLoadStatusInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      const load = await tx.query.loads.findFirst({
        where: eq(loads.id, data.loadId),
      });
      if (!load || load.deletedAt) throw new NotFoundError("Load");

      // Rule 1: completion gate — driverPayCents must be set.
      if (data.toStatus === "completed" && load.driverPayCents == null) {
        throw new BusinessRuleError("Driver pay required before close", {
          loadId: load.id,
        });
      }

      const now = new Date();
      const fromStatus = load.status;

      await tx
        .update(loads)
        .set({ status: data.toStatus, updatedAt: now })
        .where(eq(loads.id, load.id));

      await tx.insert(loadStatusHistory).values({
        loadId: load.id,
        fromStatus,
        toStatus: data.toStatus,
        changedByUserId: context.user.id,
        reason: data.reason ?? null,
      });

      await auditRecord(
        {
          userId: context.user.id,
          action: "load.status_changed",
          entityType: "load",
          entityId: load.id,
          changes: { from: fromStatus, to: data.toStatus },
        },
        tx,
      );

      return { ok: true as const, fromStatus, toStatus: data.toStatus };
    });
  });

const CancelLoadInput = z.object({
  loadId: z.string().uuid(),
  reason: z.string().min(1),
});

export const cancelLoad = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => CancelLoadInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      const load = await tx.query.loads.findFirst({
        where: eq(loads.id, data.loadId),
      });
      if (!load || load.deletedAt) throw new NotFoundError("Load");
      if (load.status === "completed") {
        throw new BusinessRuleError("Completed loads cannot be cancelled");
      }
      if (load.status === "cancelled") {
        return { ok: true as const };
      }

      const now = new Date();
      const fromStatus = load.status;

      await tx
        .update(loads)
        .set({ status: "cancelled", updatedAt: now })
        .where(eq(loads.id, load.id));

      await tx.insert(loadStatusHistory).values({
        loadId: load.id,
        fromStatus,
        toStatus: "cancelled",
        changedByUserId: context.user.id,
        reason: data.reason,
      });

      await auditRecord(
        {
          userId: context.user.id,
          action: "load.cancelled",
          entityType: "load",
          entityId: load.id,
          changes: { reason: data.reason },
        },
        tx,
      );

      return { ok: true as const };
    });
  });

function formatCents(cents: number | null): string {
  if (cents == null) return "unset";
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
}

function formatPayChangeBody(
  priorCents: number | null,
  nextCents: number | null,
): string {
  if (priorCents == null) return `Pay set to ${formatCents(nextCents)}`;
  if (nextCents == null) return `Pay cleared (was ${formatCents(priorCents)})`;
  return `Pay changed from ${formatCents(priorCents)} to ${formatCents(nextCents)}`;
}

const DeleteLoadInput = z.object({ loadId: z.string().uuid() });

export const deleteLoad = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => DeleteLoadInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      const load = await tx.query.loads.findFirst({
        where: eq(loads.id, data.loadId),
      });
      if (!load || load.deletedAt) throw new NotFoundError("Load");
      if (load.status !== "draft") {
        throw new BusinessRuleError(
          "Only draft loads can be deleted; cancel non-draft loads instead",
          { currentStatus: load.status },
        );
      }

      const now = new Date();
      await tx
        .update(loads)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(loads.id, load.id));

      await auditRecord(
        {
          userId: context.user.id,
          action: "load.deleted",
          entityType: "load",
          entityId: load.id,
        },
        tx,
      );

      return { ok: true as const };
    });
  });
