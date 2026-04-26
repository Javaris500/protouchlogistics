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
import {
  FIXTURE_ACTIVE_LOADS,
  FIXTURE_ACTIVITY,
  FIXTURE_EXPIRING_DOCS,
  FIXTURE_KPIS,
  FIXTURE_PENDING_ONBOARDING_COUNT,
} from "@/lib/fixtures/dashboard";
import { formatCompactCents, formatRelativeFromNow } from "@/lib/format";

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
  const k = FIXTURE_KPIS;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Active loads"
        value={k.activeLoads}
        sublabel="currently in progress"
        icon={<Activity />}
        trend={k.trends.activeLoads}
      />
      <KpiCard
        label="Completed this week"
        value={k.completedThisWeek}
        sublabel="Mon–Sun"
        icon={<CheckCircle2 />}
        trend={k.trends.completedThisWeek}
      />
      <KpiCard
        label="Drivers on road"
        value={k.driversOnRoadNow}
        sublabel="reporting GPS now"
        icon={<Truck />}
        trend={k.trends.driversOnRoadNow}
      />
      <KpiCard
        label="AR outstanding"
        value={formatCompactCents(k.invoicesOutstandingCents)}
        sublabel="unpaid invoices"
        icon={<CircleDollarSign />}
        trend={k.trends.invoicesOutstandingCents}
      />
    </div>
  );
}

function LiveMapPreview({ className }: { className?: string }) {
  const copy = EMPTY_COPY["dashboard.liveFleet"];
  const hasDrivers = FIXTURE_KPIS.driversOnRoadNow > 0;
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
              <div className="text-sm font-semibold">
                {FIXTURE_KPIS.driversOnRoadNow} drivers reporting
              </div>
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
  const count = FIXTURE_PENDING_ONBOARDING_COUNT;
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
  const loads = FIXTURE_ACTIVE_LOADS;
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

function ExpiringSoonWidget({ className }: { className?: string }) {
  const docs = FIXTURE_EXPIRING_DOCS;
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
              <Link
                to={d.ownerHref}
                className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">
                    {d.ownerLabel}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {formatDocType(d.type)}
                  </span>
                </div>
                <ExpirationBadge date={d.expirationDate} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function RecentActivityWidget() {
  const activity = FIXTURE_ACTIVITY;
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
