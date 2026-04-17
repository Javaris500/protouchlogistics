import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";

import { BackLink } from "@/components/common/BackLink";
import { PageHeader } from "@/components/common/PageHeader";
import { PagePlaceholder } from "@/components/common/PagePlaceholder";

export const Route = createFileRoute("/admin/invoices/new")({
  component: NewInvoicePage,
});

function NewInvoicePage() {
  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/invoices">Back to invoices</BackLink>
      <PageHeader
        eyebrow="Billing"
        title="New invoice"
        description="Pick a broker, select completed loads, review totals, send to billing email."
      />
      <PagePlaceholder
        title="Create-invoice form coming soon"
        description="Broker selector → list of completed loads for that broker → line-item table with adjustments → auto-calculated due date based on payment terms → preview PDF → send via Resend."
      >
        <div className="flex items-center gap-2">
          <Receipt className="size-4 text-[var(--primary)]" />
          Spec: 03-ROUTES-AND-FEATURES §2.6
        </div>
      </PagePlaceholder>
    </div>
  );
}
