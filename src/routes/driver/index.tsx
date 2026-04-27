import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Container, FileText } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";
import { Button } from "@/components/ui/button";
import { LoadCard } from "@/components/driver/LoadCard";
import { DRIVER_EMPTY_COPY } from "@/components/driver/driver-empty-copy";
import { listDriverLoadsFn } from "@/server/functions/driver/loads";
import { formatRelativeFromNow } from "@/lib/format";

export const Route = createFileRoute("/driver/")({
  loader: () => listDriverLoadsFn(),
  component: DriverHomePage,
});

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Working late";
}

function DriverHomePage() {
  const data = Route.useLoaderData();
  const today = data.today;

  const todayCopy = DRIVER_EMPTY_COPY["driver.todayLoad.none"];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
        title={greeting()}
        description={
          today
            ? "Here's your active load. Tap into it for stops, paperwork, and status updates."
            : "Nothing on your board right now. We'll surface a load here the moment Gary dispatches one."
        }
      />

      <Section
        title="Today's load"
        description={
          today
            ? `Updated ${formatRelativeFromNow(today.updatedAt)}`
            : undefined
        }
        actions={
          data.active.length > 1 ? (
            <Button asChild variant="ghost" size="sm">
              <Link to="/driver/loads">
                See all
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          ) : null
        }
      >
        {today ? (
          <LoadCard load={today} />
        ) : (
          <EmptyState
            icon={Container}
            title={todayCopy.title}
            description={todayCopy.description}
            variant={todayCopy.variant}
          />
        )}
      </Section>

      <Section
        title="Quick links"
        contentClassName="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        <QuickLink to="/driver/loads" icon={Container} label="My loads" />
        <QuickLink to="/driver/documents" icon={FileText} label="Documents" />
        <QuickLink to="/driver/pay" icon={ArrowRight} label="Pay" />
      </Section>
    </div>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
}: {
  to: "/driver/loads" | "/driver/documents" | "/driver/pay";
  icon: typeof Container;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-3 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]"
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-[var(--primary)]">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="text-[13px] font-medium text-[var(--foreground)]">
        {label}
      </span>
    </Link>
  );
}
