import { createFileRoute } from "@tanstack/react-router";
import { Download, Wallet } from "lucide-react";

import { BackLink } from "@/components/common/BackLink";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/admin/pay/$periodId")({
  component: PayPeriodDetailPage,
});

function PayPeriodDetailPage() {
  const { periodId } = Route.useParams();

  // Placeholder data — swapped for real server data on wire-up.
  const period = {
    id: periodId,
    label: "Mar 17 – Mar 23, 2026",
    status: "open" as const,
    totalCents: 24_850_00,
    loadCount: 18,
    driverCount: 5,
  };

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/pay">Back to driver pay</BackLink>

      <PageHeader
        eyebrow="Pay period"
        title={
          <span className="inline-flex items-center gap-3">
            <span>{period.label}</span>
            <Badge variant={period.status === "open" ? "warning" : "success"}>
              {period.status === "open" ? "Open" : "Settled"}
            </Badge>
          </span>
        }
        description={`${period.driverCount} drivers · ${period.loadCount} loads · $${(period.totalCents / 100).toLocaleString()} total`}
        actions={
          <>
            <Button variant="outline" size="md">
              <Download className="size-4" /> Export CSV
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={period.status !== "open"}
            >
              <Wallet className="size-4" /> Settle period
            </Button>
          </>
        }
      />

      <Card className="flex flex-col items-center justify-center gap-3 py-16">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <Wallet className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Per-driver breakdown</p>
        <p className="max-w-sm text-center text-xs text-muted-foreground">
          Per-driver totals, each with a drilldown to individual loads +
          adjustments. Settlement marks the period as paid.
        </p>
        <Separator className="my-2 w-16" />
        <p className="font-mono text-[11px] tracking-wide text-muted-foreground">
          period id: {periodId}
        </p>
      </Card>
    </div>
  );
}
