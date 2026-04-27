import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  Package,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";

import { KpiCard } from "@/components/common/KpiCard";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { Card } from "@/components/ui/card";
import { formatCompactCents, formatMoneyCents } from "@/lib/format";
import { getAnalyticsSummary } from "@/server/functions/analytics";

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsPage,
});

const STATUS_LABEL: Record<string, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  en_route_pickup: "En route to pickup",
  at_pickup: "At pickup",
  loaded: "Loaded",
  en_route_delivery: "En route to delivery",
  at_delivery: "At delivery",
  delivered: "Delivered",
  pod_uploaded: "POD uploaded",
};

function AnalyticsPage() {
  const summary = useQuery({
    queryKey: ["admin", "analytics", "summary"],
    queryFn: () => getAnalyticsSummary(),
    refetchInterval: 60_000,
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="animate-enter stagger-1">
        <PageHeader
          eyebrow="Insights"
          title="Analytics"
          description="Revenue, fleet utilization, and load throughput at a glance. Updates every minute."
        />
      </div>

      <QueryBoundary query={summary}>
        {(s) => {
          const totalLoads =
            s.loads.inFlight + s.loads.completedAllTime + s.loads.cancelled;
          const completionRate =
            totalLoads > 0
              ? Math.round((s.loads.completedAllTime / totalLoads) * 100)
              : 0;

          return (
            <>
              {/* Money KPIs */}
              <div className="animate-enter stagger-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  label="Revenue · all time"
                  value={formatCompactCents(s.money.revenueAllTimeCents)}
                  icon={<CircleDollarSign />}
                  sublabel={`${s.loads.completedAllTime} completed loads`}
                />
                <KpiCard
                  label="Driver pay · all time"
                  value={formatCompactCents(s.money.driverPayAllTimeCents)}
                  icon={<Users />}
                />
                <KpiCard
                  label="Margin"
                  value={formatCompactCents(s.money.marginAllTimeCents)}
                  icon={<TrendingUp />}
                  sublabel={
                    s.money.revenueAllTimeCents > 0
                      ? `${Math.round(
                          (s.money.marginAllTimeCents /
                            s.money.revenueAllTimeCents) *
                            100,
                        )}% of revenue`
                      : "No revenue yet"
                  }
                />
                <KpiCard
                  label="Avg $/mile"
                  value={
                    s.money.avgRatePerMileCents != null
                      ? formatMoneyCents(s.money.avgRatePerMileCents, true)
                      : "—"
                  }
                  icon={<Gauge />}
                  sublabel={
                    s.money.avgRatePerMileCents == null
                      ? "Need miles + revenue"
                      : "Across completed loads"
                  }
                />
              </div>

              {/* Time-window money */}
              <div className="animate-enter stagger-3 grid gap-4 sm:grid-cols-3">
                <Card className="p-5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Today
                  </h3>
                  <p className="mt-2 text-[1.5rem] font-semibold tracking-tight tabular-nums">
                    {formatMoneyCents(s.windows.today.revenueCents)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.windows.today.completed} loads ·{" "}
                    {s.windows.today.miles.toLocaleString()} mi
                  </p>
                </Card>
                <Card className="p-5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Last 7 days
                  </h3>
                  <p className="mt-2 text-[1.5rem] font-semibold tracking-tight tabular-nums">
                    {formatMoneyCents(s.windows.last7Days.revenueCents)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.windows.last7Days.completed} loads ·{" "}
                    {s.windows.last7Days.miles.toLocaleString()} mi
                  </p>
                </Card>
                <Card className="p-5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Last 30 days
                  </h3>
                  <p className="mt-2 text-[1.5rem] font-semibold tracking-tight tabular-nums">
                    {formatMoneyCents(s.windows.last30Days.revenueCents)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.windows.last30Days.completed} loads ·{" "}
                    {s.windows.last30Days.miles.toLocaleString()} mi
                  </p>
                </Card>
              </div>

              {/* Fleet + load KPIs */}
              <div className="animate-enter stagger-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  label="Active drivers"
                  value={s.fleet.activeDrivers.toLocaleString()}
                  icon={<Users />}
                  sublabel={
                    s.fleet.pendingDrivers > 0
                      ? `${s.fleet.pendingDrivers} pending review`
                      : "All caught up"
                  }
                />
                <KpiCard
                  label="Trucks on the road"
                  value={s.fleet.activeTrucks.toLocaleString()}
                  icon={<Truck />}
                  sublabel={
                    s.fleet.inShopTrucks > 0
                      ? `${s.fleet.inShopTrucks} in shop`
                      : "Full fleet active"
                  }
                />
                <KpiCard
                  label="Loads in flight"
                  value={s.loads.inFlight.toLocaleString()}
                  icon={<Package />}
                />
                <KpiCard
                  label="Completion rate"
                  value={`${completionRate}%`}
                  icon={<CheckCircle2 />}
                  sublabel={
                    s.loads.cancelled > 0
                      ? `${s.loads.cancelled} cancelled`
                      : "0 cancelled"
                  }
                />
              </div>

              {/* Status breakdown */}
              <Card className="animate-enter stagger-5 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[14px] font-semibold">
                    In-flight load breakdown
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    {s.loads.inFlight} active
                  </span>
                </div>
                {s.statusBreakdown.length === 0 ? (
                  <div className="flex items-center gap-3 rounded-md bg-muted/40 p-4 text-[13px] text-muted-foreground">
                    <BarChart3 className="size-4" />
                    No active loads. Once you dispatch one, status will fill in
                    here.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {s.statusBreakdown.map((b) => {
                      const pct =
                        s.loads.inFlight > 0
                          ? Math.round((b.count / s.loads.inFlight) * 100)
                          : 0;
                      return (
                        <div key={b.status} className="space-y-1">
                          <div className="flex items-center justify-between text-[12.5px]">
                            <span>{STATUS_LABEL[b.status] ?? b.status}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {b.count} · {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-[var(--primary)] transition-[width]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <p className="text-[11px] text-muted-foreground">
                Brokers on file: {s.fleet.brokers}.
              </p>
            </>
          );
        }}
      </QueryBoundary>
    </div>
  );
}
