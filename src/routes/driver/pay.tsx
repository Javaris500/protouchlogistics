import { createFileRoute } from "@tanstack/react-router";
import { CircleDollarSign } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";
import { Card } from "@/components/ui/card";
import { EMPTY_COPY } from "@/lib/empty-copy";
import { formatDateShort, formatMoneyCents } from "@/lib/format";
import { listDriverPayWeeksFn } from "@/server/functions/driver/pay";

export const Route = createFileRoute("/driver/pay")({
  loader: () => listDriverPayWeeksFn(),
  component: DriverPayPage,
});

function DriverPayPage() {
  const weeks = Route.useLoaderData();

  if (weeks.length === 0) {
    const copy = EMPTY_COPY["driver.pay.pending"];
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Pay"
          description="Earnings are settled per delivered load. Weekly buckets show as soon as your first load lands."
        />
        <EmptyState
          icon={CircleDollarSign}
          title={copy.title}
          description={copy.description}
          variant={copy.variant}
        />
      </div>
    );
  }

  const total = weeks.reduce((sum, w) => sum + w.totalCents, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pay"
        description="Read-only view of completed loads bucketed by week. Settlements are mailed by Gary."
      />

      <Card className="gap-0 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
          Lifetime earned
        </p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">
          {formatMoneyCents(total)}
        </p>
        <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
          Across {weeks.length} {weeks.length === 1 ? "week" : "weeks"}
        </p>
      </Card>

      {weeks.map((w) => (
        <Section
          key={w.weekStart}
          title={`Week of ${formatDateShort(w.weekStart)}`}
          description={`${w.loads.length} ${w.loads.length === 1 ? "load" : "loads"}`}
          actions={
            <span className="text-sm font-semibold">
              {formatMoneyCents(w.totalCents)}
            </span>
          }
        >
          <ul className="flex flex-col divide-y divide-[var(--border)]">
            {w.loads.map((load) => (
              <li
                key={load.id}
                className="flex items-center justify-between gap-3 py-2.5 text-[13px]"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[12px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    #{load.loadNumber}
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Delivered {formatDateShort(load.deliveredAt)}
                  </p>
                </div>
                <span className="font-semibold text-[var(--foreground)]">
                  {formatMoneyCents(load.payCents)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </div>
  );
}
