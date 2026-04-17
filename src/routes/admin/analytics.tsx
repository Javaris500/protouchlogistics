import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Gauge,
  Layers,
  LineChart as LineChartIcon,
  MapPin,
  PiggyBank,
  Route as RouteIcon,
  Target,
  TrendingUp,
  Truck,
  Users,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ChartExplanationContent } from "@/components/charts/ChartExplanation";
import { ChartCard, ExportButton } from "@/components/charts/ChartCard";
import {
  AXIS_STYLE,
  CHART_COLORS,
  TOOLTIP_STYLE,
} from "@/components/charts/chart-theme";
import { KpiHeroCard } from "@/components/charts/KpiHeroCard";
import { Sparkline } from "@/components/charts/Sparkline";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FIXTURE_BROKER_CONCENTRATION,
  FIXTURE_COST_PER_MILE,
  FIXTURE_COST_PER_MILE_CURRENT,
  FIXTURE_DEADHEAD_TREND,
  FIXTURE_DRIVER_LEADERBOARD,
  FIXTURE_FLEET_ONTIME_TREND,
  FIXTURE_INDUSTRY_BENCHMARKS,
  FIXTURE_KPIS_BY_PERIOD,
  FIXTURE_LANES,
  FIXTURE_LOAD_FUNNEL,
  FIXTURE_LOAD_MARGIN_WATERFALL,
  FIXTURE_RATE_PER_MILE,
  FIXTURE_RATE_PER_MILE_CURRENT,
  FIXTURE_RATE_PER_MILE_TARGET_HIGH,
  FIXTURE_RATE_PER_MILE_TARGET_LOW,
  FIXTURE_REVENUE_BY_BROKER,
  FIXTURE_REVENUE_BY_PERIOD,
  FIXTURE_RPM_MINUS_CPM_CURRENT,
  FIXTURE_SECTION_SUMMARIES,
  FIXTURE_TRUCK_UTILIZATION,
  type KpiDatum,
  type PeriodId,
  type RevenuePoint,
} from "@/lib/fixtures/analytics";
import { formatCompactCents, formatMoneyCents } from "@/lib/format";
import { downloadCsv, toCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsPage,
});

// KPIs shown in the hero row. Deadhead and Overdue are still in the
// fixture but don't earn a hero slot — Deadhead has its own chart below,
// and Overdue lived in Cash Flow which is intentionally off this page.
const HERO_KPI_IDS: KpiDatum["id"][] = ["revenue", "margin", "rpm", "onTime"];

function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodId>("month");

  const revenueData = useMemo(
    () => FIXTURE_REVENUE_BY_PERIOD[period],
    [period],
  );
  const heroKpis = useMemo(
    () =>
      FIXTURE_KPIS_BY_PERIOD[period].filter((k) => HERO_KPI_IDS.includes(k.id)),
    [period],
  );
  const summaries = useMemo(() => FIXTURE_SECTION_SUMMARIES[period], [period]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Insight"
        title="Analytics"
        description="Am I making money, and where is money leaking?"
        actions={<PeriodToggle value={period} onChange={setPeriod} />}
      />

      {/* ─────────────── KPI HERO ROW ─────────────── */}
      <KpiRow kpis={heroKpis} />

      {/* ─────────────── SECTION 1: REVENUE ─────────────── */}
      <section className="flex flex-col gap-4">
        <SectionHeader
          label="Revenue"
          summary={summaries.revenue.headline}
          sub={summaries.revenue.sub}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <RevenueOverTimeCard data={revenueData} period={period} />
          <RatePerMileCard />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <RevenueByBrokerCard />
          <RevenueByLaneCard />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <CostPerMileCard />
          <DeadheadTrendCard />
        </div>
        {/* Removed: BrokerConcentrationCard + MarginWaterfallCard.
            Broker concentration overlaps with "Revenue by broker"; the
            margin waterfall is information-dense and most of its signal is
            already surfaced by Rate per mile + Cost per mile above. Cutting
            them keeps the Revenue section scannable in a single glance. */}
      </section>

      {/* ─────────────── SECTION 2: OPERATIONS ─────────────── */}
      <section className="flex flex-col gap-4">
        <SectionHeader
          label="Operations"
          summary={summaries.ops.headline}
          sub={summaries.ops.sub}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <LoadFunnelCard />
          <DriverLeaderboardCard />
        </div>

        <FleetOnTimeTrendCard />
      </section>

      {/* ─────────────── SECTION 3: FLEET ─────────────── */}
      <section className="flex flex-col gap-4">
        <SectionHeader
          label="Fleet"
          summary={summaries.fleet.headline}
          sub={summaries.fleet.sub}
        />

        <TruckUtilizationCard />
      </section>
    </div>
  );
}

// ─── Period toggle ──────────────────────────────────────────────────────────

