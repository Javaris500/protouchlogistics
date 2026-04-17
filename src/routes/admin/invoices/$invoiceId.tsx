import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  Download,
  FileText,
  Mail,
  MoreHorizontal,
  Printer,
  Receipt,
  Send,
  XCircle,
} from "lucide-react";

import { BackLink } from "@/components/common/BackLink";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { StatusPill } from "@/components/ui/status-pill";
import { FIXTURE_INVOICES } from "@/lib/fixtures/invoices";
import { formatDateShort, formatMoneyCents } from "@/lib/format";

export const Route = createFileRoute("/admin/invoices/$invoiceId")({
  loader: ({ params }) => {
    const invoice = FIXTURE_INVOICES.find((i) => i.id === params.invoiceId);
    if (!invoice) throw notFound();
    return { invoice };
  },
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { invoice } = Route.useLoaderData();

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/invoices">Back to invoices</BackLink>

      <PageHeader
        eyebrow="Invoice"
        title={
          <span className="inline-flex items-center gap-3">
            <span className="font-mono">{invoice.invoiceNumber}</span>
            <StatusPill kind="invoice" status={invoice.status} />
          </span>
        }
        description={`${invoice.broker.companyName} · Issued ${formatDateShort(invoice.issueDate)} · Due ${formatDateShort(invoice.dueDate)}`}
        actions={
          <>
            <Button variant="outline" size="md">
              <Download className="size-4" /> Download PDF
            </Button>
            <Button variant="primary" size="md">
              <Send className="size-4" /> Send to broker
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="More actions"
                  className="rounded-md"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Invoice actions</DropdownMenuLabel>
                <DropdownMenuItem>
                  <CheckCircle2 /> Mark paid
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail /> Resend email
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Printer /> Print
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="danger">
                  <XCircle /> Void invoice
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="gap-0 p-0 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <Receipt className="size-3.5" /> Line items
            </div>
            <span className="text-[11px] text-muted-foreground">
              {invoice.loads.length}{" "}
              {invoice.loads.length === 1 ? "load" : "loads"}
            </span>
          </div>
          <ul className="divide-y divide-border">
            {invoice.loads.map((loadNumber) => (
              <li
                key={loadNumber}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <FileText className="size-4 text-muted-foreground" />
                  <Link
                    to="/admin/loads"
                    className="font-mono text-sm font-medium hover:text-[var(--primary)]"
                  >
                    {loadNumber}
                  </Link>
                </div>
                <span className="font-mono text-sm tabular-nums text-muted-foreground">
                  —
                </span>
              </li>
            ))}
          </ul>
          <Separator />
          <div className="flex flex-col gap-2 px-5 py-4">
            <Row
              label="Subtotal"
              value={formatMoneyCents(invoice.totalCents)}
            />
            <Row label="Adjustments" value="$0.00" muted />
            <Separator className="my-1" />
            <Row
              label="Total"
              value={formatMoneyCents(invoice.totalCents)}
              bold
            />
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="gap-0 p-5">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <Building2 className="size-3.5" /> Broker
            </div>
            <Separator className="my-3" />
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                {invoice.broker.companyName}
              </span>
              <span className="text-xs text-muted-foreground">Billing: —</span>
            </div>
          </Card>

          <Card className="gap-0 p-5">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <Receipt className="size-3.5" /> Payment
            </div>
            <Separator className="my-3" />
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Issued</dt>
                <dd>{formatDateShort(invoice.issueDate)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Due</dt>
                <dd>{formatDateShort(invoice.dueDate)}</dd>
              </div>
              {invoice.paidAt && (
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Paid</dt>
                  <dd>{formatDateShort(invoice.paidAt)}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  bold,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span
        className={[
          "font-mono tabular-nums",
          muted ? "text-muted-foreground" : "",
          bold ? "text-base font-semibold" : "",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
