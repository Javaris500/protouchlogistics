import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import {
  driverPayRecords,
  driverProfiles,
  loads,
} from "@/server/db/schema";
import { adminOnly } from "@/server/auth/middleware";

/**
 * Pay aggregates — admin server functions. Brief §3.2 priority 6: read
 * aggregates only, full mark-paid + adjustments lifecycle is Phase 2.
 *
 * The CSV export helper from commit `31d5804` already exists client-side;
 * here we provide the data feed it needs (`listPayRecordsAdmin`).
 */

const PaginationZ = z.object({
  limit: z.number().int().min(1).max(500).default(200),
  cursor: z.string().nullable().default(null),
});

const PayFilterZ = PaginationZ.extend({
  driverId: z.string().uuid().optional(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paid: z.boolean().optional(),
});

export const listPayRecordsAdmin = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .inputValidator((data: unknown) => PayFilterZ.parse(data ?? {}))
  .handler(async ({ data }) => {
    const conditions = [];
    if (data.driverId)
      conditions.push(eq(driverPayRecords.driverProfileId, data.driverId));
    if (data.periodStart)
      conditions.push(
        gte(driverPayRecords.createdAt, new Date(data.periodStart)),
      );
    if (data.periodEnd) {
      const end = new Date(data.periodEnd);
      end.setDate(end.getDate() + 1); // inclusive end
      conditions.push(lte(driverPayRecords.createdAt, end));
    }
    if (data.paid === true) {
      conditions.push(sql`${driverPayRecords.paidAt} IS NOT NULL`);
    } else if (data.paid === false) {
      conditions.push(sql`${driverPayRecords.paidAt} IS NULL`);
    }
    if (data.cursor) {
      conditions.push(
        sql`${driverPayRecords.createdAt} < ${new Date(data.cursor)}`,
      );
    }

    const rows = await db
      .select({
        id: driverPayRecords.id,
        driverProfileId: driverPayRecords.driverProfileId,
        driverFirstName: driverProfiles.firstName,
        driverLastName: driverProfiles.lastName,
        loadId: driverPayRecords.loadId,
        loadNumber: loads.loadNumber,
        calculatedAmountCents: driverPayRecords.calculatedAmountCents,
        adjustmentsCents: driverPayRecords.adjustmentsCents,
        totalAmountCents: driverPayRecords.totalAmountCents,
        paidAt: driverPayRecords.paidAt,
        notes: driverPayRecords.notes,
        createdAt: driverPayRecords.createdAt,
      })
      .from(driverPayRecords)
      .leftJoin(
        driverProfiles,
        eq(driverProfiles.id, driverPayRecords.driverProfileId),
      )
      .leftJoin(loads, eq(loads.id, driverPayRecords.loadId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(driverPayRecords.createdAt))
      .limit(data.limit + 1);

    const page = rows.slice(0, data.limit);
    const lastRow = page[page.length - 1];
    const nextCursor =
      rows.length > data.limit && lastRow ? lastRow.createdAt.toISOString() : null;

    const totalCents = page.reduce((sum, r) => sum + r.totalAmountCents, 0);
    const unpaidCents = page
      .filter((r) => !r.paidAt)
      .reduce((sum, r) => sum + r.totalAmountCents, 0);

    return {
      records: page.map((r) => ({
        id: r.id,
        driverId: r.driverProfileId,
        driverName:
          [r.driverFirstName, r.driverLastName].filter(Boolean).join(" ") ||
          "Unknown driver",
        loadId: r.loadId,
        loadNumber: r.loadNumber ?? null,
        calculatedAmountCents: r.calculatedAmountCents,
        adjustmentsCents: r.adjustmentsCents,
        totalAmountCents: r.totalAmountCents,
        paidAt: r.paidAt?.toISOString() ?? null,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
      })),
      nextCursor,
      totals: {
        totalCents,
        unpaidCents,
        recordCount: page.length,
      },
    };
  });
