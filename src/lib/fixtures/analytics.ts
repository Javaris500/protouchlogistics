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

// ─── Period variants ────────────────────────────────────────────────────────
// Revenue series per period selector. Week = last 7 daily points, Month =
// last 11 weekly points (the existing fixture), Quarter = last 12 monthly
// points.

export type PeriodId = "week" | "month" | "quarter";

const w_ = w; // alias for reuse

export const FIXTURE_REVENUE_BY_PERIOD: Record<PeriodId, RevenuePoint[]> = {
  week: [
    w_("Mon", 42_500, 38_000, 2),
    w_("Tue", 38_000, 42_000, 2),
    w_("Wed", 55_000, 48_000, 3),
    w_("Thu", 48_500, 45_000, 2),
    w_("Fri", 62_000, 52_000, 3),
    w_("Sat", 28_000, 30_000, 1),
    w_("Sun", 24_000, 22_000, 1),
  ],
  month: FIXTURE_REVENUE_WEEKLY,
  quarter: [
    w_("May", 820_000, 740_000, 36),
    w_("Jun", 905_000, 812_000, 40),
    w_("Jul", 960_000, 875_000, 42),
    w_("Aug", 1_042_000, 930_000, 46),
    w_("Sep", 1_125_000, 985_000, 50),
    w_("Oct", 1_080_000, 1_020_000, 48),
    w_("Nov", 1_180_000, 1_060_000, 52),
    w_("Dec", 960_000, 1_100_000, 44),
    w_("Jan", 1_050_000, 920_000, 46),
    w_("Feb", 1_120_000, 988_000, 49),
    w_("Mar", 1_235_000, 1_040_000, 54),
    w_("Apr", 948_000, 1_085_000, 42),
  ],
};

// ─── KPI row data ───────────────────────────────────────────────────────────
// Six hero stats at the top of the page. Each KPI has a current value, a
// delta vs prior period, and an 8-point sparkline for the trend preview.

export type KpiTone = "positive" | "negative" | "neutral";

export interface KpiDatum {
  id: "revenue" | "margin" | "rpm" | "deadhead" | "onTime" | "overdue";
  label: string;
  /** Raw numeric value (cents for money, percent as 0–100, dollars for rpm/100). */
  value: number;
  /** Human-readable deltaValue (positive or negative). In same unit as value. */
  delta: number;
  /** If true, up = good. If false, down = good (e.g., deadhead, overdue). */
  upIsGood: boolean;
  /** Short sparkline trend for the hero card. */
  sparkline: number[];
  /** Caption next to delta, like "vs. prior 30d". */
  deltaLabel: string;
}

