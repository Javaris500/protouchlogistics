import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { EMPTY_COPY } from "@/lib/empty-copy";

/**
 * /admin/pay — pay-period overview (driver settlement workflow).
 *
 * DEFERRED in Phase 1. Shipping today: per-load pay is set + locked on
 * loads.driverPayCents (see /admin/loads/$id), and driver_pay_records snap
 * the amount when a load completes. This page would aggregate those rows
 * into weekly periods, surface "ready to settle" totals, and let Gary
 * mark a period paid (writing paidAt across all matching pay records).
 *
 * What's needed to build it:
 *  - listPayPeriods server fn — group driver_pay_records by ISO week,
 *    return { periodStart, periodEnd, driverCount, totalCents, settledCount }.
 *  - getPayPeriod server fn — drill into one week, return all pay records
 *    grouped by driver.
 *  - markPayPeriodPaid server fn — bulk-update paidAt on selected records,
 *    optionally generating a settlement_statements row + PDF (table already
 *    exists in schema).
 *  - UI: this page lists periods; /admin/pay/$periodId opens a period.
 *
 * Until shipped, Gary tracks driver pay through the per-load `driverPayCents`
 * field (read-only after completion) + the analytics page's "Driver pay
 * all-time" KPI.
 */
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
