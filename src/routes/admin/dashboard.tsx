import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  FileWarning,
  History,
  MapPin,
  Truck,
  UserPlus,
} from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { KpiCard } from "@/components/common/KpiCard";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";
import { Button } from "@/components/ui/button";
import { ExpirationBadge } from "@/components/ui/expiration-badge";
import { StatusPill } from "@/components/ui/status-pill";
import { EMPTY_COPY } from "@/lib/empty-copy";
import { formatCompactCents, formatRelativeFromNow } from "@/lib/format";
import { listAudit } from "@/server/functions/audit";
import { listDocuments } from "@/server/functions/documents";
import { listPendingApprovals } from "@/server/functions/drivers";
import { listInvoices } from "@/server/functions/invoices";
import { listLoadsAdmin } from "@/server/functions/loads";

const ACTIVE_LOAD_STATUSES = [
  "assigned",
  "accepted",
  "en_route_pickup",
  "at_pickup",
  "loaded",
  "en_route_delivery",
  "at_delivery",
  "delivered",
  "pod_uploaded",
] as const;

export const Route = createFileRoute("/admin/dashboard")({
  component: DashboardPage,
});

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Working late";
}

function DashboardPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-enter stagger-1">
        <PageHeader
          eyebrow={today}
          title={`${greeting()}, Gary.`}
          description="Here's what's moving today — active loads, drivers on the road, outstanding AR, and what needs your eyes next."
          actions={
            <Button asChild variant="primary" size="md">
              <Link to="/admin/loads/new">
                New load
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
      </div>

      <div className="animate-enter stagger-2">
        <KpiRow />
      </div>

      <div className="animate-enter stagger-3 grid gap-4 lg:grid-cols-6">
        <LiveMapPreview className="lg:col-span-4" />
        <OnboardingQueueCard className="lg:col-span-2" />
      </div>

      <div className="animate-enter stagger-4 grid gap-4 lg:grid-cols-6">
        <ActiveLoadsWidget className="lg:col-span-4" />
        <ExpiringSoonWidget className="lg:col-span-2" />
      </div>

      <div className="animate-enter stagger-5">
        <RecentActivityWidget />
      </div>
    </div>
  );
}

function KpiRow() {
  const loadsQuery = useQuery({
    queryKey: ["admin", "dashboard", "loads"],
    queryFn: () =>
      listLoadsAdmin({ data: { limit: 200, cursor: null } }),
  });
  const invoicesQuery = useQuery({
    queryKey: ["admin", "dashboard", "invoices"],
    queryFn: () => listInvoices({ data: { limit: 200, cursor: null } }),
  });

  const loads = loadsQuery.data?.loads ?? [];
  const invoices = invoicesQuery.data?.invoices ?? [];

  const activeCount = loads.filter((l) =>
    (ACTIVE_LOAD_STATUSES as readonly string[]).includes(l.status),
  ).length;
  const weekStart = Date.now() - 7 * 86_400_000;
  const completedThisWeek = loads.filter(
    (l) =>
      l.status === "completed" &&
      new Date(l.updatedAt).getTime() >= weekStart,
  ).length;
  const arOutstandingCents = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.totalCents, 0);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Active loads"
        value={activeCount}
        sublabel="currently in progress"
        icon={<Activity />}
      />
      <KpiCard
        label="Completed this week"
        value={completedThisWeek}
        sublabel="last 7 days"
        icon={<CheckCircle2 />}
      />
      <KpiCard
        label="Drivers on road"
        value={0}
        sublabel="GPS comes in Phase 2"
        icon={<Truck />}
      />
      <KpiCard
        label="AR outstanding"
        value={formatCompactCents(arOutstandingCents)}
        sublabel="unpaid invoices"
        icon={<CircleDollarSign />}
      />
    </div>
  );
}

