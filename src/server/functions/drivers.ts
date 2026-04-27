import { createServerFn } from "@tanstack/react-start";
import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import {
  driverProfiles,
  documents,
  loads,
  trucks,
  users,
} from "@/server/db/schema";
import {
  inviteDriver as inviteDriverApi,
} from "@/server/auth/api";
import { adminOnly } from "@/server/auth/middleware";
import { BusinessRuleError, NotFoundError } from "@/server/errors";
import { record as auditRecord } from "@/server/services/audit.service";

/**
 * Drivers — admin server functions. Brief §3.2 priority 1.
 *
 * The drivers list joins users + driver_profiles + (assigned) trucks. Invited
 * users without a profile row still surface (driver_profiles is LEFT joined)
 * so Gary can see "invited but not yet onboarded" drivers in the same table.
 */

const DriverStatusZ = z.enum([
  "invited",
  "pending_approval",
  "active",
  "suspended",
]);

const PaginationZ = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  cursor: z.string().nullable().default(null),
});

const ListDriversInput = PaginationZ.extend({
  status: DriverStatusZ.optional(),
  expiringWithinDays: z.number().int().min(0).max(365).optional(),
  search: z.string().optional(),
});

export interface DriverListItem {
  id: string | null;          // driver_profiles.id; null when invited but no profile yet
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  status: "invited" | "pending_approval" | "active" | "suspended";
  hireDate: string | null;
  cdlNumber: string | null;
  cdlClass: "A" | "B" | "C" | null;
  cdlState: string | null;
  cdlExpiration: string | null;     // ISO date
  medicalCardExpiration: string | null;
  assignedTruck: { id: string; unitNumber: string } | null;
  loadsThisYear: number;
  updatedAt: string;          // ISO timestamp
}

export const listDrivers = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => ListDriversInput.parse(data))
  .handler(async ({ data }): Promise<{
    drivers: DriverListItem[];
    nextCursor: string | null;
  }> => {
    const conditions = [eq(users.role, "driver"), isNull(driverProfiles.deletedAt)];
    if (data.status) conditions.push(eq(users.status, data.status));
    if (data.expiringWithinDays !== undefined) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + data.expiringWithinDays);
      const cutoffIso = cutoff.toISOString().slice(0, 10);
      conditions.push(
        or(
          lte(driverProfiles.cdlExpiration, cutoffIso),
          lte(driverProfiles.medicalCardExpiration, cutoffIso),
        )!,
      );
    }
    if (data.search?.trim()) {
      const q = `%${data.search.trim()}%`;
      conditions.push(
        or(
          ilike(users.email, q),
          ilike(users.name, q),
          ilike(driverProfiles.firstName, q),
          ilike(driverProfiles.lastName, q),
          ilike(driverProfiles.cdlNumber, q),
          ilike(driverProfiles.phone, q),
          ilike(driverProfiles.city, q),
        )!,
      );
    }
    if (data.cursor) {
      conditions.push(sql`${users.createdAt} < ${new Date(data.cursor)}`);
    }

    const rows = await db
      .select({
        profileId: driverProfiles.id,
        userId: users.id,
        firstName: driverProfiles.firstName,
        lastName: driverProfiles.lastName,
        email: users.email,
        phone: driverProfiles.phone,
        city: driverProfiles.city,
        state: driverProfiles.state,
        status: users.status,
        hireDate: driverProfiles.hireDate,
        cdlNumber: driverProfiles.cdlNumber,
        cdlClass: driverProfiles.cdlClass,
        cdlState: driverProfiles.cdlState,
        cdlExpiration: driverProfiles.cdlExpiration,
        medicalCardExpiration: driverProfiles.medicalCardExpiration,
        assignedTruckId: driverProfiles.assignedTruckId,
        truckUnitNumber: trucks.unitNumber,
        userCreatedAt: users.createdAt,
        userUpdatedAt: users.updatedAt,
        profileUpdatedAt: driverProfiles.updatedAt,
      })
      .from(users)
      .leftJoin(driverProfiles, eq(driverProfiles.userId, users.id))
      .leftJoin(trucks, eq(trucks.id, driverProfiles.assignedTruckId))
      .where(and(...conditions))
      .orderBy(desc(users.createdAt))
      .limit(data.limit + 1);

    const page = rows.slice(0, data.limit);
    const lastRow = page[page.length - 1];
    const nextCursor =
      rows.length > data.limit && lastRow
        ? lastRow.userCreatedAt.toISOString()
        : null;

    const profileIds = page
      .map((r) => r.profileId)
      .filter((id): id is string => id !== null);

    // loadsThisYear aggregate — single query, grouped.
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const counts = profileIds.length
      ? await db
          .select({
            driverId: loads.assignedDriverId,
            count: sql<number>`count(*)::int`,
          })
          .from(loads)
          .where(
            and(
              inArray(loads.assignedDriverId, profileIds),
              eq(loads.status, "completed"),
              sql`${loads.createdAt} >= ${yearStart}`,
            ),
          )
          .groupBy(loads.assignedDriverId)
      : [];
    const countByDriver = new Map<string, number>(
      counts
        .filter((c): c is { driverId: string; count: number } => !!c.driverId)
        .map((c) => [c.driverId, c.count]),
    );

    const drivers: DriverListItem[] = page.map((r) => ({
      id: r.profileId,
      userId: r.userId,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      phone: r.phone,
      city: r.city,
      state: r.state,
      status: r.status,
      hireDate: r.hireDate,
      cdlNumber: r.cdlNumber,
      cdlClass: r.cdlClass,
      cdlState: r.cdlState,
      cdlExpiration: r.cdlExpiration,
      medicalCardExpiration: r.medicalCardExpiration,
      assignedTruck:
        r.assignedTruckId && r.truckUnitNumber
          ? { id: r.assignedTruckId, unitNumber: r.truckUnitNumber }
          : null,
      loadsThisYear: r.profileId ? (countByDriver.get(r.profileId) ?? 0) : 0,
      updatedAt: (r.profileUpdatedAt ?? r.userUpdatedAt).toISOString(),
    }));

    return { drivers, nextCursor };
  });

