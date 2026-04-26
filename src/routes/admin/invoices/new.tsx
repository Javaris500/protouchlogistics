import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import { BackLink } from "@/components/common/BackLink";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { EMPTY_COPY } from "@/lib/empty-copy";

export const Route = createFileRoute("/admin/invoices/new")({
  component: NewInvoicePage,
});

function NewInvoicePage() {
  const copy = EMPTY_COPY["invoiceNew.noUnbilled"];

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/invoices">Back to invoices</BackLink>
      <PageHeader
        eyebrow="Billing"
        title="New invoice"
        description="Pick a broker, select completed loads, review totals, send to billing email."
      />

      <Card className="gap-0 p-0">
        <div className="border-b border-border px-5 py-4 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Unbilled completed loads
        </div>
        <div className="p-6">
          <EmptyState
            icon={CheckCircle2}
            variant={copy.variant}
            title={copy.title}
            description={copy.description}
          />
        </div>
      </Card>
    </div>
  );
}