function LiveMapPreview({ className }: { className?: string }) {
  const copy = EMPTY_COPY["dashboard.liveFleet"];
  const hasDrivers = false; // GPS lands Phase 2.
  return (
    <Section
      title="Live fleet"
      description="Most recent GPS position per active driver."
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/tracking">
            Open full map
            <ExternalLink className="size-3.5" />
          </Link>
        </Button>
      }
      contentClassName="p-0"
      className={className}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-b-xl bg-muted">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, color-mix(in oklab, var(--primary) 22%, transparent) 0 1px, transparent 2px)," +
              "radial-gradient(circle at 62% 48%, color-mix(in oklab, var(--primary) 22%, transparent) 0 1px, transparent 2px)," +
              "radial-gradient(circle at 78% 68%, color-mix(in oklab, var(--primary) 22%, transparent) 0 1px, transparent 2px)," +
              "linear-gradient(180deg, var(--surface-2) 0%, var(--surface) 100%)",
          }}
        />
        <div className="relative flex h-full flex-col items-center justify-center gap-1.5 px-6 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-background shadow-sm">
            <MapPin className="size-5 text-[var(--primary)]" aria-hidden />
          </div>
          {hasDrivers ? (
            <>
              <div className="text-sm font-semibold">Drivers reporting</div>
              <div className="text-xs text-muted-foreground">
                Live map loads once Mapbox is wired.
              </div>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold">{copy.title}</div>
              <div className="max-w-sm text-xs text-muted-foreground">
                {copy.description}
              </div>
            </>
          )}
        </div>
      </div>
    </Section>
  );
}

function OnboardingQueueCard({ className }: { className?: string }) {
  const pendingQuery = useQuery({
    queryKey: ["admin", "dashboard", "pending-approvals"],
    queryFn: () =>
      listPendingApprovals({ data: { limit: 50, cursor: null } }),
  });
  const count = pendingQuery.data?.drivers.length ?? 0;
  const copy = EMPTY_COPY["dashboard.onboardingQueue"];
  return (
    <Section
      title="Onboarding queue"
      description="Drivers awaiting your approval."
      className={className}
    >
      {count === 0 ? (
        <EmptyState
          variant={copy.variant}
          icon={UserPlus}
          title={copy.title}
          description={copy.description}
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/drivers">
                {copy.ctaLabel ?? "Invite driver"}
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-3">
            <div className="flex flex-col">
              <span className="text-2xl font-semibold tabular-nums">
                {count}
              </span>
              <span className="text-xs text-muted-foreground">
                {count === 1 ? "submission" : "submissions"} to review
              </span>
            </div>
            <Button asChild variant="primary" size="sm">
              <Link to="/admin/drivers">
                Review
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Review includes profile, CDL, and medical card. Approve or reject
            with a reason.
          </p>
        </div>
      )}
    </Section>
  );
}

