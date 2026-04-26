/**
 * Dashboard fixture data — summary widgets for /admin/dashboard.
 * Shapes mirror dashboard.getKpis + listExpirations contracts.
 */

import type { Trend } from "@/components/common/KpiCard";

export interface ExpiringDoc {
  id: string;
  type:
    | "driver_cdl"
    | "driver_medical"
    | "truck_registration"
    | "truck_insurance"
    | "truck_inspection";
  ownerLabel: string;
  ownerHref: string;
  expirationDate: string;
}

export interface DashboardActivity {
  id: string;
  action: string;
  actor: string;
  target: string;
  at: string;
}

export interface DashboardActiveLoad {
  id: string;
  loadNumber: string;
  driverName: string;
  pickupCity: string;
  deliveryCity: string;
  status:
    | "assigned"
    | "accepted"
    | "en_route_pickup"
    | "at_pickup"
    | "loaded"
    | "en_route_delivery"
    | "at_delivery"
    | "delivered"
    | "pod_uploaded";
}

export interface KpiTrends {
  activeLoads: Trend | null;
  completedThisWeek: Trend | null;
  driversOnRoadNow: Trend | null;
  invoicesOutstandingCents: Trend | null;
}

export interface DashboardKpis {
  activeLoads: number;
  completedThisWeek: number;
  driversOnRoadNow: number;
  invoicesOutstandingCents: number;
  trends: KpiTrends;
}

export const FIXTURE_KPIS: DashboardKpis = {
  activeLoads: 0,
  completedThisWeek: 0,
  driversOnRoadNow: 0,
  invoicesOutstandingCents: 0,
  trends: {
    activeLoads: null,
    completedThisWeek: null,
    driversOnRoadNow: null,
    invoicesOutstandingCents: null,
  },
};

export const FIXTURE_EXPIRING_DOCS: ExpiringDoc[] = [];

export const FIXTURE_ACTIVE_LOADS: DashboardActiveLoad[] = [];

export const FIXTURE_ACTIVITY: DashboardActivity[] = [];

export const FIXTURE_PENDING_ONBOARDING_COUNT: number = 0;
