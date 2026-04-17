/**
 * Fixture loads for frontend development. Replace with server-function
 * data once the backend contracts in 05-TECH-CONTRACTS.md §9.5 are wired up.
 * Shape matches `loads` table (02-DATA-MODEL.md §5) joined with broker + driver + stops.
 */

import type { LoadStatus } from "@/components/ui/status-pill";

export interface FixtureStop {
  city: string;
  state: string;
  windowStart: string;
  windowEnd: string;
}

export interface FixtureLoad {
  id: string;
  loadNumber: string;
  status: LoadStatus;
  rateCents: number;
  miles: number | null;
  commodity: string;
  weight: number | null;
  pieces: number | null;
  referenceNumber: string | null;
  pickup: FixtureStop;
  delivery: FixtureStop;
  broker: { id: string; companyName: string };
  driver: { id: string; firstName: string; lastName: string } | null;
  truck: { id: string; unitNumber: string } | null;
  updatedAt: string;
}

const now = new Date();
const d = (offsetDays: number, hour = 9) => {
  const x = new Date(now);
  x.setDate(x.getDate() + offsetDays);
  x.setHours(hour, 0, 0, 0);
  return x.toISOString();
};
const stop = (
  city: string,
  state: string,
  startDay: number,
  startHour: number,
  windowHours = 3,
): FixtureStop => ({
  city,
  state,
  windowStart: d(startDay, startHour),
  windowEnd: d(startDay, startHour + windowHours),
});

export const FIXTURE_LOADS: FixtureLoad[] = [
  {
    id: "ld_01",
    loadNumber: "PTL-2026-0142",
    status: "en_route_delivery",
    rateCents: 285_000,
    miles: 612,
    commodity: "Auto parts",
    weight: 38_400,
    pieces: 24,
    referenceNumber: "CH-882134",
    pickup: stop("Kansas City", "MO", -1, 8),
    delivery: stop("Dallas", "TX", 0, 16),
    broker: { id: "br_01", companyName: "CH Robinson" },
    driver: { id: "dr_01", firstName: "Jordan", lastName: "Reeves" },
    truck: { id: "tr_01", unitNumber: "101" },
    updatedAt: d(0, 2),
  },
  {
    id: "ld_02",
    loadNumber: "PTL-2026-0141",
    status: "at_pickup",
    rateCents: 198_000,
    miles: 340,
    commodity: "Dry goods",
    weight: 29_800,
    pieces: 18,
    referenceNumber: "TQL-441029",
    pickup: stop("St. Louis", "MO", 0, 10),
    delivery: stop("Chicago", "IL", 1, 12),
    broker: { id: "br_02", companyName: "Total Quality Logistics" },
    driver: { id: "dr_02", firstName: "Marcus", lastName: "Holloway" },
    truck: { id: "tr_02", unitNumber: "T-205" },
    updatedAt: d(0, 9),
  },
  {
    id: "ld_03",
    loadNumber: "PTL-2026-0140",
    status: "assigned",
    rateCents: 412_500,
    miles: 890,
    commodity: "Frozen foods",
    weight: 42_100,
    pieces: 30,
    referenceNumber: "XPO-552201",
    pickup: stop("Omaha", "NE", 1, 6),
    delivery: stop("Denver", "CO", 2, 14),
    broker: { id: "br_03", companyName: "XPO Logistics" },
    driver: { id: "dr_03", firstName: "Terrell", lastName: "Mason" },
    truck: { id: "tr_03", unitNumber: "T-301" },
    updatedAt: d(-1, 16),
  },
  {
    id: "ld_04",
    loadNumber: "PTL-2026-0139",
    status: "completed",
    rateCents: 225_000,
    miles: 455,
    commodity: "Industrial equipment",
    weight: 44_500,
    pieces: 6,
    referenceNumber: "CH-881902",
    pickup: stop("Memphis", "TN", -4, 7),
    delivery: stop("Nashville", "TN", -3, 14),
    broker: { id: "br_01", companyName: "CH Robinson" },
    driver: { id: "dr_01", firstName: "Jordan", lastName: "Reeves" },
    truck: { id: "tr_01", unitNumber: "101" },
    updatedAt: d(-3, 15),
  },
  {
    id: "ld_05",
    loadNumber: "PTL-2026-0138",
    status: "delivered",
    rateCents: 178_500,
    miles: 298,
    commodity: "Paper products",
    weight: 31_200,
    pieces: 22,
    referenceNumber: "TQL-440891",
    pickup: stop("Little Rock", "AR", -2, 9),
    delivery: stop("Jackson", "MS", -1, 11),
    broker: { id: "br_02", companyName: "Total Quality Logistics" },
    driver: { id: "dr_02", firstName: "Marcus", lastName: "Holloway" },
    truck: { id: "tr_02", unitNumber: "T-205" },
    updatedAt: d(-1, 13),
  },
  {
    id: "ld_06",
    loadNumber: "PTL-2026-0137",
    status: "draft",
    rateCents: 320_000,
    miles: null,
    commodity: "Retail goods",
    weight: null,
    pieces: null,
    referenceNumber: null,
    pickup: stop("Tulsa", "OK", 3, 8),
    delivery: stop("Phoenix", "AZ", 4, 10),
    broker: { id: "br_04", companyName: "Landstar System" },
    driver: null,
    truck: null,
    updatedAt: d(0, 8),
  },
  {
    id: "ld_07",
    loadNumber: "PTL-2026-0136",
    status: "cancelled",
    rateCents: 150_000,
    miles: 220,
    commodity: "Beverages",
    weight: 26_400,
    pieces: 12,
    referenceNumber: "XPO-551998",
    pickup: stop("Springfield", "MO", -5, 8),
    delivery: stop("Tulsa", "OK", -4, 14),
    broker: { id: "br_03", companyName: "XPO Logistics" },
    driver: null,
    truck: null,
    updatedAt: d(-4, 18),
  },
  {
    id: "ld_08",
    loadNumber: "PTL-2026-0135",
    status: "accepted",
    rateCents: 264_750,
    miles: 520,
    commodity: "Lumber",
    weight: 39_800,
    pieces: 8,
    referenceNumber: "CH-881856",
    pickup: stop("Little Rock", "AR", 2, 7),
    delivery: stop("Houston", "TX", 3, 13),
    broker: { id: "br_01", companyName: "CH Robinson" },
    driver: { id: "dr_04", firstName: "Devon", lastName: "Walker" },
    truck: { id: "tr_04", unitNumber: "T-402" },
    updatedAt: d(0, 6),
  },
];