function PeriodToggle({
  value,
  onChange,
}: {
  value: PeriodId;
  onChange: (p: PeriodId) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Period"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full",
        "border border-[var(--border)] bg-[var(--surface)] p-0.5",
        "shadow-[var(--shadow-sm)]",
      )}
    >
      {(["week", "month", "quarter"] as const).map((p) => {
        const active = p === value;
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(p)}
            className={cn(
              "inline-flex h-7 items-center rounded-full px-3",
              "text-[12px] font-semibold capitalize tracking-tight",
              "transition-colors duration-150",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30",
              active
                ? "bg-[var(--background)] text-[var(--foreground)] shadow-[var(--shadow-sm)]"
                : "text-muted-foreground hover:text-[var(--foreground)]",
            )}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}

// ─── KPI row ────────────────────────────────────────────────────────────────

function KpiRow({ kpis }: { kpis: KpiDatum[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k) => (
        <KpiHeroCard
          key={k.id}
          label={k.label}
          value={formatKpiValue(k)}
          delta={formatKpiDelta(k)}
          trend={k.delta === 0 ? "flat" : k.delta > 0 ? "up" : "down"}
          upIsGood={k.upIsGood}
          deltaLabel={k.deltaLabel}
          sparkline={k.sparkline}
          icon={kpiIcon(k.id)}
          hint={kpiHint(k.id)}
          explanation={kpiExplanation(k.id)}
        />
      ))}
    </div>
  );
}

function formatKpiValue(k: KpiDatum): string {
  switch (k.id) {
    case "revenue":
    case "overdue":
      return formatCompactCents(k.value);
    case "margin":
    case "deadhead":
    case "onTime":
      return `${k.value.toFixed(1)}%`;
    case "rpm":
      return `$${(k.value / 100).toFixed(2)}`;
  }
}

function formatKpiDelta(k: KpiDatum): string {
  const sign = k.delta > 0 ? "+" : k.delta < 0 ? "−" : "";
  const abs = Math.abs(k.delta);
  switch (k.id) {
    case "revenue":
    case "overdue":
      return `${sign}${formatCompactCents(abs)}`;
    case "margin":
    case "deadhead":
    case "onTime":
      return `${sign}${abs.toFixed(1)}pts`;
    case "rpm":
      return `${sign}$${(abs / 100).toFixed(2)}`;
  }
}

function kpiIcon(id: KpiDatum["id"]) {
  switch (id) {
    case "revenue":
      return <DollarSign />;
    case "margin":
      return <PiggyBank />;
    case "rpm":
      return <Gauge />;
    case "deadhead":
      return <RouteIcon />;
    case "onTime":
      return <Clock />;
    case "overdue":
      return <DollarSign />;
  }
}

function kpiHint(id: KpiDatum["id"]): string {
  switch (id) {
    case "revenue":
      return "Total gross revenue for the selected period";
    case "margin":
      return "Net profit as a percent of revenue";
    case "rpm":
      return "Average rate per loaded mile";
    case "deadhead":
      return "Empty miles as a percent of total miles — lower is better";
    case "onTime":
      return "Percent of loads delivered within the committed window";
    case "overdue":
      return "A/R aged beyond payment terms — lower is better";
  }
}

function kpiExplanation(id: KpiDatum["id"]): ChartExplanationContent {
  switch (id) {
    case "revenue":
      return {
        title: "Revenue",
        what: "Total money collected from brokers for loads in the selected period. Before any costs come out.",
        howToRead: [
          "Bigger is better.",
          "The small trend line shows how each day or week compared.",
          "Compare the green up-arrow to the prior period — that's growth.",
        ],
        watchFor:
          "A flat or down arrow when your load count went up usually means rates dropped. Time to renegotiate.",
      };
    case "margin":
      return {
        title: "Net margin",
        what: "How many cents out of every dollar you actually keep after fuel, driver pay, the truck, and insurance.",
        howToRead: [
          "Higher is better.",
          "A healthy small-carrier margin is 12–18%.",
          "Flip to Cost-per-mile below to see where margin goes.",
        ],
        watchFor:
          "Margin dropping while revenue rises — you're busy but not richer. Usually a cost problem.",
      };
    case "rpm":
      return {
        title: "Rate per mile",
        what: "The average dollar amount brokers paid you for each loaded mile. Your price.",
        howToRead: [
          "Higher means you priced well.",
          "The Rate-per-mile chart shows a target band — stay inside it.",
          "Compare to market averages (DAT RateView).",
        ],
        watchFor:
          "A number below $2.40 on most lanes means you're leaving money on the table or getting cheap freight.",
      };
    case "onTime":
      return {
        title: "On-time %",
        what: "Percent of loads delivered inside the committed window. Your reputation with brokers.",
        howToRead: [
          "90%+ is the goal for dispatcher excellence.",
          "80–90% means you're OK but losing preferred status.",
          "Below 80% and brokers start offering you worse loads.",
        ],
        watchFor:
          "A drop of 5+ points over a month — usually HOS miscalculations or a problem driver.",
      };
    case "deadhead":
      return {
        title: "Deadhead %",
        what: "Percent of your miles driven empty. Every empty mile costs $1.50–$2 without earning a cent.",
        howToRead: [
          "Lower is better.",
          "Industry average is ~18%. Below 15% is excellent.",
          "Each 1% drop is ~$200/truck/month.",
        ],
        watchFor:
          "Creeping up? You need better backhaul planning. DAT integration solves this.",
      };
    case "overdue":
      return {
        title: "Overdue A/R",
        what: "Money brokers owe you that's past the agreed payment terms.",
        howToRead: [
          "Lower is better.",
          "Terms are usually Net 30.",
          "90+ days overdue is a collections problem.",
        ],
        watchFor:
          "One broker making up most of it — that's your next phone call.",
      };
  }
}

// ─── Section header with summary ────────────────────────────────────────────

