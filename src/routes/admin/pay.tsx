import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { EMPTY_COPY } from "@/lib/empty-copy";

export const Route = createFileRoute("/admin/pay")({
  component: PayOverviewPage,
});

function PayOverviewPage() {
  const copy = EMPTY_COPY["pay.firstTime"];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Billing"
        title="Driver Pay"
        description="Weekly pay periods. Settle to mark drivers paid; drill in for per-driver and per-load breakdowns."
      />

      <Card className="p-6">
        <EmptyState
          icon={Wallet}
          variant={copy.variant}
          title={copy.title}
          description={copy.description}
        />
      </Card>
    </div>
  );
}
