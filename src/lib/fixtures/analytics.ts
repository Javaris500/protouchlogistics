/**
 * Fixture analytics data for /admin/analytics.
 * Shapes mirror what the real server functions will return.
 * All money in integer cents. Dates as ISO strings.
 */

// ─── Revenue over time (weekly) ─────────────────────────────────────────────

export interface RevenuePoint {
  label: string; // e.g. "Mar 3" or "Week 10"
  revenueCents: number;
  priorPeriodCents: number;
  loads: number;
}

const w = (
  label: string,
  rev: number,
  prior: number,
  loads: number,
): RevenuePoint => ({
  label,
  revenueCents: rev,
  priorPeriodCents: prior,
  loads,
});

export const FIXTURE_REVENUE_WEEKLY: RevenuePoint[] = [
  w("Feb 3", 182_500, 165_000, 8),
  w("Feb 10", 215_000, 198_000, 10),
  w("Feb 17", 195_000, 210_000, 9),
  w("Feb 24", 248_000, 225_000, 11),
  w("Mar 3", 262_500, 240_000, 12),
  w("Mar 10", 228_000, 215_000, 10),
  w("Mar 17", 275_000, 252_000, 13),
  w("Mar 24", 310_000, 268_000, 14),
  w("Mar 31", 285_000, 275_000, 12),
  w("Apr 7", 325_000, 290_000, 15),
  w("Apr 14", 298_000, 285_000, 13),
];

// ─── Revenue by broker (top brokers) ────────────────────────────────────────

export interface BrokerRevenue {
  brokerId: string;
  name: string;
  revenueCents: number;
  loadCount: number;
  avgDaysToPay: number;
}

export const FIXTURE_REVENUE_BY_BROKER: BrokerRevenue[] = [
  {
    brokerId: "br_01",
    name: "CH Robinson",
    revenueCents: 1_285_000,
    loadCount: 42,
    avgDaysToPay: 22,
  },
  {
    brokerId: "br_02",
    name: "Total Quality Logistics",
    revenueCents: 982_500,
    loadCount: 35,
    avgDaysToPay: 28,
  },
  {
    brokerId: "br_03",
    name: "XPO Logistics",
    revenueCents: 745_000,
    loadCount: 22,
    avgDaysToPay: 45,
  },
  {
    brokerId: "br_04",
    name: "Landstar System",
    revenueCents: 620_000,
    loadCount: 18,
    avgDaysToPay: 18,
  },
  {
    brokerId: "br_05",
    name: "Coyote Logistics",
    revenueCents: 485_000,
    loadCount: 15,
    avgDaysToPay: 32,
  },
  {
    brokerId: "br_06",
    name: "Echo Global Logistics",
    revenueCents: 342_000,
    loadCount: 10,
    avgDaysToPay: 25,
  },
];

// ─── Rate per mile (30-day sparkline) ───────────────────────────────────────

export interface RatePerMilePoint {
  date: string;
  ratePerMileCents: number;
}

export const FIXTURE_RATE_PER_MILE: RatePerMilePoint[] = Array.from(
  { length: 30 },
  (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    // Oscillate around $2.65/mi with some variance
    const base = 265;
    const variance = Math.sin(i * 0.5) * 18 + (Math.random() - 0.5) * 10;
    return {
      date: d.toISOString().slice(0, 10),
      ratePerMileCents: Math.round(base + variance),
    };
  },
);

export const FIXTURE_RATE_PER_MILE_CURRENT = 272; // cents — $2.72/mi
export const FIXTURE_RATE_PER_MILE_TARGET_LOW = 250;
export const FIXTURE_RATE_PER_MILE_TARGET_HIGH = 300;

// ─── Revenue by lane (top lanes) ────────────────────────────────────────────

export interface LaneRevenue {
  origin: string;
  destination: string;
  revenueCents: number;
  loadCount: number;
  avgRatePerMileCents: number;
  sparkline: number[]; // 8 weekly data points
}

export const FIXTURE_LANES: LaneRevenue[] = [
  {
    origin: "Kansas City, MO",
    destination: "Dallas, TX",
    revenueCents: 625_000,
    loadCount: 12,
    avgRatePerMileCents: 285,
    sparkline: [42, 55, 48, 62, 50, 58, 65, 52],
  },
  {
    origin: "St. Louis, MO",
    destination: "Chicago, IL",
    revenueCents: 520_000,
    loadCount: 14,
    avgRatePerMileCents: 258,
    sparkline: [35, 40, 38, 45, 42, 50, 48, 55],
  },
  {
    origin: "Memphis, TN",
    destination: "Nashville, TN",
    revenueCents: 385_000,
    loadCount: 10,
    avgRatePerMileCents: 312,
    sparkline: [28, 32, 35, 30, 38, 42, 40, 38],
  },
  {
    origin: "Omaha, NE",
    destination: "Denver, CO",
    revenueCents: 412_000,
    loadCount: 8,
    avgRatePerMileCents: 290,
    sparkline: [30, 28, 35, 40, 38, 45, 50, 48],
  },
  {
    origin: "Little Rock, AR",
    destination: "Houston, TX",
    revenueCents: 348_000,
    loadCount: 9,
    avgRatePerMileCents: 268,
    sparkline: [25, 30, 28, 35, 32, 38, 35, 40],
  },
  {
    origin: "Tulsa, OK",
    destination: "Phoenix, AZ",
    revenueCents: 295_000,
    loadCount: 6,
    avgRatePerMileCents: 302,
    sparkline: [20, 25, 22, 28, 30, 35, 32, 28],
  },
];

