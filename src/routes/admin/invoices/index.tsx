import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus, Receipt } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { InvoiceStatus } from "@/components/ui/status-pill";
import { EMPTY_COPY } from "@/lib/empty-copy";
import { formatMoneyCents } from "@/lib/format";
import { listInvoices } from "@/server/functions/invoices";

export const Route = createFileRoute("/admin/invoices/")({
  component: InvoicesListPage,
});

function InvoicesListPage() {
  const invoicesQuery = useQuery({
    queryKey: ["admin", "invoices"],
    queryFn: () => listInvoices({ data: {} }),
  });

  const copy = EMPTY_COPY["invoices.firstTime"];

  return (
    <div className="flex flex-col gap-5">
      <div className="animate-enter stagger-1">
        <PageHeader
          eyebrow="Billing"
          title="Invoices"
          description="Generate, send, and reconcile broker invoices."
          actions={
            <Button asChild variant="primary" size="md">
              <Link to="/admin/invoices/new">
                <Plus className="size-4" />
                New invoice
              </Link>
            </Button>
          }
        />
      </div>

      <Card className="animate-enter stagger-2 gap-0 p-0 overflow-hidden">
        <QueryBoundary query={invoicesQuery}>
          {(data) =>
            data.invoices.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Receipt}
                  variant={copy.variant}
                  title={copy.title}
                  description={copy.description}
                  action={
                    <Button asChild variant="primary" size="sm">
                      <Link to="/admin/invoices/new">
                        <Plus className="size-4" />
                        New invoice
                      </Link>
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="divide-y divide-border">
                <div className="grid grid-cols-[1.4fr_1.4fr_1fr_1fr_auto] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Invoice #</span>
                  <span>Broker</span>
                  <span>Status</span>
                  <span className="text-right">Total</span>
                  <span className="text-right">Due</span>
                </div>
                {data.invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    to="/admin/invoices/$invoiceId"
                    params={{ invoiceId: inv.id }}
                    className="grid grid-cols-[1.4fr_1.4fr_1fr_1fr_auto] gap-4 px-5 py-3 items-center text-[13px] hover:bg-muted/40 transition-colors"
                  >
                    <span className="font-mono font-semibold">
                      {inv.invoiceNumber}
                    </span>
                    <span className="truncate">{inv.broker.companyName}</span>
                    <span>
                      <StatusPill
                        kind="invoice"
                        status={inv.status as InvoiceStatus}
                      />
                    </span>
                    <span className="font-mono tabular-nums text-right">
                      {formatMoneyCents(inv.totalCents)}
                    </span>
                    <span className="text-right text-muted-foreground tabular-nums">
                      {inv.dueDate}
                    </span>
                  </Link>
                ))}
              </div>
            )
          }
        </QueryBoundary>
      </Card>
    </div>
  );
}