export const FIXTURE_KPIS_BY_PERIOD: Record<PeriodId, KpiDatum[]> = {
  week: [
    {
      id: "revenue",
      label: "Revenue",
      value: 298_000,
      delta: 13_500,
      upIsGood: true,
      sparkline: [42, 38, 55, 48, 62, 28, 24],
      deltaLabel: "vs. prior week",
    },
    {
      id: "margin",
      label: "Net margin",
      value: 18.4,
      delta: 1.2,
      upIsGood: true,
      sparkline: [17, 17.5, 18, 18.2, 18.1, 18.4, 18.4],
      deltaLabel: "vs. prior week",
    },
    {
      id: "rpm",
      label: "Rate per mile",
      value: 272,
      delta: 7,
      upIsGood: true,
      sparkline: [265, 268, 270, 271, 270, 272, 272],
      deltaLabel: "vs. prior week",
    },
    {
      id: "deadhead",
      label: "Deadhead %",
      value: 14.8,
      delta: -1.4,
      upIsGood: false,
      sparkline: [17, 16.5, 16, 15.5, 15.2, 15, 14.8],
      deltaLabel: "vs. prior week",
    },
    {
      id: "onTime",
      label: "On-time %",
      value: 92,
      delta: 2,
      upIsGood: true,
      sparkline: [88, 89, 90, 91, 92, 91, 92],
      deltaLabel: "vs. prior week",
    },
    {
      id: "overdue",
      label: "Overdue A/R",
      value: 365_000,
      delta: -45_000,
      upIsGood: false,
      sparkline: [410, 420, 405, 390, 380, 370, 365],
      deltaLabel: "vs. prior week",
    },
  ],
  month: [
    {
      id: "revenue",
      label: "Revenue",
      value: 1_120_000,
      delta: 132_000,
      upIsGood: true,
      sparkline: [182, 215, 195, 248, 262, 228, 275, 310, 285, 325, 298],
      deltaLabel: "vs. prior month",
    },
    {
      id: "margin",
      label: "Net margin",
      value: 17.8,
      delta: 0.9,
      upIsGood: true,
      sparkline: [16.5, 16.8, 17, 17.2, 17.5, 17.6, 17.8, 17.8],
      deltaLabel: "vs. prior month",
    },
    {
      id: "rpm",
      label: "Rate per mile",
      value: 272,
      delta: 7,
      upIsGood: true,
      sparkline: [258, 262, 265, 268, 270, 271, 272, 272],
      deltaLabel: "vs. prior month",
    },
    {
      id: "deadhead",
      label: "Deadhead %",
      value: 15.2,
      delta: -2.1,
      upIsGood: false,
      sparkline: [18.5, 18, 17.5, 17, 16.5, 16, 15.5, 15.2],
      deltaLabel: "vs. prior month",
    },
    {
      id: "onTime",
      label: "On-time %",
      value: 91,
      delta: 3,
      upIsGood: true,
      sparkline: [85, 86, 87, 88, 89, 90, 90, 91],
      deltaLabel: "vs. prior month",
    },
    {
      id: "overdue",
      label: "Overdue A/R",
      value: 365_000,
      delta: -82_000,
      upIsGood: false,
      sparkline: [480, 470, 450, 430, 410, 395, 380, 365],
      deltaLabel: "vs. prior month",
    },
  ],
  quarter: [
    {
      id: "revenue",
      label: "Revenue",
      value: 3_303_000,
      delta: 410_000,
      upIsGood: true,
      sparkline: [
        820, 905, 960, 1042, 1125, 1080, 1180, 960, 1050, 1120, 1235, 948,
      ],
      deltaLabel: "vs. prior quarter",
    },
    {
      id: "margin",
      label: "Net margin",
      value: 17.2,
      delta: 1.5,
      upIsGood: true,
      sparkline: [15, 15.5, 16, 16.5, 16.8, 17, 17, 17.2],
      deltaLabel: "vs. prior quarter",
    },
    {
      id: "rpm",
      label: "Rate per mile",
      value: 268,
      delta: 12,
      upIsGood: true,
      sparkline: [248, 252, 256, 260, 262, 265, 266, 268],
      deltaLabel: "vs. prior quarter",
    },
    {
      id: "deadhead",
      label: "Deadhead %",
      value: 16.1,
      delta: -3.2,
      upIsGood: false,
      sparkline: [20, 19.5, 19, 18, 17.5, 17, 16.5, 16.1],
      deltaLabel: "vs. prior quarter",
    },
    {
      id: "onTime",
      label: "On-time %",
      value: 89,
      delta: 4,
      upIsGood: true,
      sparkline: [82, 84, 85, 86, 87, 88, 88, 89],
      deltaLabel: "vs. prior quarter",
    },
    {
      id: "overdue",
      label: "Overdue A/R",
      value: 365_000,
      delta: -195_000,
      upIsGood: false,
      sparkline: [620, 590, 560, 520, 480, 440, 405, 365],
      deltaLabel: "vs. prior quarter",
    },
  ],
};

// ─── Cost per mile stacked breakdown ────────────────────────────────────────
// Weekly series showing cost components. Each cent value is a cost-per-mile
// for that week split across categories. The sum is total CPM.

export interface CostPerMilePoint {
  label: string;
  fuelCents: number;
  driverCents: number;
  truckCents: number;
  insuranceCents: number;
}

export const FIXTURE_COST_PER_MILE: CostPerMilePoint[] = [
  {
    label: "Feb 3",
    fuelCents: 72,
    driverCents: 58,
    truckCents: 44,
    insuranceCents: 18,
  },
  {
    label: "Feb 10",
    fuelCents: 75,
    driverCents: 60,
    truckCents: 42,
    insuranceCents: 18,
  },
  {
    label: "Feb 17",
    fuelCents: 78,
    driverCents: 58,
    truckCents: 45,
    insuranceCents: 19,
  },
  {
    label: "Feb 24",
    fuelCents: 74,
    driverCents: 62,
    truckCents: 43,
    insuranceCents: 19,
  },
  {
    label: "Mar 3",
    fuelCents: 71,
    driverCents: 61,
    truckCents: 41,
    insuranceCents: 19,
  },
  {
    label: "Mar 10",
    fuelCents: 73,
    driverCents: 60,
    truckCents: 42,
    insuranceCents: 19,
  },
  {
    label: "Mar 17",
    fuelCents: 76,
    driverCents: 59,
    truckCents: 44,
    insuranceCents: 20,
  },
  {
    label: "Mar 24",
    fuelCents: 79,
    driverCents: 60,
    truckCents: 43,
    insuranceCents: 20,
  },
  {
    label: "Mar 31",
    fuelCents: 74,
    driverCents: 61,
    truckCents: 42,
    insuranceCents: 20,
  },
  {
    label: "Apr 7",
    fuelCents: 71,
    driverCents: 60,
    truckCents: 41,
    insuranceCents: 20,
  },
  {
    label: "Apr 14",
    fuelCents: 69,
    driverCents: 62,
    truckCents: 42,
    insuranceCents: 20,
  },
];