// ─── Invoice aging ──────────────────────────────────────────────────────────

export interface InvoiceAging {
  bucket: string;
  amountCents: number;
  count: number;
  color: string;
}

export const FIXTURE_INVOICE_AGING: InvoiceAging[] = [
  {
    bucket: "0–30 days",
    amountCents: 830_000,
    count: 4,
    color: "var(--success)",
  },
  {
    bucket: "31–60 days",
    amountCents: 530_000,
    count: 2,
    color: "var(--warning)",
  },
  {
    bucket: "61–90 days",
    amountCents: 215_000,
    count: 1,
    color: "var(--primary)",
  },
  {
    bucket: "90+ days",
    amountCents: 150_000,
    count: 1,
    color: "var(--danger)",
  },
];

// ─── Days to pay by broker ──────────────────────────────────────────────────

export interface BrokerDaysToPay {
  name: string;
  avgDays: number;
  terms: number; // net days
}

export const FIXTURE_BROKER_DAYS_TO_PAY: BrokerDaysToPay[] = [
  { name: "Landstar System", avgDays: 18, terms: 30 },
  { name: "CH Robinson", avgDays: 22, terms: 30 },
  { name: "Echo Global", avgDays: 25, terms: 30 },
  { name: "TQL", avgDays: 28, terms: 30 },
  { name: "Coyote Logistics", avgDays: 32, terms: 30 },
  { name: "XPO Logistics", avgDays: 45, terms: 30 },
];

// ─── Load status funnel ─────────────────────────────────────────────────────

export interface FunnelStage {
  stage: string;
  count: number;
}

export const FIXTURE_LOAD_FUNNEL: FunnelStage[] = [
  { stage: "Draft", count: 3 },
  { stage: "Assigned", count: 8 },
  { stage: "In Transit", count: 12 },
  { stage: "Delivered", count: 10 },
  { stage: "POD Up", count: 9 },
  { stage: "Completed", count: 48 },
];

// ─── Driver leaderboard ─────────────────────────────────────────────────────

export interface DriverStats {
  id: string;
  name: string;
  loads: number;
  miles: number;
  onTimePercent: number;
  revenueCents: number;
  deltaLoads: number; // vs prior period
}

export const FIXTURE_DRIVER_LEADERBOARD: DriverStats[] = [
  {
    id: "dr_01",
    name: "Jordan Reeves",
    loads: 18,
    miles: 9_420,
    onTimePercent: 94,
    revenueCents: 892_000,
    deltaLoads: +3,
  },
  {
    id: "dr_02",
    name: "Marcus Holloway",
    loads: 15,
    miles: 7_650,
    onTimePercent: 87,
    revenueCents: 725_000,
    deltaLoads: +1,
  },
  {
    id: "dr_03",
    name: "Terrell Mason",
    loads: 12,
    miles: 8_100,
    onTimePercent: 92,
    revenueCents: 680_000,
    deltaLoads: -1,
  },
  {
    id: "dr_04",
    name: "Devon Walker",
    loads: 10,
    miles: 5_800,
    onTimePercent: 90,
    revenueCents: 520_000,
    deltaLoads: +2,
  },
  {
    id: "dr_05",
    name: "Kwame Phillips",
    loads: 8,
    miles: 4_200,
    onTimePercent: 100,
    revenueCents: 395_000,
    deltaLoads: 0,
  },
];

// ─── Truck utilization (loads per week) ─────────────────────────────────────

export interface TruckWeek {
  truck: string;
  weeks: number[]; // 8 weeks of load counts
}

export const FIXTURE_TRUCK_UTILIZATION: TruckWeek[] = [
  { truck: "101", weeks: [3, 4, 3, 4, 3, 4, 3, 4] },
  { truck: "T-205", weeks: [3, 3, 2, 3, 3, 2, 3, 3] },
  { truck: "T-301", weeks: [2, 3, 2, 2, 3, 2, 3, 2] },
  { truck: "T-402", weeks: [2, 2, 1, 2, 2, 3, 2, 2] },
  { truck: "T-501", weeks: [1, 0, 2, 1, 1, 0, 1, 2] },
];