export const listPendingApprovals = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => PaginationZ.parse(data ?? {}))
  .handler(async ({ data }) => {
    return listDrivers({
      data: { ...data, status: "pending_approval" },
    });
  });

const GetDriverInput = z.object({ driverId: z.string().uuid() });

export const getDriver = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => GetDriverInput.parse(data))
  .handler(async ({ data }) => {
    const profile = await db.query.driverProfiles.findFirst({
      where: eq(driverProfiles.id, data.driverId),
    });
    if (!profile) throw new NotFoundError("Driver");

    const userRow = await db.query.users.findFirst({
      where: eq(users.id, profile.userId),
    });
    if (!userRow) throw new NotFoundError("Driver user");

    const truck = profile.assignedTruckId
      ? await db.query.trucks.findFirst({
          where: eq(trucks.id, profile.assignedTruckId),
        })
      : null;

    const docs = await db.query.documents.findMany({
      where: eq(documents.driverProfileId, profile.id),
      orderBy: [desc(documents.createdAt)],
    });

    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const stats = await db
      .select({
        active: sql<number>`count(*) filter (where ${loads.status} not in ('completed','cancelled'))::int`,
        completedYtd: sql<number>`count(*) filter (where ${loads.status} = 'completed' and ${loads.createdAt} >= ${yearStart})::int`,
      })
      .from(loads)
      .where(eq(loads.assignedDriverId, profile.id));

    return {
      driver: {
        ...profile,
        email: userRow.email,
        userStatus: userRow.status,
      },
      assignedTruck: truck,
      documents: docs,
      stats: {
        activeLoads: stats[0]?.active ?? 0,
        completedLoadsThisYear: stats[0]?.completedYtd ?? 0,
      },
    };
  });

const InviteDriverInput = z.object({
  email: z.string().email(),
});

export const inviteDriver = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => InviteDriverInput.parse(data))
  .handler(async ({ data, context }) => {
    const result = await inviteDriverApi({
      email: data.email,
      invitedByUserId: context.user.id,
    });

    await auditRecord({
      userId: context.user.id,
      action: "driver.invited",
      entityType: "user",
      entityId: null,
      changes: { email: data.email, token: result.token },
    });

    return result;
  });

const ApproveRejectInput = z.object({
  driverId: z.string().uuid(),
  reason: z.string().min(1).optional(),
});

export const approveDriver = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => ApproveRejectInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      const profile = await tx.query.driverProfiles.findFirst({
        where: eq(driverProfiles.id, data.driverId),
      });
      if (!profile) throw new NotFoundError("Driver");

      const userRow = await tx.query.users.findFirst({
        where: eq(users.id, profile.userId),
      });
      if (!userRow) throw new NotFoundError("Driver user");
      if (userRow.status !== "pending_approval") {
        throw new BusinessRuleError(
          "Only drivers in pending_approval can be approved",
          { currentStatus: userRow.status },
        );
      }

      const now = new Date();
      await tx
        .update(driverProfiles)
        .set({
          approvedAt: now,
          approvedByUserId: context.user.id,
          updatedAt: now,
        })
        .where(eq(driverProfiles.id, profile.id));
      await tx
        .update(users)
        .set({ status: "active", updatedAt: now })
        .where(eq(users.id, userRow.id));

      await auditRecord(
        {
          userId: context.user.id,
          action: "driver.approved",
          entityType: "driver_profile",
          entityId: profile.id,
        },
        tx,
      );
      return { ok: true as const };
    });
  });

