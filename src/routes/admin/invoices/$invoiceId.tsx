import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { CheckCircle2, Send } from "lucide-react";

import { BackLink } from "@/components/common/BackLink";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { CardSkeleton } from "@/components/common/Skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { InvoiceStatus } from "@/components/ui/status-pill";
import { errorMessage } from "@/lib/errors";
import { formatMoneyCents } from "@/lib/format";
import { toast } from "@/lib/toast";
import {
  getInvoice,
  markInvoicePaid,
  markInvoiceSent,
} from "@/server/functions/invoices";

export const Route = createFileRoute("/admin/invoices/$invoiceId")({
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { invoiceId } = Route.useParams();
  const queryClient = useQueryClient();
  const [sendOpen, setSendOpen] = React.useState(false);
  const [paidOpen, setPaidOpen] = React.useState(false);

  const invoiceQuery = useQuery({
    queryKey: ["admin", "invoice", invoiceId],
    queryFn: () => getInvoice({ data: { invoiceId } }),
  });

  const sendMutation = useMutation({
    mutationFn: () => markInvoiceSent({ data: { invoiceId } }),
    onSuccess: () => {
      toast.success("Invoice marked sent");
      queryClient.invalidateQueries({
        queryKey: ["admin", "invoice", invoiceId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "invoices"] });
      setSendOpen(false);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const paidMutation = useMutation({
    mutationFn: () => markInvoicePaid({ data: { invoiceId } }),
    onSuccess: () => {
      toast.success("Invoice marked paid");
      queryClient.invalidateQueries({
        queryKey: ["admin", "invoice", invoiceId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "invoices"] });
      setPaidOpen(false);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/invoices">Back to invoices</BackLink>

      <QueryBoundary
        query={invoiceQuery}
        skeleton={<CardSkeleton />}
        errorTitle="Couldn't load invoice"
      >
        {(detail) => {
          const status = detail.invoice.status as InvoiceStatus;
          const canSend = status === "draft";
          const canMarkPaid = status === "sent" || status === "overdue";

          return (
            <>
              <PageHeader
                eyebrow="Invoice"
                title={
                  <span className="inline-flex flex-wrap items-center gap-3">
                    <span className="font-mono">
                      {detail.invoice.invoiceNumber}
                    </span>
                    <StatusPill kind="invoice" status={status} />
                  </span>
                }
                description={detail.broker?.companyName ?? undefined}
                actions={
                  <>
                    {canSend && (
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => setSendOpen(true)}
                      >
                        <Send className="size-4" />
                        Mark as sent
                      </Button>
                    )}
                    {canMarkPaid && (
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => setPaidOpen(true)}
                      >
                        <CheckCircle2 className="size-4" />
                        Mark paid
                      </Button>
                    )}
                  </>
                }
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
                <div className="grid gap-y-2 sm:grid-cols-2 text-sm">
                  <Field label="Issued" value={detail.invoice.issueDate} />
                  <Field label="Due" value={detail.invoice.dueDate} />
                  <Field
                    label="Subtotal"
                    value={formatMoneyCents(detail.invoice.subtotalCents)}
                  />
                  <Field
                    label="Adjustments"
                    value={formatMoneyCents(detail.invoice.adjustmentsCents)}
                  />
                  {detail.invoice.sentAt && (
                    <Field
                      label="Sent"
                      value={new Date(detail.invoice.sentAt).toLocaleString()}
                    />
                  )}
                  {detail.invoice.paidAt && (
                    <Field
                      label="Paid"
                      value={new Date(detail.invoice.paidAt).toLocaleString()}
                    />
                  )}
                </div>
                {detail.invoice.notes && (
                  <div className="border-t border-border pt-3 text-[12.5px] text-muted-foreground whitespace-pre-wrap">
                    {detail.invoice.notes}
                  </div>
                )}
              </Card>

              {detail.lineItems.length > 0 && (
                <Card className="gap-0 p-0">
                  <div className="border-b border-border px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Line items
                  </div>
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

              <ConfirmDialog
                open={sendOpen}
                onOpenChange={setSendOpen}
                title="Mark invoice as sent?"
                description="Updates the invoice status to 'sent' and stamps the send time. Phase 1 doesn't email it automatically — copy the totals and send manually for now."
                confirmLabel="Mark as sent"
                onConfirm={() => sendMutation.mutate()}
              />
              <ConfirmDialog
                open={paidOpen}
                onOpenChange={setPaidOpen}
                title="Mark invoice as paid?"
                description={`Records payment of ${formatMoneyCents(detail.invoice.totalCents)} and stamps the paid date.`}
                confirmLabel="Mark paid"
                onConfirm={() => paidMutation.mutate()}
              />
            </>
          );
        }}
      </QueryBoundary>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
