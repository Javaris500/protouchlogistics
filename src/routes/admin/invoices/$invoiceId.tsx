import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  Mail,
  MoreHorizontal,
  Printer,
  Receipt,
  Send,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { toast } from "@/lib/toast";
import { BackLink } from "@/components/common/BackLink";
import { EntityChip } from "@/components/common/EntityChip";
import { PageHeader } from "@/components/common/PageHeader";
import {
  INVOICE_PROGRESS_STEPS,
  StatusProgressBar,
  invoiceStatusToProgress,
} from "@/components/common/StatusProgressBar";
import { Badge } from "@/components/ui/badge";
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
import type { InvoiceStatus } from "@/components/ui/status-pill";
import { brokerById } from "@/lib/fixtures/brokers";
import type { FixtureInvoice } from "@/lib/fixtures/invoices";
import { FIXTURE_INVOICES } from "@/lib/fixtures/invoices";
import { FIXTURE_LOADS } from "@/lib/fixtures/loads";
import { daysUntil, formatDateShort, formatMoneyCents } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  const broker = brokerById(invoice.broker.id);
  const progress = invoiceStatusToProgress(invoice.status);
  const primary = primaryActionFor(invoice.status);
  const dueDays = daysUntil(invoice.dueDate);
  const isOverdue = invoice.status === "overdue";
  const isPaid = invoice.status === "paid";
  const isVoid = invoice.status === "void";

  const lineItems = buildLineItems(invoice);

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/invoices">Back to invoices</BackLink>

      <section className="animate-enter stagger-1 flex flex-col gap-5">
        <PageHeader
          eyebrow="Invoice"
          title={
            <span className="inline-flex flex-wrap items-center gap-3">
              <span className="font-mono">{invoice.invoiceNumber}</span>
              <StatusPill kind="invoice" status={invoice.status} />
            </span>
          }
          description={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <EntityChip
                kind="broker"
                id={invoice.broker.id}
                label={invoice.broker.companyName}
                size="sm"
              />
              <span className="text-muted-foreground">
                Issued {formatDateShort(invoice.issueDate)} · Due{" "}
                {formatDateShort(invoice.dueDate)}
              </span>
            </span>
          }
          actions={
            <>
              <Button
                variant="outline"
                size="md"
                onClick={() =>
                  toast.success(
                    `Invoice ${invoice.invoiceNumber} PDF generated`,
                  )
                }
              >
                <Download className="size-4" /> PDF
              </Button>
              <Button
                variant={primary.variant}
                size="md"
                onClick={() => toast.info(`${primary.label} — coming soon`)}
              >
                <primary.icon className="size-4" /> {primary.label}
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
                  {!isPaid && !isVoid && (
                    <DropdownMenuItem
                      onSelect={() =>
                        toast.success(
                          `Invoice ${invoice.invoiceNumber} marked paid`,
                        )
                      }
                    >
                      <CheckCircle2 /> Mark paid
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onSelect={() =>
                      toast.success(
                        `Invoice ${invoice.invoiceNumber} email resent`,
                      )
                    }
                  >
                    <Mail /> Resend email
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => window.print()}>
                    <Printer /> Print
                  </DropdownMenuItem>
                  {!isVoid && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="danger"
                        onSelect={() => {
                          if (
                            window.confirm(
                              `Void invoice ${invoice.invoiceNumber}? The broker will no longer owe this amount and the loads go back to the unbilled pool.`,
                            )
                          ) {
                            toast.success(
                              `Invoice ${invoice.invoiceNumber} voided`,
                            );
                          }
                        }}
                      >
                        <XCircle /> Void invoice
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />

        {/* Overdue banner */}
        {isOverdue && (
          <Card className="flex items-start gap-3 border-[var(--danger)]/40 bg-[color-mix(in_oklab,var(--danger)_5%,var(--background))] p-4 sm:p-5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_oklab,var(--danger)_15%,transparent)] text-[var(--danger)]">
              <AlertTriangle className="size-5" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-sm font-semibold text-[var(--danger)]">
                {Math.abs(dueDays)} days past due
              </p>
              <p className="text-xs text-[var(--danger)]/80">
                Was due {formatDateShort(invoice.dueDate)}. Send a reminder or
                escalate to collections.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() =>
                toast.success(
                  `Payment reminder sent for ${invoice.invoiceNumber}`,
                )
              }
            >
              <Send className="size-3.5" /> Send reminder
            </Button>
          </Card>
        )}

        {/* Total hero + progress — 2-column layout on desktop, stacked on mobile */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card
            className={cn(
              "flex flex-col justify-center gap-1 p-6",
              "lg:col-span-1",
              "border-[var(--primary)]/25 bg-[color-mix(in_oklab,var(--primary)_5%,var(--background))]",
            )}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Total due
            </span>
            <span
              className={cn(
                "font-mono text-4xl font-bold leading-none tabular-nums sm:text-5xl",
                isPaid
                  ? "text-[var(--success)]"
                  : isVoid
                    ? "text-muted-foreground line-through"
                    : "text-[var(--primary)]",
              )}
            >
              {formatMoneyCents(invoice.totalCents)}
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {isPaid && invoice.paidAt ? (
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-[var(--success)]" />
                  Paid {formatDateShort(invoice.paidAt)}
                </span>
              ) : isVoid ? (
                <span className="inline-flex items-center gap-1">
                  <XCircle className="size-3" /> Voided
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {dueDays < 0
                    ? `Due ${Math.abs(dueDays)}d ago`
                    : dueDays === 0
                      ? "Due today"
                      : `Due in ${dueDays}d`}
                </span>
              )}
              {invoice.paymentMethod && (
                <span>via {invoice.paymentMethod}</span>
              )}
            </div>
          </Card>

          <Card className="p-5 lg:col-span-2">
            <StatusProgressBar
              steps={INVOICE_PROGRESS_STEPS}
              currentStepIndex={progress.index}
              cancelled={progress.cancelled}
              ariaLabel="Invoice lifecycle"
            />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <TimelineMini
                label="Issued"
                value={formatDateShort(invoice.issueDate)}
              />
              <TimelineMini
                label="Sent"
                value={invoice.sentAt ? formatDateShort(invoice.sentAt) : "—"}
                muted={!invoice.sentAt}
              />
              <TimelineMini
                label="Due"
                value={formatDateShort(invoice.dueDate)}
              />
              <TimelineMini
                label="Paid"
                value={invoice.paidAt ? formatDateShort(invoice.paidAt) : "—"}
                muted={!invoice.paidAt}
              />
            </div>
          </Card>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3 animate-enter stagger-2">
        <Card className="gap-0 p-0 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <Receipt className="size-3.5" /> Line items
            </div>
            <span className="text-[11px] text-muted-foreground">
              {invoice.loadCount} {invoice.loadCount === 1 ? "load" : "loads"}
            </span>
          </div>
          <ul className="divide-y divide-border">
            {lineItems.map((item) => (
              <li
                key={item.loadNumber}
                className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  {item.loadId ? (
                    <EntityChip
                      kind="load"
                      id={item.loadId}
                      label={item.loadNumber}
                      mono
                    />
                  ) : (
                    <span className="font-mono text-sm font-semibold">
                      {item.loadNumber}
                    </span>
                  )}
                  {item.lane && (
                    <span className="truncate text-[11px] text-muted-foreground">
                      {item.lane}
                    </span>
                  )}
                </div>
                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                  {formatMoneyCents(item.amountCents)}
                </span>
              </li>
            ))}
          </ul>
          <Separator />
          <div className="flex flex-col gap-2 px-4 py-4 sm:px-5">
            <Row
              label="Subtotal"
              value={formatMoneyCents(invoice.subtotalCents)}
            />
            {invoice.adjustmentsCents !== 0 && (
              <Row
                label="Adjustments"
                value={formatMoneyCents(invoice.adjustmentsCents)}
                muted
              />
            )}
            <Separator className="my-1" />
            <Row
              label="Total"
              value={formatMoneyCents(invoice.totalCents)}
              bold
            />
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Panel icon={Building2} title="Broker">
            {broker ? (
              <div className="flex flex-col gap-3">
                <EntityChip
                  kind="broker"
                  id={broker.id}
                  label={broker.companyName}
                />
                <dl className="flex flex-col gap-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Billing email</dt>
                    <dd className="truncate text-right font-mono">
                      {broker.billingEmail}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd className="font-mono">{broker.contactPhone}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Terms</dt>
                    <dd>Net {broker.paymentTerms.replace("net_", "")}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  {invoice.broker.companyName}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Broker detail unavailable. Add details in Brokers → Edit.
                </span>
              </div>
            )}
          </Panel>

          {isPaid && (
            <Panel icon={CheckCircle2} title="Payment">
              <dl className="flex flex-col gap-3 text-sm">
                {invoice.paidAt && (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Paid on</dt>
                    <dd className="font-mono tabular-nums">
                      {formatDateShort(invoice.paidAt)}
                    </dd>
                  </div>
                )}
                {invoice.paymentMethod && (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Method</dt>
                    <dd>{invoice.paymentMethod}</dd>
                  </div>
                )}
                {invoice.paidAmountCents !== null && (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Amount</dt>
                    <dd className="font-mono font-semibold tabular-nums text-[var(--success)]">
                      {formatMoneyCents(invoice.paidAmountCents)}
                    </dd>
                  </div>
                )}
              </dl>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

interface LineItem {
  loadNumber: string;
  loadId?: string;
  lane?: string;
  amountCents: number;
}

/**
 * Resolve each load number against FIXTURE_LOADS so line items can link
 * through to their detail page and show the real lane + per-load rate.
 * Falls back to an equal split of the subtotal when a load can't be found.
 */
function buildLineItems(invoice: FixtureInvoice): LineItem[] {
  const matches = invoice.loads.map((num) =>
    FIXTURE_LOADS.find((l) => l.loadNumber === num),
  );

  const knownSum = matches.reduce((sum, l) => sum + (l?.rateCents ?? 0), 0);
  const unknownCount = matches.filter((l) => !l).length;
  const unknownEach =
    unknownCount > 0
      ? Math.round((invoice.subtotalCents - knownSum) / unknownCount)
      : 0;

  return invoice.loads.map((loadNumber, i) => {
    const match = matches[i];
    if (match) {
      return {
        loadNumber,
        loadId: match.id,
        lane: `${match.pickup.city}, ${match.pickup.state} → ${match.delivery.city}, ${match.delivery.state}`,
        amountCents: match.rateCents,
      };
    }
    return {
      loadNumber,
      amountCents: unknownEach,
    };
  });
}

interface PrimaryAction {
  label: string;
  icon: LucideIcon;
  variant: "primary" | "outline";
}

function primaryActionFor(status: InvoiceStatus): PrimaryAction {
  switch (status) {
    case "draft":
      return { label: "Send to broker", icon: Send, variant: "primary" };
    case "sent":
      return { label: "Mark paid", icon: CheckCircle2, variant: "primary" };
    case "overdue":
      return { label: "Send reminder", icon: Mail, variant: "primary" };
    case "paid":
      return { label: "Download", icon: Download, variant: "outline" };
    case "void":
    default:
      return { label: "Duplicate", icon: Receipt, variant: "outline" };
  }
}

/* -------------------------------------------------------------------------- */
/*  Primitives                                                                */
/* -------------------------------------------------------------------------- */

function TimelineMini({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-sm tabular-nums",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 p-5", className)}>
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="size-3.5" /> {title}
      </div>
      <Separator className="my-3" />
      {children}
    </Card>
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
        className={cn(
          "font-mono tabular-nums",
          muted && "text-muted-foreground",
          bold && "text-base font-semibold",
        )}
      >
        {value}
      </span>
    </div>
  );
}
