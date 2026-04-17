/**
 * Dashboard fixture data — summary widgets for /admin/dashboard.
 * Shapes mirror dashboard.getKpis + listExpirations contracts.
 */

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

const today = new Date();
const plusDays = (n: number) => {
  const x = new Date(today);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};
const minusMinutes = (n: number) => {
  const x = new Date(today);
  x.setMinutes(x.getMinutes() - n);
  return x.toISOString();
};

export const FIXTURE_KPIS = {
  activeLoads: 7,
  completedThisWeek: 12,
  driversOnRoadNow: 4,
  invoicesOutstandingCents: 4_215_000,
  trends: {
    activeLoads: {
      direction: "up" as const,
      value: "+2",
      positiveIsGood: true,
    },
    completedThisWeek: {
      direction: "up" as const,
      value: "+18%",
      positiveIsGood: true,
    },
    driversOnRoadNow: {
      direction: "flat" as const,
      value: "—",
      positiveIsGood: true,
    },
    invoicesOutstandingCents: {
      direction: "down" as const,
      value: "-$8.2K",
      positiveIsGood: false,
    },
  },
};

export const FIXTURE_EXPIRING_DOCS: ExpiringDoc[] = [
  {
    id: "doc_01",
    type: "truck_insurance",
    ownerLabel: "Truck T-301",
    ownerHref: "/admin/trucks/tr_03",
    expirationDate: plusDays(9),
  },
  {
    id: "doc_02",
    type: "driver_medical",
    ownerLabel: "Marcus Holloway",
    ownerHref: "/admin/drivers/dr_02",
    expirationDate: plusDays(17),
  },
  {
    id: "doc_03",
    type: "truck_registration",
    ownerLabel: "Truck T-205",
    ownerHref: "/admin/trucks/tr_02",
    expirationDate: plusDays(24),
  },
  {
    id: "doc_04",
    type: "driver_cdl",
    ownerLabel: "Terrell Mason",
    ownerHref: "/admin/drivers/dr_03",
    expirationDate: plusDays(38),
  },
  {
    id: "doc_05",
    type: "truck_inspection",
    ownerLabel: "Truck 101",
    ownerHref: "/admin/trucks/tr_01",
    expirationDate: plusDays(47),
  },
];

export const FIXTURE_ACTIVE_LOADS: DashboardActiveLoad[] = [
  {
    id: "ld_01",
    loadNumber: "PTL-2026-0142",
    driverName: "Jordan Reeves",
    pickupCity: "Kansas City",
    deliveryCity: "Dallas",
    status: "en_route_delivery",
  },
  {
    id: "ld_02",
    loadNumber: "PTL-2026-0141",
    driverName: "Marcus Holloway",
    pickupCity: "St. Louis",
    deliveryCity: "Chicago",
    status: "at_pickup",
  },
  {
    id: "ld_08",
    loadNumber: "PTL-2026-0135",
    driverName: "Devon Walker",
    pickupCity: "Little Rock",
    deliveryCity: "Houston",
    status: "accepted",
  },
  {
    id: "ld_03",
    loadNumber: "PTL-2026-0140",
    driverName: "Terrell Mason",
    pickupCity: "Omaha",
    deliveryCity: "Denver",
    status: "assigned",
  },
];

export const FIXTURE_ACTIVITY: DashboardActivity[] = [
  {
    id: "a_01",
    action: "advanced load to",
    actor: "Jordan Reeves",
    target: "En route to delivery · PTL-2026-0142",
    at: minusMinutes(14),
  },
  {
    id: "a_02",
    action: "uploaded POD for",
    actor: "Marcus Holloway",
    target: "PTL-2026-0138",
    at: minusMinutes(112),
  },
  {
    id: "a_03",
    action: "created load",
    actor: "Gary Tavel",
    target: "PTL-2026-0137 · Landstar System",
    at: minusMinutes(186),
  },
  {
    id: "a_04",
    action: "accepted load",
    actor: "Devon Walker",
    target: "PTL-2026-0135",
    at: minusMinutes(298),
  },
  {
    id: "a_05",
    action: "marked invoice paid",
    actor: "Gary Tavel",
    target: "PTL-INV-2026-0018 · $4,250.00",
    at: minusMinutes(432),
  },
];

export const FIXTURE_PENDING_ONBOARDING_COUNT: number = 1;