export const FIXTURE_COST_PER_MILE_CURRENT = 193; // sum of latest point
export const FIXTURE_RPM_MINUS_CPM_CURRENT =
  FIXTURE_RATE_PER_MILE_CURRENT - FIXTURE_COST_PER_MILE_CURRENT; // margin/mi

// ─── Deadhead % trend ───────────────────────────────────────────────────────

export interface DeadheadPoint {
  label: string;
  deadheadPercent: number;
}

export const FIXTURE_DEADHEAD_TREND: DeadheadPoint[] = [
  { label: "Feb 3", deadheadPercent: 18.5 },
  { label: "Feb 10", deadheadPercent: 18.0 },
  { label: "Feb 17", deadheadPercent: 17.5 },
  { label: "Feb 24", deadheadPercent: 17.2 },
  { label: "Mar 3", deadheadPercent: 16.8 },
  { label: "Mar 10", deadheadPercent: 17.0 },
  { label: "Mar 17", deadheadPercent: 16.2 },
  { label: "Mar 24", deadheadPercent: 15.8 },
  { label: "Mar 31", deadheadPercent: 15.5 },
  { label: "Apr 7", deadheadPercent: 15.2 },
  { label: "Apr 14", deadheadPercent: 14.8 },
];

// ─── Broker concentration (donut) ───────────────────────────────────────────
// Revenue share as % of total. Derived offline so render doesn't have to
// recompute. "Other" is the long-tail beyond the top 5.

export interface BrokerShare {
  name: string;
  percent: number;
  revenueCents: number;
  color: string;
}

export const FIXTURE_BROKER_CONCENTRATION: BrokerShare[] = [
  {
    name: "CH Robinson",
    percent: 28,
    revenueCents: 1_285_000,
    color: "#f27a1a",
  },
  { name: "TQL", percent: 22, revenueCents: 982_500, color: "#f59b5c" },
  { name: "XPO", percent: 16, revenueCents: 745_000, color: "#22a6b3" },
  { name: "Landstar", percent: 14, revenueCents: 620_000, color: "#4e8bcb" },
  { name: "Coyote", percent: 11, revenueCents: 485_000, color: "#9b7cc9" },
  { name: "Other", percent: 9, revenueCents: 390_000, color: "#a3a3a3" },
];

// ─── Load margin waterfall ──────────────────────────────────────────────────
// Average single-load economics. Gross → each deduction → net.

export interface WaterfallStep {
  label: string;
  /** Positive for the starting point and the net result, negative for
   *  deductions. Always cents. */
  amountCents: number;
  /** "gross" | "deduction" | "net" — drives color. */
  kind: "gross" | "deduction" | "net";
}

export const FIXTURE_LOAD_MARGIN_WATERFALL: WaterfallStep[] = [
  { label: "Gross revenue", amountCents: 280_000, kind: "gross" },
  { label: "Fuel", amountCents: -72_000, kind: "deduction" },
  { label: "Driver pay", amountCents: -58_000, kind: "deduction" },
  { label: "Truck & maint.", amountCents: -42_000, kind: "deduction" },
  { label: "Insurance", amountCents: -18_000, kind: "deduction" },
  { label: "Overhead", amountCents: -24_000, kind: "deduction" },
  { label: "Net profit", amountCents: 66_000, kind: "net" },
];

// ─── Leak detector ──────────────────────────────────────────────────────────
// Each leak is a specific $-amount opportunity the dispatcher can act on.

export interface MoneyLeak {
  id: string;
  title: string;
  detail: string;
  amountCents: number;
  severity: "high" | "medium" | "low";
  /** Route or anchor we can link "fix it" to. */
  fixTo: string;
  fixLabel: string;
}

export const FIXTURE_MONEY_LEAKS: MoneyLeak[] = [
  {
    id: "leak_det",
    title: "Uncaptured detention",
    detail:
      "6 loads this month sat past their 2-hr free window without a detention invoice.",
    amountCents: 185_000,
    severity: "high",
    fixTo: "/admin/invoices/new",
    fixLabel: "Draft invoices",
  },
  {
    id: "leak_fuel",
    title: "Fuel spike on I-40 corridor",
    detail:
      "Avg $/gal paid in TN is 18¢ above your discount stations. 2 trucks fueled outside network.",
    amountCents: 42_000,
    severity: "medium",
    fixTo: "/admin/settings/integrations",
    fixLabel: "Review fuel stops",
  },
  {
    id: "leak_ontime",
    title: "On-time drop — Broker: XPO",
    detail:
      "On-time delivery to XPO loads fell from 92% to 78% this month. Risk of reduced load offers.",
    amountCents: 95_000,
    severity: "medium",
    fixTo: "/admin/brokers",
    fixLabel: "Open broker",
  },
  {
    id: "leak_idle",
    title: "Idle cost — T-301",
    detail:
      "T-301 idled 14.2 hours this week. At $4.50/hr fuel burn that's burning margin.",
    amountCents: 6_400,
    severity: "low",
    fixTo: "/admin/trucks",
    fixLabel: "Coach driver",
  },
];

