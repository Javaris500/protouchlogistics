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

export const FIXTURE_REVENUE_WEEKLY: RevenuePoint[] = [];

// ─── Revenue by broker (top brokers) ────────────────────────────────────────

export interface BrokerRevenue {
  brokerId: string;
  name: string;
  revenueCents: number;
  loadCount: number;
  avgDaysToPay: number;
}

export const FIXTURE_REVENUE_BY_BROKER: BrokerRevenue[] = [];

// ─── Rate per mile (30-day sparkline) ───────────────────────────────────────

export interface RatePerMilePoint {
  date: string;
  ratePerMileCents: number;
}

export const FIXTURE_RATE_PER_MILE: RatePerMilePoint[] = [];

export const FIXTURE_RATE_PER_MILE_CURRENT = 0;
export const FIXTURE_RATE_PER_MILE_TARGET_LOW = 0;
export const FIXTURE_RATE_PER_MILE_TARGET_HIGH = 0;

// ─── Revenue by lane (top lanes) ────────────────────────────────────────────

export interface LaneRevenue {
  origin: string;
  destination: string;
  revenueCents: number;
  loadCount: number;
  avgRatePerMileCents: number;
  sparkline: number[]; // 8 weekly data points
}

export const FIXTURE_LANES: LaneRevenue[] = [];

// ─── Invoice aging ──────────────────────────────────────────────────────────

export interface InvoiceAging {
  bucket: string;
  amountCents: number;
  count: number;
  color: string;
}

export const FIXTURE_INVOICE_AGING: InvoiceAging[] = [];

// ─── Days to pay by broker ──────────────────────────────────────────────────

export interface BrokerDaysToPay {
  name: string;
  avgDays: number;
  terms: number; // net days
}

export const FIXTURE_BROKER_DAYS_TO_PAY: BrokerDaysToPay[] = [];

// ─── Load status funnel ─────────────────────────────────────────────────────

export interface FunnelStage {
  stage: string;
  count: number;
}

export const FIXTURE_LOAD_FUNNEL: FunnelStage[] = [];

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

export const FIXTURE_DRIVER_LEADERBOARD: DriverStats[] = [];

// ─── Truck utilization (loads per week) ─────────────────────────────────────

export interface TruckWeek {
  truck: string;
  weeks: number[]; // 8 weeks of load counts
}

export const FIXTURE_TRUCK_UTILIZATION: TruckWeek[] = [];

// ─── Period variants ────────────────────────────────────────────────────────
// Revenue series per period selector. Week = last 7 daily points, Month =
// last 11 weekly points, Quarter = last 12 monthly points.

export type PeriodId = "week" | "month" | "quarter";

export const FIXTURE_REVENUE_BY_PERIOD: Record<PeriodId, RevenuePoint[]> = {
  week: [],
  month: [],
  quarter: [],
};

// ─── KPI row data ───────────────────────────────────────────────────────────

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
  week: [],
  month: [],
  quarter: [],
};

// ─── Cost per mile stacked breakdown ────────────────────────────────────────

export interface CostPerMilePoint {
  label: string;
  fuelCents: number;
  driverCents: number;
  truckCents: number;
  insuranceCents: number;
}

export const FIXTURE_COST_PER_MILE: CostPerMilePoint[] = [];

export const FIXTURE_COST_PER_MILE_CURRENT = 0;
export const FIXTURE_RPM_MINUS_CPM_CURRENT =
  FIXTURE_RATE_PER_MILE_CURRENT - FIXTURE_COST_PER_MILE_CURRENT;

// ─── Deadhead % trend ───────────────────────────────────────────────────────

export interface DeadheadPoint {
  label: string;
  deadheadPercent: number;
}

export const FIXTURE_DEADHEAD_TREND: DeadheadPoint[] = [];

// ─── Broker concentration (donut) ───────────────────────────────────────────

export interface BrokerShare {
  name: string;
  percent: number;
  revenueCents: number;
  color: string;
}

export const FIXTURE_BROKER_CONCENTRATION: BrokerShare[] = [];

// ─── Load margin waterfall ──────────────────────────────────────────────────

export interface WaterfallStep {
  label: string;
  /** Positive for the starting point and the net result, negative for
   *  deductions. Always cents. */
  amountCents: number;
  /** "gross" | "deduction" | "net" — drives color. */
  kind: "gross" | "deduction" | "net";
}

export const FIXTURE_LOAD_MARGIN_WATERFALL: WaterfallStep[] = [];

// ─── Leak detector ──────────────────────────────────────────────────────────

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

export const FIXTURE_MONEY_LEAKS: MoneyLeak[] = [];

// ─── Fleet on-time trend ────────────────────────────────────────────────────

export interface OnTimePoint {
  label: string;
  onTimePercent: number;
  industryBenchmark: number;
}

export const FIXTURE_FLEET_ONTIME_TREND: OnTimePoint[] = [];

// ─── Section summary copy ───────────────────────────────────────────────────

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
    revenue: { section: "revenue", headline: "" },
    cash: { section: "cash", headline: "" },
    ops: { section: "ops", headline: "" },
    fleet: { section: "fleet", headline: "" },
  },
  month: {
    revenue: { section: "revenue", headline: "" },
    cash: { section: "cash", headline: "" },
    ops: { section: "ops", headline: "" },
    fleet: { section: "fleet", headline: "" },
  },
  quarter: {
    revenue: { section: "revenue", headline: "" },
    cash: { section: "cash", headline: "" },
    ops: { section: "ops", headline: "" },
    fleet: { section: "fleet", headline: "" },
  },
};

// ─── Industry benchmarks (for comparison overlays) ──────────────────────────

export const FIXTURE_INDUSTRY_BENCHMARKS = {
  ratePerMileCents: 0,
  netMarginPercent: 0,
  deadheadPercent: 0,
  onTimePercent: 0,
  daysToPay: 0,
} as const;