function SectionHeader({
  label,
  summary,
  sub,
}: {
  label: string;
  summary: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </h2>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
        <p className="text-sm font-medium text-foreground">{summary}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Revenue over time ──────────────────────────────────────────────────────

function RevenueOverTimeCard({
  data,
  period,
}: {
  data: RevenuePoint[];
  period: PeriodId;
}) {
  const latestLabel = data[data.length - 1]?.label;
  const periodWord =
    period === "week"
      ? "today"
      : period === "month"
        ? "this week"
        : "this month";

  function exportCsv() {
    const csv = toCsv(
      data.map((r) => ({
        period: r.label,
        revenue: (r.revenueCents / 100).toFixed(2),
        priorPeriod: (r.priorPeriodCents / 100).toFixed(2),
        loads: r.loads,
      })),
      [
        { key: "period", header: "Period" },
        { key: "revenue", header: "Revenue ($)" },
        { key: "priorPeriod", header: "Prior period ($)" },
        { key: "loads", header: "Loads" },
      ],
    );
    downloadCsv(`revenue-${period}.csv`, csv);
  }

  return (
    <ChartCard
      title="Revenue over time"
      subtitle="Revenue vs. prior period"
      icon={<TrendingUp />}
      explanation={{
        title: "Revenue over time",
        what: "Shows your revenue each week (or day/month, depending on the toggle). The dashed gray line is the same chart from the period before.",
        howToRead: [
          "Solid orange is now. Dashed gray is the prior period.",
          "If orange is above gray, you're ahead of last period.",
          "The marker shows which point is “now”.",
        ],
        watchFor:
          "A dip near the end that last period didn't have — usually a broker slow-booked.",
      }}
      actions={<ExportButton onClick={exportCsv} />}
      className="xl:col-span-2"
    >
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 4, bottom: 0, left: -12 }}
        >
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.primaryGradientStart} />
              <stop offset="100%" stopColor={CHART_COLORS.primaryGradientEnd} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_COLORS.grid}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatCompactCents(v)}
            dx={-4}
          />
          {latestLabel && (
            <ReferenceLine
              x={latestLabel}
              stroke={CHART_COLORS.primary}
              strokeDasharray="4 3"
              strokeOpacity={0.6}
              label={
                <Label
                  value={periodWord}
                  position="insideTopRight"
                  fill={CHART_COLORS.primary}
                  fontSize={10}
                  fontWeight={600}
                />
              }
            />
          )}
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v, name) => [
              formatMoneyCents(Number(v) || 0),
              name === "revenueCents" ? "Revenue" : "Prior period",
            ]}
            labelStyle={{ fontWeight: 600, marginBottom: 4 }}
          />
          <Area
            type="monotone"
            dataKey="priorPeriodCents"
            stroke={CHART_COLORS.prior}
            strokeWidth={1.5}
            strokeDasharray="6 4"
            fill={CHART_COLORS.priorFaint}
            dot={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="revenueCents"
            stroke={CHART_COLORS.primary}
            strokeWidth={2.5}
            fill="url(#revGrad)"
            dot={false}
            activeDot={{
              r: 5,
              fill: CHART_COLORS.primary,
              stroke: "#fff",
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Rate per mile card ─────────────────────────────────────────────────────

function RatePerMileCard() {
  const deltaCents = 7;
  const inTarget =
    FIXTURE_RATE_PER_MILE_CURRENT >= FIXTURE_RATE_PER_MILE_TARGET_LOW &&
    FIXTURE_RATE_PER_MILE_CURRENT <= FIXTURE_RATE_PER_MILE_TARGET_HIGH;

  return (
    <ChartCard
      title="Rate per mile"
      subtitle="30-day trend with market-rate target band"
      icon={<Gauge />}
      explanation={{
        title: "Rate per mile",
        what: "How much brokers paid you per loaded mile on average, over the last 30 days.",
        howToRead: [
          "The two dashed green lines are your target band.",
          "Staying inside means you're priced with the market.",
          "Above the top line: premium rates. Below: underpriced.",
        ],
        watchFor:
          "Dropping below the band for more than a week — time to renegotiate or refuse cheap loads.",
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-4xl font-bold tracking-tight tabular-nums">
            ${(FIXTURE_RATE_PER_MILE_CURRENT / 100).toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground">/mi</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="success" className="gap-1">
            <ArrowUpRight className="size-3" />
            +${(deltaCents / 100).toFixed(2)}
          </Badge>
          <span className="text-muted-foreground">vs. prior 30d</span>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart
            data={FIXTURE_RATE_PER_MILE}
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="rpmGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={CHART_COLORS.primaryGradientStart}
                />
                <stop
                  offset="100%"
                  stopColor={CHART_COLORS.primaryGradientEnd}
                />
              </linearGradient>
            </defs>
            <ReferenceLine
              y={FIXTURE_RATE_PER_MILE_TARGET_LOW}
              stroke={CHART_COLORS.success}
              strokeDasharray="4 4"
              strokeOpacity={0.4}
            />
            <ReferenceLine
              y={FIXTURE_RATE_PER_MILE_TARGET_HIGH}
              stroke={CHART_COLORS.success}
              strokeDasharray="4 4"
              strokeOpacity={0.4}
            />
            <Area
              type="monotone"
              dataKey="ratePerMileCents"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              fill="url(#rpmGrad)"
              dot={false}
              isAnimationActive={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v) => [
                `$${((Number(v) || 0) / 100).toFixed(2)}/mi`,
                "Rate",
              ]}
              labelFormatter={(l) => String(l ?? "")}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            Target: ${(FIXTURE_RATE_PER_MILE_TARGET_LOW / 100).toFixed(2)} – $
            {(FIXTURE_RATE_PER_MILE_TARGET_HIGH / 100).toFixed(2)}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1",
              inTarget ? "text-[var(--success)]" : "text-[var(--warning)]",
            )}
          >
            {inTarget ? (
              <CheckCircle2 className="size-3" />
            ) : (
              <AlertCircle className="size-3" />
            )}
            {inTarget ? "Within target" : "Outside target"}
          </span>
        </div>
      </div>
    </ChartCard>
  );
}

// ─── Revenue by broker ──────────────────────────────────────────────────────

function RevenueByBrokerCard() {
  function exportCsv() {
    const csv = toCsv(
      FIXTURE_REVENUE_BY_BROKER.map((b) => ({
        broker: b.name,
        revenue: (b.revenueCents / 100).toFixed(2),
        loads: b.loadCount,
        avgDays: b.avgDaysToPay,
      })),
      [
        { key: "broker", header: "Broker" },
        { key: "revenue", header: "Revenue ($)" },
        { key: "loads", header: "Loads" },
        { key: "avgDays", header: "Avg days to pay" },
      ],
    );
    downloadCsv("revenue-by-broker.csv", csv);
  }
  return (
    <ChartCard
      title="Revenue by broker"
      subtitle="Top brokers by total revenue"
      icon={<Building2 />}
      explanation={{
        title: "Revenue by broker",
        what: "Which brokers paid you the most in this period. Your top customers.",
        howToRead: [
          "Bars are ranked longest = most revenue.",
          "Darker shade = bigger slice of the total.",
          "Click a bar to drill into that broker (coming soon).",
        ],
        watchFor:
          "One bar dwarfing the rest. That broker has leverage over your business — diversify.",
      }}
      actions={<ExportButton onClick={exportCsv} />}
    >
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={FIXTURE_REVENUE_BY_BROKER}
          layout="vertical"
          margin={{ top: 0, right: 4, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_COLORS.grid}
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatCompactCents(v)}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ ...AXIS_STYLE, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={140}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v) => [formatMoneyCents(Number(v) || 0), "Revenue"]}
          />
          <Bar
            dataKey="revenueCents"
            fill={CHART_COLORS.primary}
            radius={[0, 4, 4, 0]}
            barSize={20}
            isAnimationActive={false}
          >
            {FIXTURE_REVENUE_BY_BROKER.map((_, i) => (
              <Cell
                key={i}
                fill={CHART_COLORS.primary}
                fillOpacity={1 - i * 0.12}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Revenue by lane ────────────────────────────────────────────────────────

function RevenueByLaneCard() {
  function exportCsv() {
    const csv = toCsv(
      FIXTURE_LANES.map((l) => ({
        origin: l.origin,
        destination: l.destination,
        revenue: (l.revenueCents / 100).toFixed(2),
        loads: l.loadCount,
        rpm: (l.avgRatePerMileCents / 100).toFixed(2),
      })),
      [
        { key: "origin", header: "Origin" },
        { key: "destination", header: "Destination" },
        { key: "revenue", header: "Revenue ($)" },
        { key: "loads", header: "Loads" },
        { key: "rpm", header: "Rate/mile ($)" },
      ],
    );
    downloadCsv("revenue-by-lane.csv", csv);
  }
  return (
    <ChartCard
      title="Revenue by lane"
      subtitle="Top origin → destination pairs"
      icon={<MapPin />}
      explanation={{
        title: "Revenue by lane",
        what: "Your most valuable origin-to-destination routes. The little line shows the weekly trend for each.",
        howToRead: [
          "Ranked by total revenue, most at top.",
          "Line going up-and-right = lane is getting stronger.",
          "The $/mi number tells you the price on that lane.",
        ],
        watchFor:
          "A high-revenue lane with a falling trend line — you may lose it soon. Lock in the customer.",
      }}
      actions={<ExportButton onClick={exportCsv} />}
    >
      <div className="flex flex-col divide-y divide-border">
        {FIXTURE_LANES.map((lane, i) => (
          <div
            key={`${lane.origin}-${lane.destination}`}
            className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            <span className="w-5 text-center text-[11px] font-semibold tabular-nums text-muted-foreground">
              {i + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-medium">
                {lane.origin} <span className="text-muted-foreground">→</span>{" "}
                {lane.destination}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {lane.loadCount} loads · $
                {(lane.avgRatePerMileCents / 100).toFixed(2)}/mi
              </span>
            </div>
            <div className="hidden sm:block">
              <Sparkline
                values={lane.sparkline}
                width={72}
                height={24}
                stroke={CHART_COLORS.primary}
                fill={CHART_COLORS.primaryFaint}
                showEndDot
              />
            </div>
            <span className="w-16 text-right font-mono text-sm font-medium tabular-nums">
              {formatCompactCents(lane.revenueCents)}
            </span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

// ─── Cost per mile (stacked area) ───────────────────────────────────────────

function CostPerMileCard() {
  const marginPerMile = FIXTURE_RPM_MINUS_CPM_CURRENT;
  const benchmark = FIXTURE_INDUSTRY_BENCHMARKS.ratePerMileCents - 175;

  function exportCsv() {
    const csv = toCsv(
      FIXTURE_COST_PER_MILE.map((p) => ({
        period: p.label,
        fuel: (p.fuelCents / 100).toFixed(2),
        driver: (p.driverCents / 100).toFixed(2),
        truck: (p.truckCents / 100).toFixed(2),
        insurance: (p.insuranceCents / 100).toFixed(2),
        total: (
          (p.fuelCents + p.driverCents + p.truckCents + p.insuranceCents) /
          100
        ).toFixed(2),
      })),
      [
        { key: "period", header: "Period" },
        { key: "fuel", header: "Fuel ($/mi)" },
        { key: "driver", header: "Driver ($/mi)" },
        { key: "truck", header: "Truck ($/mi)" },
        { key: "insurance", header: "Insurance ($/mi)" },
        { key: "total", header: "Total CPM ($/mi)" },
      ],
    );
    downloadCsv("cost-per-mile.csv", csv);
  }

  return (
    <ChartCard
      title="Cost per mile"
      subtitle={`$${(FIXTURE_COST_PER_MILE_CURRENT / 100).toFixed(2)}/mi total · $${(marginPerMile / 100).toFixed(2)}/mi margin`}
      icon={<Layers />}
      explanation={{
        title: "Cost per mile",
        what: "Every mile your trucks drive costs money. This chart splits that cost into fuel, driver pay, truck, and insurance.",
        howToRead: [
          "Stacked colors are each cost category.",
          "Taller stack = more expensive to operate.",
          "Rate-per-mile minus this = your margin per mile.",
        ],
        watchFor: `Fuel climbing while other bands hold steady — a fuel-card deal can save 20–40¢/gal. Industry benchmark: ~$${(benchmark / 100).toFixed(2)}/mi.`,
      }}
      actions={<ExportButton onClick={exportCsv} />}
    >
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart
          data={FIXTURE_COST_PER_MILE}
          margin={{ top: 8, right: 4, bottom: 0, left: -12 }}
          stackOffset="none"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_COLORS.grid}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${(v / 100).toFixed(2)}`}
            dx={-4}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v, name) => [
              `$${((Number(v) || 0) / 100).toFixed(2)}/mi`,
              costNiceName(String(name)),
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }}
            iconType="square"
            iconSize={8}
          />
          <Area
            type="monotone"
            stackId="cpm"
            dataKey="fuelCents"
            name="Fuel"
            fill={CHART_COLORS.cost}
            fillOpacity={0.8}
            stroke={CHART_COLORS.cost}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            stackId="cpm"
            dataKey="driverCents"
            name="Driver pay"
            fill={CHART_COLORS.costLight}
            fillOpacity={0.75}
            stroke={CHART_COLORS.costLight}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            stackId="cpm"
            dataKey="truckCents"
            name="Truck & maint."
            fill="#7fd3db"
            fillOpacity={0.7}
            stroke="#7fd3db"
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            stackId="cpm"
            dataKey="insuranceCents"
            name="Insurance"
            fill="#b4e4e9"
            fillOpacity={0.7}
            stroke="#b4e4e9"
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function costNiceName(key: string): string {
  switch (key) {
    case "fuelCents":
    case "Fuel":
      return "Fuel";
    case "driverCents":
    case "Driver pay":
      return "Driver pay";
    case "truckCents":
    case "Truck & maint.":
      return "Truck & maint.";
    case "insuranceCents":
    case "Insurance":
      return "Insurance";
    default:
      return key;
  }
}

// ─── Deadhead % trend ───────────────────────────────────────────────────────

function DeadheadTrendCard() {
  const current =
    FIXTURE_DEADHEAD_TREND[FIXTURE_DEADHEAD_TREND.length - 1]
      ?.deadheadPercent ?? 0;
  const first = FIXTURE_DEADHEAD_TREND[0]?.deadheadPercent ?? 0;
  const totalDelta = current - first;
  const benchmark = FIXTURE_INDUSTRY_BENCHMARKS.deadheadPercent;

  function exportCsv() {
    const csv = toCsv(
      FIXTURE_DEADHEAD_TREND.map((d) => ({
        period: d.label,
        deadheadPercent: d.deadheadPercent,
      })),
      [
        { key: "period", header: "Period" },
        { key: "deadheadPercent", header: "Deadhead %" },
      ],
    );
    downloadCsv("deadhead-trend.csv", csv);
  }

  return (
    <ChartCard
      title="Deadhead %"
      subtitle={`${current.toFixed(1)}% empty miles · ${totalDelta <= 0 ? "improved" : "worsened"} ${Math.abs(totalDelta).toFixed(1)}pts`}
      icon={<RouteIcon />}
      explanation={{
        title: "Deadhead %",
        what: "Percent of miles you drove empty (between dropping one load and picking up the next). Every empty mile costs money without earning any.",
        howToRead: [
          "Lower is better.",
          "The dashed gray line is the industry average.",
          "A steady downward slope means dispatch is working.",
        ],
        watchFor: `Over ${benchmark}% means the fleet is empty too often. A load-board integration can fix this.`,
      }}
      actions={<ExportButton onClick={exportCsv} />}
    >
      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          data={FIXTURE_DEADHEAD_TREND}
          margin={{ top: 8, right: 4, bottom: 0, left: -12 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_COLORS.grid}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
            domain={["auto", "auto"]}
            dx={-4}
          />
          <ReferenceLine
            y={benchmark}
            stroke={CHART_COLORS.muted}
            strokeDasharray="6 3"
            label={{
              value: `Industry ${benchmark}%`,
              position: "insideTopRight",
              fill: CHART_COLORS.muted,
              fontSize: 10,
            }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v) => [`${Number(v).toFixed(1)}%`, "Deadhead"]}
          />
          <Line
            type="monotone"
            dataKey="deadheadPercent"
            stroke={CHART_COLORS.cost}
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
              fill: CHART_COLORS.cost,
              stroke: "#fff",
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Broker concentration donut ─────────────────────────────────────────────

function BrokerConcentrationCard() {
  const top = FIXTURE_BROKER_CONCENTRATION[0];
  const total = FIXTURE_BROKER_CONCENTRATION.reduce(
    (s, b) => s + b.revenueCents,
    0,
  );
  const topPct = top ? top.percent : 0;
  const isRisky = topPct > 30;

  return (
    <ChartCard
      title="Broker concentration"
      subtitle={`Top broker is ${topPct}% of revenue · ${isRisky ? "concentration risk" : "healthy mix"}`}
      icon={<Coins />}
      explanation={{
        title: "Broker concentration",
        what: "How spread out your revenue is across brokers. A big slice from one broker is risky — losing them hurts a lot.",
        howToRead: [
          "Each color slice is a broker's share of total revenue.",
          "Aim for no single slice over 30%.",
          "The center number is total revenue across all brokers.",
        ],
        watchFor:
          "Top slice above 30% — time to build relationships with more brokers, or go direct-to-shipper.",
      }}
    >
      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={FIXTURE_BROKER_CONCENTRATION}
                dataKey="percent"
                nameKey="name"
                innerRadius={54}
                outerRadius={86}
                paddingAngle={2}
                stroke="var(--card)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {FIXTURE_BROKER_CONCENTRATION.map((b) => (
                  <Cell key={b.name} fill={b.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v, _name, item) => {
                  const name = (item?.payload as { name?: string })?.name ?? "";
                  return [`${v}%`, name];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total
            </span>
            <span className="font-mono text-lg font-bold tabular-nums">
              {formatCompactCents(total)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {FIXTURE_BROKER_CONCENTRATION.map((b) => (
            <div
              key={b.name}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: b.color }}
                />
                <span className="truncate text-xs font-medium">{b.name}</span>
              </div>
              <div className="flex items-center gap-2 text-xs tabular-nums">
                <span className="font-mono font-semibold">{b.percent}%</span>
                <span className="text-muted-foreground">
                  {formatCompactCents(b.revenueCents)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

// ─── Margin waterfall ───────────────────────────────────────────────────────

function MarginWaterfallCard() {
  const start =
    FIXTURE_LOAD_MARGIN_WATERFALL.find((s) => s.kind === "gross")
      ?.amountCents ?? 0;
  const net =
    FIXTURE_LOAD_MARGIN_WATERFALL.find((s) => s.kind === "net")?.amountCents ??
    0;

  type Row = {
    label: string;
    kind: "gross" | "deduction" | "net";
    amount: number;
    startAt: number;
    width: number;
  };
  const rows: Row[] = [];
  let running = 0;
  for (const step of FIXTURE_LOAD_MARGIN_WATERFALL) {
    if (step.kind === "gross") {
      rows.push({
        label: step.label,
        kind: "gross",
        amount: step.amountCents,
        startAt: 0,
        width: step.amountCents,
      });
      running = step.amountCents;
    } else if (step.kind === "deduction") {
      const nextRunning = running + step.amountCents;
      rows.push({
        label: step.label,
        kind: "deduction",
        amount: step.amountCents,
        startAt: nextRunning,
        width: -step.amountCents,
      });
      running = nextRunning;
    } else {
      rows.push({
        label: step.label,
        kind: "net",
        amount: step.amountCents,
        startAt: 0,
        width: step.amountCents,
      });
    }
  }

  const marginPct = ((net / start) * 100).toFixed(1);

  return (
    <ChartCard
      title="Load margin waterfall"
      subtitle={`Avg load nets ${formatCompactCents(net)} at ${marginPct}% margin`}
      icon={<BarChart3 />}
      explanation={{
        title: "Load margin waterfall",
        what: "What happens to the money on an average load: start with gross revenue, subtract each cost, end with net profit.",
        howToRead: [
          "The orange bar at top is gross revenue.",
          "Each teal bar below is a cost that comes out.",
          "The green bar at the bottom is what you keep.",
        ],
        watchFor:
          "A cost bar that's unusually large — the biggest levers are fuel (route optimization) and deadhead (load sourcing).",
      }}
    >
      <div className="flex flex-col gap-1.5">
        {rows.map((r) => {
          const leftPct = (r.startAt / start) * 100;
          const widthPct = Math.max((r.width / start) * 100, 2);
          const bg =
            r.kind === "gross"
              ? CHART_COLORS.primary
              : r.kind === "net"
                ? CHART_COLORS.success
                : CHART_COLORS.cost;
          return (
            <div key={r.label} className="flex items-center gap-3">
              <span className="w-28 text-right text-xs font-medium text-muted-foreground">
                {r.label}
              </span>
              <div className="relative h-7 flex-1">
                <div
                  className="absolute inset-y-0 rounded-[var(--radius-sm)]"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    backgroundColor: bg,
                    opacity: r.kind === "deduction" ? 0.7 : 1,
                  }}
                  title={formatMoneyCents(r.amount)}
                />
              </div>
              <span
                className={cn(
                  "w-20 text-right font-mono text-xs font-semibold tabular-nums",
                  r.kind === "deduction"
                    ? "text-muted-foreground"
                    : "text-foreground",
                )}
              >
                {r.kind === "deduction"
                  ? `−${formatCompactCents(-r.amount)}`
                  : formatCompactCents(r.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

// ─── Load funnel ────────────────────────────────────────────────────────────

function LoadFunnelCard() {
  const maxCount = Math.max(...FIXTURE_LOAD_FUNNEL.map((s) => s.count));
  return (
    <ChartCard
      title="Load status funnel"
      subtitle="Where loads are in the pipeline right now"
      icon={<LineChartIcon />}
      explanation={{
        title: "Load status funnel",
        what: "A snapshot of every active load grouped by stage — from Draft at the top to Completed at the bottom.",
        howToRead: [
          "Wider bar = more loads in that stage.",
          "Unusual bulges hint at where loads get stuck.",
          "Completed bar over time shows throughput.",
        ],
        watchFor:
          "A bulge at Assigned or In Transit — often means missing POD/paperwork holding up billing.",
      }}
    >
      <div className="flex flex-col gap-2">
        {FIXTURE_LOAD_FUNNEL.map((stage, i) => {
          const pct = (stage.count / maxCount) * 100;
          return (
            <div key={stage.stage} className="flex items-center gap-3">
              <span className="w-20 text-right text-xs font-medium text-muted-foreground">
                {stage.stage}
              </span>
              <div className="flex h-7 flex-1 items-center">
                <div
                  className="flex h-full items-center rounded-r-[var(--radius-sm)] px-2"
                  style={{
                    width: `${Math.max(pct, 8)}%`,
                    backgroundColor: CHART_COLORS.primary,
                    opacity: 0.3 + (i / FIXTURE_LOAD_FUNNEL.length) * 0.7,
                  }}
                >
                  <span className="font-mono text-xs font-bold tabular-nums text-white">
                    {stage.count}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

// ─── Driver leaderboard ─────────────────────────────────────────────────────

function DriverLeaderboardCard() {
  function exportCsv() {
    const csv = toCsv(
      FIXTURE_DRIVER_LEADERBOARD.map((d) => ({
        driver: d.name,
        loads: d.loads,
        miles: d.miles,
        onTime: d.onTimePercent,
        revenue: (d.revenueCents / 100).toFixed(2),
      })),
      [
        { key: "driver", header: "Driver" },
        { key: "loads", header: "Loads" },
        { key: "miles", header: "Miles" },
        { key: "onTime", header: "On-time %" },
        { key: "revenue", header: "Revenue ($)" },
      ],
    );
    downloadCsv("driver-leaderboard.csv", csv);
  }

  return (
    <ChartCard
      title="Driver leaderboard"
      subtitle="Performance this period"
      icon={<Users />}
      explanation={{
        title: "Driver leaderboard",
        what: "Your drivers ranked by the work they completed this period.",
        howToRead: [
          "Loads = number of trips completed.",
          "On-time % uses green/amber/red so you can scan it fast.",
          "Click a name to jump to that driver's page.",
        ],
        watchFor:
          "Red on-time % on a high-revenue driver — they're making money but hurting your reputation. Coach them.",
      }}
      actions={<ExportButton onClick={exportCsv} />}
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-8">#</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead className="text-right">Loads</TableHead>
            <TableHead className="text-right">Miles</TableHead>
            <TableHead className="text-right">On-time</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {FIXTURE_DRIVER_LEADERBOARD.map((d, i) => (
            <TableRow key={d.id}>
              <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                {i + 1}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                    {d.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="flex flex-col">
                    <Link
                      to="/admin/drivers/$driverId"
                      params={{ driverId: d.id }}
                      className="text-sm font-medium hover:text-[var(--primary)] hover:underline"
                    >
                      {d.name}
                    </Link>
                    <DeltaIndicator delta={d.deltaLoads} label="loads" />
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono text-sm tabular-nums">
                {d.loads}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                {d.miles.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                <OnTimeBadge percent={d.onTimePercent} />
              </TableCell>
              <TableCell className="text-right font-mono text-sm font-medium tabular-nums">
                {formatCompactCents(d.revenueCents)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ChartCard>
  );
}

function OnTimeBadge({ percent }: { percent: number }) {
  const tier =
    percent >= 90
      ? { cls: "text-[var(--success)]", Icon: CheckCircle2 }
      : percent >= 80
        ? {
            cls: "text-[color-mix(in_oklab,var(--warning)_85%,var(--foreground))]",
            Icon: AlertCircle,
          }
        : { cls: "text-[var(--danger)]", Icon: XCircle };
  return (
    <span
      className={cn(
        "inline-flex items-center justify-end gap-1 font-mono text-sm font-medium tabular-nums",
        tier.cls,
      )}
    >
      <tier.Icon aria-hidden="true" className="size-3.5" />
      {percent}%
    </span>
  );
}

// ─── Fleet on-time trend ────────────────────────────────────────────────────

function FleetOnTimeTrendCard() {
  function exportCsv() {
    const csv = toCsv(
      FIXTURE_FLEET_ONTIME_TREND.map((p) => ({
        period: p.label,
        fleet: p.onTimePercent,
        industry: p.industryBenchmark,
      })),
      [
        { key: "period", header: "Period" },
        { key: "fleet", header: "Fleet on-time %" },
        { key: "industry", header: "Industry benchmark %" },
      ],
    );
    downloadCsv("on-time-trend.csv", csv);
  }

  return (
    <ChartCard
      title="Fleet on-time trend"
      subtitle="Weekly on-time % with industry benchmark overlay"
      icon={<Target />}
      explanation={{
        title: "Fleet on-time trend",
        what: "Your fleet-wide on-time delivery rate over time, compared to the industry average.",
        howToRead: [
          "Solid orange is your fleet.",
          "Dashed gray is the industry average.",
          "Staying above the gray means you beat the market.",
        ],
        watchFor:
          "A sharp drop week-over-week — usually a routing or HOS-planning issue that can be fixed fast.",
      }}
      actions={<ExportButton onClick={exportCsv} />}
    >
      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          data={FIXTURE_FLEET_ONTIME_TREND}
          margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_COLORS.grid}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
            domain={[80, 100]}
            dx={-4}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v, name) => [
              `${Number(v).toFixed(1)}%`,
              name === "onTimePercent" ? "Fleet" : "Industry",
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }}
            iconType="circle"
            iconSize={7}
          />
          <Line
            type="monotone"
            dataKey="industryBenchmark"
            name="Industry avg"
            stroke={CHART_COLORS.muted}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="onTimePercent"
            name="Fleet on-time"
            stroke={CHART_COLORS.primary}
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
              fill: CHART_COLORS.primary,
              stroke: "#fff",
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Truck utilization heatmap ──────────────────────────────────────────────

function TruckUtilizationCard() {
  const maxWeek = Math.max(
    ...FIXTURE_TRUCK_UTILIZATION.flatMap((t) => t.weeks),
  );

  function exportCsv() {
    const csv = toCsv(
      FIXTURE_TRUCK_UTILIZATION.map((t) => {
        const row: Record<string, string | number> = { truck: t.truck };
        t.weeks.forEach((v, i) => {
          row[`W${i + 1}`] = v;
        });
        row.total = t.weeks.reduce((s, v) => s + v, 0);
        return row;
      }),
    );
    downloadCsv("truck-utilization.csv", csv);
  }

  return (
    <ChartCard
      title="Truck utilization"
      subtitle="Loads completed per truck, last 8 weeks"
      icon={<Truck />}
      explanation={{
        title: "Truck utilization",
        what: "A heat-map of how many loads each truck finished each of the last 8 weeks. Darker orange = busier.",
        howToRead: [
          "Rows are trucks. Columns are weeks (W1 is oldest).",
          "Empty/gray cell = zero loads that week.",
          "Totals on the right rank trucks by output.",
        ],
        watchFor:
          "A truck with many light/gray cells — that truck is idle. Repair, reassign, or sell.",
      }}
      actions={<ExportButton onClick={exportCsv} />}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card pb-2 pr-3 text-left text-[11px] font-semibold text-muted-foreground">
                Truck
              </th>
              {Array.from({ length: 8 }, (_, i) => (
                <th
                  key={i}
                  className="pb-2 text-center text-[10px] font-medium text-muted-foreground"
                >
                  W{i + 1}
                </th>
              ))}
              <th className="pb-2 pl-3 text-right text-[11px] font-semibold text-muted-foreground">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {FIXTURE_TRUCK_UTILIZATION.map((truck) => {
              const total = truck.weeks.reduce((s, w) => s + w, 0);
              return (
                <tr key={truck.truck}>
                  <td
                    className={cn(
                      "sticky left-0 z-10 bg-card py-1.5 pr-3",
                      "border-r border-[var(--border)]/60",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <Truck
                        aria-hidden="true"
                        className="size-3.5 text-muted-foreground"
                      />
                      {truck.truck}
                    </span>
                  </td>
                  {truck.weeks.map((count, wi) => {
                    const intensity = maxWeek > 0 ? count / maxWeek : 0;
                    return (
                      <td key={wi} className="px-0.5 py-1.5">
                        <div className="flex items-center justify-center">
                          <div
                            className="flex size-8 items-center justify-center rounded-[var(--radius-sm)]"
                            style={{
                              backgroundColor:
                                count === 0
                                  ? "var(--surface-2)"
                                  : `rgba(242, 122, 26, ${0.12 + intensity * 0.55})`,
                            }}
                            title={`${count} load${count !== 1 ? "s" : ""}`}
                          >
                            <span
                              className={cn(
                                "font-mono text-[11px] font-semibold tabular-nums",
                                count === 0
                                  ? "text-muted-foreground"
                                  : intensity > 0.6
                                    ? "text-white"
                                    : "text-[var(--primary)]",
                              )}
                            >
                              {count}
                            </span>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-1.5 pl-3 text-right font-mono text-sm font-semibold tabular-nums">
                    {total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

// ─── Delta indicator ────────────────────────────────────────────────────────

function DeltaIndicator({ delta, label }: { delta: number; label: string }) {
  if (delta === 0) return null;
  const isUp = delta > 0;
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-[10px] font-medium",
        isUp ? "text-[var(--success)]" : "text-[var(--danger)]",
      )}
    >
      <Icon className="size-3" />
      {isUp ? "+" : ""}
      {delta} {label}
    </span>
  );
}
