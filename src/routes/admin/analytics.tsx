import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Minus,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard, ExportButton } from "@/components/charts/ChartCard";
import {
  AXIS_STYLE,
  CHART_COLORS,
  TOOLTIP_STYLE,
} from "@/components/charts/chart-theme";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FIXTURE_BROKER_DAYS_TO_PAY,
  FIXTURE_DRIVER_LEADERBOARD,
  FIXTURE_INVOICE_AGING,
  FIXTURE_LANES,
  FIXTURE_LOAD_FUNNEL,
  FIXTURE_RATE_PER_MILE,
  FIXTURE_RATE_PER_MILE_CURRENT,
  FIXTURE_RATE_PER_MILE_TARGET_HIGH,
  FIXTURE_RATE_PER_MILE_TARGET_LOW,
  FIXTURE_REVENUE_BY_BROKER,
  FIXTURE_REVENUE_WEEKLY,
  FIXTURE_TRUCK_UTILIZATION,
} from "@/lib/fixtures/analytics";
import { formatCompactCents, formatMoneyCents } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsPage,
});

type Period = "week" | "month" | "quarter";

function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("month");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Insight"
        title="Analytics"
        description="Am I making money, and where is money leaking?"
        actions={
          <div className="flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--surface-2)] p-1">
            {(["week", "month", "quarter"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  "rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium capitalize transition-all duration-200 ease-out",
                  p === period
                    ? "bg-[var(--background)] text-[var(--foreground)] shadow-[var(--shadow-sm)]"
                    : "text-muted-foreground hover:text-[var(--foreground)]",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        }
      />

      {/* ───────────────── SECTION 1: MONEY ───────────────── */}
      <section className="animate-enter stagger-1 flex flex-col gap-4">
        <SectionLabel label="Revenue" />

        {/* Revenue over time + Rate per mile */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <ChartCard
            title="Revenue over time"
            subtitle="Weekly revenue vs. prior period"
            actions={<ExportButton />}
            className="xl:col-span-2"
          >
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={FIXTURE_REVENUE_WEEKLY}
                margin={{ top: 8, right: 4, bottom: 0, left: -12 }}
              >
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
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
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Rate per mile — big number + sparkline */}
          <ChartCard
            title="Rate per mile"
            subtitle="30-day trend with target band"
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
                  +$0.07
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
                  {/* Target band */}
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
                  Target: ${(FIXTURE_RATE_PER_MILE_TARGET_LOW / 100).toFixed(2)}{" "}
                  – ${(FIXTURE_RATE_PER_MILE_TARGET_HIGH / 100).toFixed(2)}
                </span>
                <span className="text-[var(--success)]">Within target</span>
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Revenue by broker + Revenue by lane */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            title="Revenue by broker"
            subtitle="Top brokers by total revenue"
            actions={<ExportButton />}
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
                  formatter={(v) => [
                    formatMoneyCents(Number(v) || 0),
                    "Revenue",
                  ]}
                />
                <Bar
                  dataKey="revenueCents"
                  fill={CHART_COLORS.primary}
                  radius={[0, 4, 4, 0]}
                  barSize={20}
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

          {/* Revenue by lane — compact list with sparklines */}
          <ChartCard
            title="Revenue by lane"
            subtitle="Top origin → destination pairs"
            actions={<ExportButton />}
          >
            <div className="flex flex-col divide-y divide-border">
              {FIXTURE_LANES.map((lane, i) => (
                <div
                  key={`${lane.origin}-${lane.destination}`}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="w-5 text-center text-[11px] font-semibold text-muted-foreground tabular-nums">
                    {i + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">
                      {lane.origin}{" "}
                      <span className="text-muted-foreground">→</span>{" "}
                      {lane.destination}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {lane.loadCount} loads · $
                      {(lane.avgRatePerMileCents / 100).toFixed(2)}/mi
                    </span>
                  </div>
                  {/* Mini sparkline */}
                  <div className="hidden w-20 sm:block">
                    <ResponsiveContainer width="100%" height={24}>
                      <LineChart
                        data={lane.sparkline.map((v, j) => ({ v, j }))}
                      >
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke={CHART_COLORS.primary}
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <span className="w-16 text-right font-mono text-sm font-medium tabular-nums">
                    {formatCompactCents(lane.revenueCents)}
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </section>

      {/* ───────────────── SECTION 2: CASH FLOW ───────────────── */}
      <section className="animate-enter stagger-2 flex flex-col gap-4">
        <SectionLabel label="Cash Flow" />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Invoice aging stacked bar */}
          <ChartCard
            title="Invoice aging"
            subtitle="Outstanding A/R by age bucket"
            actions={<ExportButton />}
          >
            <div className="flex flex-col gap-4">
              {/* Single stacked bar */}
              <div className="flex h-8 w-full overflow-hidden rounded-[var(--radius-sm)]">
                {FIXTURE_INVOICE_AGING.map((bucket) => {
                  const total = FIXTURE_INVOICE_AGING.reduce(
                    (s, b) => s + b.amountCents,
                    0,
                  );
                  const pct = (bucket.amountCents / total) * 100;
                  return (
                    <div
                      key={bucket.bucket}
                      className="relative flex items-center justify-center transition-all hover:opacity-80"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: bucket.color,
                      }}
                      title={`${bucket.bucket}: ${formatMoneyCents(bucket.amountCents)}`}
                    >
                      {pct > 12 && (
                        <span className="text-[10px] font-bold text-white">
                          {Math.round(pct)}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FIXTURE_INVOICE_AGING.map((bucket) => (
                  <div key={bucket.bucket} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: bucket.color }}
                      />
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {bucket.bucket}
                      </span>
                    </div>
                    <span className="font-mono text-lg font-semibold tabular-nums">
                      {formatCompactCents(bucket.amountCents)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {bucket.count} invoice{bucket.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          {/* Days to pay by broker */}
          <ChartCard
            title="Days to pay by broker"
            subtitle="Average vs. payment terms (Net 30)"
            actions={<ExportButton />}
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={FIXTURE_BROKER_DAYS_TO_PAY}
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
                  domain={[0, 60]}
                  tickFormatter={(v: number) => `${v}d`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ ...AXIS_STYLE, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <ReferenceLine
                  x={30}
                  stroke={CHART_COLORS.muted}
                  strokeDasharray="6 3"
                  label={{
                    value: "Net 30",
                    position: "top",
                    fill: CHART_COLORS.text,
                    fontSize: 10,
                  }}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [
                    `${Number(v) || 0} days`,
                    "Avg days to pay",
                  ]}
                />
                <Bar dataKey="avgDays" radius={[0, 4, 4, 0]} barSize={18}>
                  {FIXTURE_BROKER_DAYS_TO_PAY.map((b) => (
                    <Cell
                      key={b.name}
                      fill={
                        b.avgDays <= b.terms
                          ? CHART_COLORS.success
                          : b.avgDays <= b.terms * 1.5
                            ? CHART_COLORS.warning
                            : CHART_COLORS.danger
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </section>

      {/* ───────────────── SECTION 3: OPERATIONS ───────────────── */}
      <section className="animate-enter stagger-3 flex flex-col gap-4">
        <SectionLabel label="Operations" />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Load status funnel */}
          <ChartCard
            title="Load status funnel"
            subtitle="Where loads are in the pipeline right now"
          >
            <div className="flex flex-col gap-2">
              {FIXTURE_LOAD_FUNNEL.map((stage, i) => {
                const maxCount = Math.max(
                  ...FIXTURE_LOAD_FUNNEL.map((s) => s.count),
                );
                const pct = (stage.count / maxCount) * 100;
                return (
                  <div key={stage.stage} className="flex items-center gap-3">
                    <span className="w-20 text-right text-xs font-medium text-muted-foreground">
                      {stage.stage}
                    </span>
                    <div className="flex h-7 flex-1 items-center">
                      <div
                        className="flex h-full items-center rounded-r-[var(--radius-sm)] px-2 transition-all"
                        style={{
                          width: `${Math.max(pct, 8)}%`,
                          backgroundColor: CHART_COLORS.primary,
                          opacity: 0.3 + (i / FIXTURE_LOAD_FUNNEL.length) * 0.7,
                        }}
                      >
                        <span className="font-mono text-xs font-bold text-white tabular-nums">
                          {stage.count}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>

          {/* Driver leaderboard */}
          <ChartCard
            title="Driver leaderboard"
            subtitle="Performance this period"
            actions={<ExportButton />}
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
                    <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
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
                          <span className="text-sm font-medium">{d.name}</span>
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
                      <span
                        className={cn(
                          "font-mono text-sm font-medium tabular-nums",
                          d.onTimePercent >= 90
                            ? "text-[var(--success)]"
                            : d.onTimePercent >= 80
                              ? "text-[var(--warning)]"
                              : "text-[var(--danger)]",
                        )}
                      >
                        {d.onTimePercent}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium tabular-nums">
                      {formatCompactCents(d.revenueCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ChartCard>
        </div>
      </section>

      {/* ───────────────── SECTION 4: FLEET ───────────────── */}
      <section className="animate-enter stagger-4 flex flex-col gap-4">
        <SectionLabel label="Fleet" />

        <ChartCard
          title="Truck utilization"
          subtitle="Loads completed per truck, last 8 weeks"
          actions={<ExportButton />}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pb-2 text-left text-[11px] font-semibold text-muted-foreground">
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
                  <th className="pb-2 text-right text-[11px] font-semibold text-muted-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {FIXTURE_TRUCK_UTILIZATION.map((truck) => {
                  const total = truck.weeks.reduce((s, w) => s + w, 0);
                  const maxWeek = Math.max(
                    ...FIXTURE_TRUCK_UTILIZATION.flatMap((t) => t.weeks),
                  );
                  return (
                    <tr key={truck.truck}>
                      <td className="py-1.5 pr-3">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          <Truck className="size-3.5 text-muted-foreground" />
                          {truck.truck}
                        </span>
                      </td>
                      {truck.weeks.map((count, wi) => {
                        const intensity = maxWeek > 0 ? count / maxWeek : 0;
                        return (
                          <td key={wi} className="px-0.5 py-1.5">
                            <div className="flex items-center justify-center">
                              <div
                                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] transition-colors"
                                style={{
                                  backgroundColor:
                                    count === 0
                                      ? "var(--surface-2)"
                                      : `rgba(242, 122, 26, ${0.12 + intensity * 0.55})`,
                                }}
                                title={`${count} loads`}
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
      </section>
    </div>
  );
}

// ─── Shared sub-components ──────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </h2>
      <div className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}

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
