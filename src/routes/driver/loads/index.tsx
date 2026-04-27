import { createFileRoute } from "@tanstack/react-router";
import { Container, History } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";
import { LoadCard } from "@/components/driver/LoadCard";
import { DRIVER_EMPTY_COPY } from "@/components/driver/driver-empty-copy";
import { listDriverLoadsFn } from "@/server/functions/driver/loads";

export const Route = createFileRoute("/driver/loads/")({
  loader: () => listDriverLoadsFn(),
  component: DriverLoadsPage,
});

function DriverLoadsPage() {
  const data = Route.useLoaderData();
  const noneCopy = DRIVER_EMPTY_COPY["driver.todayLoad.none"];
  const historyCopy = DRIVER_EMPTY_COPY["driver.loads.history.empty"];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My loads"
        description="Active runs first, then everything you've delivered."
      />

      <Section title="Active" description={countLabel(data.active.length)}>
        {data.active.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.active.map((load) => (
              <LoadCard key={load.id} load={load} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Container}
            title={noneCopy.title}
            description={noneCopy.description}
            variant={noneCopy.variant}
          />
        )}
      </Section>

      <Section
        title="History"
        description={countLabel(data.history.length)}
      >
        {data.history.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.history.map((load) => (
              <LoadCard key={load.id} load={load} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={History}
            title={historyCopy.title}
            description={historyCopy.description}
            variant={historyCopy.variant}
          />
        )}
      </Section>
    </div>
  );
}

function countLabel(n: number): string | undefined {
  if (n === 0) return undefined;
  return `${n} ${n === 1 ? "load" : "loads"}`;
}
