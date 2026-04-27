import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { BackLink } from "@/components/common/BackLink";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { CardSkeleton } from "@/components/common/Skeleton";
import { Card } from "@/components/ui/card";
import { formatMoneyCents } from "@/lib/format";
import { getInvoice } from "@/server/functions/invoices";

export const Route = createFileRoute("/admin/invoices/$invoiceId")({
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { invoiceId } = Route.useParams();

  const invoiceQuery = useQuery({
    queryKey: ["admin", "invoice", invoiceId],
    queryFn: () => getInvoice({ data: { invoiceId } }),
  });

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/invoices">Back to invoices</BackLink>

      <QueryBoundary
        query={invoiceQuery}
        skeleton={<CardSkeleton />}
        errorTitle="Couldn't load invoice"
      >
        {(detail) => (
          <>
            <PageHeader
              eyebrow="Invoice"
              title={detail.invoice.invoiceNumber}
              description={detail.broker?.companyName ?? undefined}
            />
            <Card className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Total
                </span>
                <span className="font-mono text-2xl font-bold tabular-nums">
                  {formatMoneyCents(detail.invoice.totalCents)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">
                  {detail.invoice.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Issued</span>
                <span className="font-mono">{detail.invoice.issueDate}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Due</span>
                <span className="font-mono">{detail.invoice.dueDate}</span>
              </div>
            </Card>
            {detail.lineItems.length > 0 && (
              <Card className="gap-0 p-0">
                <ul className="divide-y divide-border">
                  {detail.lineItems.map((li) => (
                    <li
                      key={li.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
                    >
                      <span className="text-sm">{li.description}</span>
                      <span className="font-mono text-sm font-semibold tabular-nums">
                        {formatMoneyCents(li.amountCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </QueryBoundary>
    </div>
  );
}
