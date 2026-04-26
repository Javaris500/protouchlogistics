import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { EMPTY_COPY } from "@/lib/empty-copy";

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const copy = EMPTY_COPY["analytics.needsData"];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Revenue, utilization, margin, and fleet trends — all in one place."
      />

      <Card className="p-6">
        <EmptyState
          icon={BarChart3}
          variant={copy.variant}
          title={copy.title}
          description={copy.description}
        />
      </Card>
    </div>
  );
}
