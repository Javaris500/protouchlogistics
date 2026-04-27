import { createServerFn } from "@tanstack/react-start";
import { and, count, eq, gte, isNotNull, isNull, ne, sql } from "drizzle-orm";

import { db } from "@/server/db";
import {
  brokers,
  driverProfiles,
  loads,
  trucks,
  users,
} from "@/server/db/schema";
import { adminOnly } from "@/server/auth/middleware";

/**
 * Analytics — admin server functions.
 *
 * One aggregate-summary endpoint that powers /admin/analytics. Pulls live
 * counts and money totals from Postgres in a handful of small queries; no
 * cross-table N+1 because every aggregate is a single SELECT against the
 * relevant table.
 *
 * Time windows: today, last 7 days, last 30 days, all-time. Computed
 * client-side from cutoff dates so the SQL stays simple.
 */

const COMPLETED_STATUSES = ["completed", "pod_uploaded", "delivered"] as const;

interface BucketTotals {
  completed: number;
  revenueCents: number;
  driverPayCents: number;
  miles: number;
}

const ZERO_BUCKET: BucketTotals = {
  completed: 0,
  revenueCents: 0,
  driverPayCents: 0,
  miles: 0,
};

export interface AnalyticsSummary {
  fleet: {
    activeDrivers: number;
    pendingDrivers: number;
    activeTrucks: number;
    inShopTrucks: number;
    brokers: number;
  };
  loads: {
    inFlight: number;
    completedAllTime: number;
    cancelled: number;
  };
  money: {
    revenueAllTimeCents: number;
    driverPayAllTimeCents: number;
    marginAllTimeCents: number;
    avgRatePerMileCents: number | null;
  };
  windows: {
    today: BucketTotals;
    last7Days: BucketTotals;
    last30Days: BucketTotals;
  };
  /** Status histogram for in-flight loads — for a small donut/bar viz. */
  statusBreakdown: Array<{ status: string; count: number }>;
}

function startOfTodayIso(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const getAnalyticsSummary = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .handler(async (): Promise<AnalyticsSummary> => {
    const today = startOfTodayIso();
    const day7 = daysAgo(7);
    const day30 = daysAgo(30);

    // Fleet counts
    const [activeDriversRow] = await db
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.role, "driver"), eq(users.status, "active")));
    const [pendingDriversRow] = await db
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.role, "driver"), eq(users.status, "pending_approval")));
    const [activeTrucksRow] = await db
      .select({ value: count() })
      .from(trucks)
      .where(and(eq(trucks.status, "active"), isNull(trucks.deletedAt)));
    const [inShopTrucksRow] = await db
      .select({ value: count() })
      .from(trucks)
      .where(and(eq(trucks.status, "in_shop"), isNull(trucks.deletedAt)));
    const [brokersRow] = await db
      .select({ value: count() })
      .from(brokers)
      .where(isNull(brokers.deletedAt));

    // Loads counts
    const [inFlightRow] = await db
      .select({ value: count() })
      .from(loads)
      .where(
        and(
          isNull(loads.deletedAt),
          ne(loads.status, "completed"),
          ne(loads.status, "cancelled"),
          ne(loads.status, "draft"),
        ),
      );
    const [completedRow] = await db
      .select({ value: count() })
      .from(loads)
      .where(and(isNull(loads.deletedAt), eq(loads.status, "completed")));
    const [cancelledRow] = await db
      .select({ value: count() })
      .from(loads)
      .where(and(isNull(loads.deletedAt), eq(loads.status, "cancelled")));

    // Money — completed loads only
    const moneyAggregate = (since?: Date) =>
      db
        .select({
          completed: count(),
          revenueCents: sql<number>`coalesce(sum(${loads.rate}), 0)::bigint`,
          driverPayCents: sql<number>`coalesce(sum(${loads.driverPayCents}), 0)::bigint`,
          miles: sql<number>`coalesce(sum(${loads.miles}), 0)::bigint`,
        })
        .from(loads)
        .where(
          and(
            isNull(loads.deletedAt),
            eq(loads.status, "completed"),
            since ? gte(loads.updatedAt, since) : undefined,
          ),
        );

    const [allTime] = await moneyAggregate();
    const [todayTotals] = await moneyAggregate(today);
    const [last7] = await moneyAggregate(day7);
    const [last30] = await moneyAggregate(day30);

    const totalRevenueCents = Number(allTime?.revenueCents ?? 0);
    const totalPayCents = Number(allTime?.driverPayCents ?? 0);
    const totalMiles = Number(allTime?.miles ?? 0);
    const avgRatePerMileCents =
      totalMiles > 0 ? Math.round(totalRevenueCents / totalMiles) : null;

    // Status breakdown for in-flight loads
    const breakdownRows = await db
      .select({
        status: loads.status,
        c: count(),
      })
      .from(loads)
      .where(
        and(
          isNull(loads.deletedAt),
          ne(loads.status, "completed"),
          ne(loads.status, "cancelled"),
          ne(loads.status, "draft"),
        ),
      )
      .groupBy(loads.status);

    const toBucket = (row: typeof allTime | undefined): BucketTotals =>
      row
        ? {
            completed: Number(row.completed ?? 0),
            revenueCents: Number(row.revenueCents ?? 0),
            driverPayCents: Number(row.driverPayCents ?? 0),
            miles: Number(row.miles ?? 0),
          }
        : { ...ZERO_BUCKET };

    return {
      fleet: {
        activeDrivers: Number(activeDriversRow?.value ?? 0),
        pendingDrivers: Number(pendingDriversRow?.value ?? 0),
        activeTrucks: Number(activeTrucksRow?.value ?? 0),
        inShopTrucks: Number(inShopTrucksRow?.value ?? 0),
        brokers: Number(brokersRow?.value ?? 0),
      },
      loads: {
        inFlight: Number(inFlightRow?.value ?? 0),
        completedAllTime: Number(completedRow?.value ?? 0),
        cancelled: Number(cancelledRow?.value ?? 0),
      },
      money: {
        revenueAllTimeCents: totalRevenueCents,
        driverPayAllTimeCents: totalPayCents,
        marginAllTimeCents: totalRevenueCents - totalPayCents,
        avgRatePerMileCents,
      },
      windows: {
        today: toBucket(todayTotals),
        last7Days: toBucket(last7),
        last30Days: toBucket(last30),
      },
      statusBreakdown: breakdownRows.map((r) => ({
        status: r.status,
        count: Number(r.c ?? 0),
      })),
    };
  });
