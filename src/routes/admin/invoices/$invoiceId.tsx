import { Link, createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";

import { BackLink } from "@/components/common/BackLink";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FIXTURE_INVOICES } from "@/lib/fixtures/invoices";

export const Route = createFileRoute("/admin/invoices/$invoiceId")({
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { invoiceId } = Route.useParams();
  const invoice = FIXTURE_INVOICES.find((i) => i.id === invoiceId);

  if (!invoice) {
    return (
      <div className="flex flex-col gap-5">
        <BackLink to="/admin/invoices">Back to invoices</BackLink>
        <PageHeader eyebrow="Invoice" title="Invoice not found" />
        <Card className="p-6">
          <EmptyState
            icon={Receipt}
            variant="first-time"
            title="We couldn't find that invoice"
            description="It may have been voided, or the link is out of date. Head back to the invoices list to pick another one or start a new one."
            action={
              <Button asChild variant="primary" size="sm">
                <Link to="/admin/invoices">Back to invoices</Link>
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  // Kept as a guard; FIXTURE_INVOICES is currently empty so this branch is
  // unreachable until real data lands.
  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/invoices">Back to invoices</BackLink>
      <PageHeader eyebrow="Invoice" title={invoice.invoiceNumber} />
    </div>
  );
}