// ─── Fleet on-time trend ────────────────────────────────────────────────────

export interface OnTimePoint {
  label: string;
  onTimePercent: number;
  industryBenchmark: number;
}

export const FIXTURE_FLEET_ONTIME_TREND: OnTimePoint[] = [
  { label: "Feb 3", onTimePercent: 86, industryBenchmark: 88 },
  { label: "Feb 10", onTimePercent: 88, industryBenchmark: 88 },
  { label: "Feb 17", onTimePercent: 87, industryBenchmark: 88 },
  { label: "Feb 24", onTimePercent: 89, industryBenchmark: 88 },
  { label: "Mar 3", onTimePercent: 90, industryBenchmark: 88 },
  { label: "Mar 10", onTimePercent: 91, industryBenchmark: 88 },
  { label: "Mar 17", onTimePercent: 90, industryBenchmark: 89 },
  { label: "Mar 24", onTimePercent: 92, industryBenchmark: 89 },
  { label: "Mar 31", onTimePercent: 91, industryBenchmark: 89 },
  { label: "Apr 7", onTimePercent: 92, industryBenchmark: 89 },
  { label: "Apr 14", onTimePercent: 91, industryBenchmark: 89 },
];

// ─── Section summary copy ───────────────────────────────────────────────────
// One-sentence concierge summaries that sit above each section. Typically
// derived server-side; hard-coded for the fixture.

export interface SectionSummary {
  section: "revenue" | "cash" | "ops" | "fleet";
  headline: string;
  sub?: string;
}

export const FIXTURE_SECTION_SUMMARIES: Record<
  PeriodId,
  Record<SectionSummary["section"], SectionSummary>
> = {
  week: {
    revenue: {
      section: "revenue",
      headline: "You earned $298K this week, +4.7% vs prior.",
      sub: "Best lane: KC → DAL. Strongest day: Friday.",
    },
    cash: {
      section: "cash",
      headline: "$365K outstanding, $150K over 60 days.",
      sub: "Ansonia flagged 1 broker (XPO) as slow-pay risk.",
    },
    ops: {
      section: "ops",
      headline: "12 loads in transit, 8 assigned, 3 drafted.",
      sub: "Jordan Reeves leads the board at 6 loads.",
    },
    fleet: {
      section: "fleet",
      headline: "5 trucks active, avg utilization 78%.",
      sub: "T-501 is underused — 1 load vs fleet avg of 3.",
    },
  },
  month: {
    revenue: {
      section: "revenue",
      headline: "You earned $1.12M this month, +13% vs prior.",
      sub: "Best lane: KC → DAL. Worst day: Tuesday dips.",
    },
    cash: {
      section: "cash",
      headline: "$365K outstanding, $150K over 60 days — biggest leak.",
      sub: "Avg days-to-pay is 29 (Net 30 target).",
    },
    ops: {
      section: "ops",
      headline: "48 loads completed, 92% on-time, up 3pts.",
      sub: "Jordan Reeves leads at 18 loads this month.",
    },
    fleet: {
      section: "fleet",
      headline: "5 trucks, avg 78% utilization (target 85%).",
      sub: "T-501 is bottom quartile — consider re-pairing.",
    },
  },
  quarter: {
    revenue: {
      section: "revenue",
      headline: "You earned $3.30M this quarter, +14.2% vs prior.",
      sub: "New lane: OMA → DEN trending up. Best month: Mar.",
    },
    cash: {
      section: "cash",
      headline: "A/R aging improved — overdue down 52% QoQ.",
      sub: "Terms renegotiated with 2 brokers.",
    },
    ops: {
      section: "ops",
      headline: "156 loads completed this quarter, 89% on-time.",
      sub: "Industry benchmark is 88%. You're ahead.",
    },
    fleet: {
      section: "fleet",
      headline: "5 trucks averaged 76% utilization this quarter.",
      sub: "T-101 logged the most miles. Consider rotation.",
    },
  },
};

// ─── Industry benchmarks (for comparison overlays) ──────────────────────────

export const FIXTURE_INDUSTRY_BENCHMARKS = {
  ratePerMileCents: 262, // industry avg for similar fleet size
  netMarginPercent: 14.5,
  deadheadPercent: 18.0,
  onTimePercent: 88,
  daysToPay: 35,
} as const;