function ActiveLoadsWidget({ className }: { className?: string }) {
  const activeQuery = useQuery({
    queryKey: ["admin", "dashboard", "active-loads"],
    queryFn: () => listLoadsAdmin({ data: { limit: 50, cursor: null } }),
  });
  const loads = (activeQuery.data?.loads ?? [])
    .filter((l) =>
      (ACTIVE_LOAD_STATUSES as readonly string[]).includes(l.status),
    )
    .slice(0, 6)
    .map((l) => ({
      id: l.id,
      loadNumber: l.loadNumber,
      status: l.status,
      pickupCity: l.pickup?.city ?? "—",
      deliveryCity: l.delivery?.city ?? "—",
      driverName: l.driver
        ? `${l.driver.firstName} ${l.driver.lastName}`
        : "Unassigned",
    }));
  const copy = EMPTY_COPY["dashboard.activeLoads"];
  return (
    <Section
      title="Active loads"
      description="In progress right now. Click to open the load."
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/loads">
            View all
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      }
      className={className}
      contentClassName="p-0"
    >
      {loads.length === 0 ? (
        <div className="px-5 py-6">
          <EmptyState
            variant={copy.variant}
            icon={Truck}
            title={copy.title}
            description={copy.description}
            action={
              <Button asChild variant="primary" size="sm">
                <Link to="/admin/loads/new">
                  {copy.ctaLabel ?? "New load"}
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {loads.map((l) => (
            <li key={l.id}>
              <Link
                to="/admin/loads/$loadId"
                params={{ loadId: l.id }}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">
                      {l.loadNumber}
                    </span>
                    <StatusPill kind="load" status={l.status} />
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {l.pickupCity} → {l.deliveryCity} · {l.driverName}
                  </div>
                </div>
                <ArrowRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

type ExpiringRow =
  | {
      id: string;
      type: string;
      expirationDate: string;
      ownerLabel: string;
      kind: "driver";
      driverId: string;
    }
  | {
      id: string;
      type: string;
      expirationDate: string;
      ownerLabel: string;
      kind: "truck";
      truckId: string;
    }
  | {
      id: string;
      type: string;
      expirationDate: string;
      ownerLabel: string;
      kind: "load";
      loadId: string;
    };

function ExpiringDocLink({ doc }: { doc: ExpiringRow }) {
  const inner = (
    <>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{doc.ownerLabel}</span>
        <span className="truncate text-xs text-muted-foreground">
          {formatDocType(doc.type)}
        </span>
      </div>
      <ExpirationBadge date={doc.expirationDate} />
    </>
  );
  const cn =
    "flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none";
  if (doc.kind === "driver") {
    return (
      <Link
        to="/admin/drivers/$driverId"
        params={{ driverId: doc.driverId }}
        className={cn}
      >
        {inner}
      </Link>
    );
  }
  if (doc.kind === "truck") {
    return (
      <Link
        to="/admin/trucks/$truckId"
        params={{ truckId: doc.truckId }}
        className={cn}
      >
        {inner}
      </Link>
    );
  }
  return (
    <Link
      to="/admin/loads/$loadId"
      params={{ loadId: doc.loadId }}
      className={cn}
    >
      {inner}
    </Link>
  );
}

function ExpiringSoonWidget({ className }: { className?: string }) {
  const expiringQuery = useQuery({
    queryKey: ["admin", "dashboard", "expiring-docs"],
    queryFn: () =>
      listDocuments({
        data: { expiringWithinDays: 60, limit: 10, cursor: null },
      }),
  });
  const docs: ExpiringRow[] = (expiringQuery.data?.documents ?? []).flatMap(
    (d): ExpiringRow[] => {
      const base = {
        id: d.id,
        type: d.type,
        expirationDate: d.expirationDate ?? "",
        ownerLabel: d.fileName,
      };
      if (d.driverProfileId) {
        return [{ ...base, kind: "driver", driverId: d.driverProfileId }];
      }
      if (d.truckId) {
        return [{ ...base, kind: "truck", truckId: d.truckId }];
      }
      if (d.loadId) {
        return [{ ...base, kind: "load", loadId: d.loadId }];
      }
      return [];
    },
  );
  const copy = EMPTY_COPY["dashboard.expiringDocs"];
  return (
    <Section
      title="Expiring soon"
      description="Next 60 days."
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/documents">
            All docs
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      }
      className={className}
      contentClassName="p-0"
    >
      {docs.length === 0 ? (
        <div className="px-5 py-6">
          <EmptyState
            variant={copy.variant}
            icon={FileWarning}
            title={copy.title}
            description={copy.description}
          />
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {docs.map((d) => (
            <li key={d.id}>
              <ExpiringDocLink doc={d} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function RecentActivityWidget() {
  const auditQuery = useQuery({
    queryKey: ["admin", "dashboard", "activity"],
    queryFn: () => listAudit({ data: { limit: 20, cursor: null } }),
  });
  const activity = (auditQuery.data?.entries ?? []).map((a) => ({
    id: a.id,
    actor: a.actor?.name || a.actor?.email || "System",
    action: a.action,
    target: a.entityType,
    at: a.createdAt,
  }));
  const copy = EMPTY_COPY["dashboard.activity"];
  return (
    <Section
      title="Recent activity"
      description="Latest 20 events from the audit log."
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/settings/audit">
            Audit log
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      }
    >
      {activity.length === 0 ? (
        <EmptyState
          variant={copy.variant}
          icon={History}
          title={copy.title}
          description={copy.description}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {activity.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm">
                  <span className="font-medium">{a.actor}</span>{" "}
                  <span className="text-muted-foreground">{a.action}</span>{" "}
                  <span className="font-medium">{a.target}</span>
                </span>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {formatRelativeFromNow(a.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function formatDocType(t: string): string {
  switch (t) {
    case "driver_cdl":
      return "Driver · CDL";
    case "driver_medical":
      return "Driver · Medical card";
    case "truck_registration":
      return "Truck · Registration";
    case "truck_insurance":
      return "Truck · Insurance";
    case "truck_inspection":
      return "Truck · Annual inspection";
    default:
      return t;
  }
}
