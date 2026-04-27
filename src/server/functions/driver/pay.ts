import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/server/db";
import { loads } from "@/server/db/schema";
import { requireDriverContext } from "./_helpers";

export interface DriverPayWeek {
  /** ISO date for the Monday that starts the week, YYYY-MM-DD. */
  weekStart: string;
  totalCents: number;
  loads: Array<{
    id: string;
    loadNumber: string;
    deliveredAt: string;
    payCents: number;
  }>;
}

import type { Load } from "@/server/db/schema";

const PAID_STATUSES: Load["status"][] = [
  "delivered",
  "pod_uploaded",
  "completed",
];

/**
 * Bucket the driver's earned-or-pending loads by ISO week (Monday start).
 * "Earned" means the load is at least delivered AND has driverPayCents set.
 * Stub implementation — invoicing/pay-period concept is Phase 2.
 *
 * Sorted newest week first.
 */
export const listDriverPayWeeksFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<DriverPayWeek[]> => {
    const { driverId } = await requireDriverContext();

    const rows = await db
      .select({
        id: loads.id,
        loadNumber: loads.loadNumber,
        updatedAt: loads.updatedAt,
        payCents: loads.driverPayCents,
      })
      .from(loads)
      .where(
        and(
          eq(loads.assignedDriverId, driverId),
          inArray(loads.status, PAID_STATUSES),
          isNotNull(loads.driverPayCents),
          isNull(loads.deletedAt),
        ),
      )
      .orderBy(desc(loads.updatedAt));

    const buckets = new Map<string, DriverPayWeek>();
    for (const r of rows) {
      const weekStart = mondayOf(r.updatedAt);
      const key = weekStart.toISOString().slice(0, 10);
      const bucket = buckets.get(key) ?? {
        weekStart: key,
        totalCents: 0,
        loads: [],
      };
      const cents = r.payCents ?? 0;
      bucket.totalCents += cents;
      bucket.loads.push({
        id: r.id,
        loadNumber: r.loadNumber,
        deliveredAt: r.updatedAt.toISOString(),
        payCents: cents,
      });
      buckets.set(key, bucket);
    }

    return [...buckets.values()].sort((a, b) =>
      a.weekStart < b.weekStart ? 1 : -1,
    );
  },
);

function mondayOf(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  // getUTCDay: 0 = Sunday … 6 = Saturday. Monday = 1.
  const day = out.getUTCDay();
  const diff = (day + 6) % 7; // days since Monday
  out.setUTCDate(out.getUTCDate() - diff);
  return out;
}