export const rejectDriver = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) =>
    ApproveRejectInput.extend({ reason: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      const profile = await tx.query.driverProfiles.findFirst({
        where: eq(driverProfiles.id, data.driverId),
      });
      if (!profile) throw new NotFoundError("Driver");

      const now = new Date();
      await tx
        .update(driverProfiles)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(driverProfiles.id, profile.id));
      await tx
        .update(users)
        .set({ status: "suspended", updatedAt: now })
        .where(eq(users.id, profile.userId));

      await auditRecord(
        {
          userId: context.user.id,
          action: "driver.rejected",
          entityType: "driver_profile",
          entityId: profile.id,
          changes: { reason: data.reason },
        },
        tx,
      );
      return { ok: true as const };
    });
  });

const SuspendInput = z.object({
  driverId: z.string().uuid(),
  reason: z.string().min(1),
});

export const suspendDriver = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => SuspendInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      const profile = await tx.query.driverProfiles.findFirst({
        where: eq(driverProfiles.id, data.driverId),
      });
      if (!profile) throw new NotFoundError("Driver");

      const now = new Date();
      await tx
        .update(users)
        .set({ status: "suspended", updatedAt: now })
        .where(eq(users.id, profile.userId));

      await auditRecord(
        {
          userId: context.user.id,
          action: "driver.suspended",
          entityType: "driver_profile",
          entityId: profile.id,
          changes: { reason: data.reason },
        },
        tx,
      );
      return { ok: true as const };
    });
  });

export const reinstateDriver = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) =>
    z.object({ driverId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      const profile = await tx.query.driverProfiles.findFirst({
        where: eq(driverProfiles.id, data.driverId),
      });
      if (!profile) throw new NotFoundError("Driver");

      const userRow = await tx.query.users.findFirst({
        where: eq(users.id, profile.userId),
      });
      if (!userRow) throw new NotFoundError("Driver user");
      if (userRow.status !== "suspended") {
        throw new BusinessRuleError("Driver is not suspended", {
          currentStatus: userRow.status,
        });
      }

      const now = new Date();
      await tx
        .update(users)
        .set({ status: "active", updatedAt: now })
        .where(eq(users.id, userRow.id));

      await auditRecord(
        {
          userId: context.user.id,
          action: "driver.reinstated",
          entityType: "driver_profile",
          entityId: profile.id,
        },
        tx,
      );
      return { ok: true as const };
    });
  });

const UpdateDriverInput = z.object({
  driverId: z.string().uuid(),
  patch: z
    .object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      phone: z.string().min(7).optional(),
      addressLine1: z.string().min(1).optional(),
      addressLine2: z.string().nullable().optional(),
      city: z.string().min(1).optional(),
      state: z.string().length(2).optional(),
      zip: z.string().min(3).optional(),
      emergencyContactName: z.string().min(1).optional(),
      emergencyContactPhone: z.string().min(7).optional(),
      emergencyContactRelation: z.string().min(1).optional(),
      cdlNumber: z.string().min(1).optional(),
      cdlClass: z.enum(["A", "B", "C"]).optional(),
      cdlState: z.string().length(2).optional(),
      cdlExpiration: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      medicalCardExpiration: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      assignedTruckId: z.string().uuid().nullable().optional(),
      notes: z.string().nullable().optional(),
    })
    .refine((p) => Object.keys(p).length > 0, {
      message: "Patch must contain at least one field",
    }),
});

export const updateDriver = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => UpdateDriverInput.parse(data))
  .handler(async ({ data, context }) => {
    return db.transaction(async (tx) => {
      const profile = await tx.query.driverProfiles.findFirst({
        where: eq(driverProfiles.id, data.driverId),
      });
      if (!profile) throw new NotFoundError("Driver");

      await tx
        .update(driverProfiles)
        .set({ ...data.patch, updatedAt: new Date() })
        .where(eq(driverProfiles.id, profile.id));

      await auditRecord(
        {
          userId: context.user.id,
          action: "driver.updated",
          entityType: "driver_profile",
          entityId: profile.id,
          changes: data.patch as Record<string, unknown>,
        },
        tx,
      );
      return { ok: true as const };
    });
  });
