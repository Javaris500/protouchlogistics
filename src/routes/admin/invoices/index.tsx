import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpDown,
  Clock,
  DollarSign,
  Download,
  FileText,
  Mail,
  Plus,
  Receipt,
  Send,
} from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { KpiCard } from "@/components/common/KpiCard";
import { PageHeader } from "@/components/common/PageHeader";
import { FilterChips } from "@/components/data/FilterChips";
import { Pagination } from "@/components/data/Pagination";
import { SearchInput } from "@/components/data/SearchInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { InvoiceStatus } from "@/components/ui/status-pill";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FIXTURE_INVOICES, type FixtureInvoice } from "@/lib/fixtures/invoices";
import { formatDateShort, formatMoneyCents, daysUntil } from "@/lib/format";

export const Route = createFileRoute("/admin/invoices/")({
  component: InvoicesListPage,
});

type StatusFilter = "all" | "draft" | "sent" | "paid" | "overdue" | "void";

const PAGE_SIZE = 10;

function InvoicesListPage() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const counts = useMemo(() => {
    const c = (s: InvoiceStatus) =>
      FIXTURE_INVOICES.filter((i) => i.status === s).length;
    return {
      all: FIXTURE_INVOICES.length,
      draft: c("draft"),
      sent: c("sent"),
      paid: c("paid"),
      overdue: c("overdue"),
      void: c("void"),
    };
  }, []);

  const kpis = useMemo(() => {
    const outstanding = FIXTURE_INVOICES.filter(
      (i) => i.status === "sent" || i.status === "overdue",
    ).reduce((sum, i) => sum + i.totalCents, 0);
    const overdue = FIXTURE_INVOICES.filter(
      (i) => i.status === "overdue",
    ).reduce((sum, i) => sum + i.totalCents, 0);
    const paidThisMonth = FIXTURE_INVOICES.filter(
      (i) => i.status === "paid" && i.paidAt && daysUntil(i.paidAt) > -30,
    ).reduce((sum, i) => sum + i.totalCents, 0);
    return { outstanding, overdue, paidThisMonth };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return FIXTURE_INVOICES.filter((i) => {
      if (status !== "all" && i.status !== status) return false;
      if (q) {
        const haystack = [i.invoiceNumber, i.broker.companyName, ...i.loads]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [status, search]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-5">
      <div className="animate-enter stagger-1">
        <PageHeader
          eyebrow="Billing"
          title="Invoices"
          description="Generate, send, and reconcile broker invoices."
          actions={
            <>
              <Button variant="outline" size="md">
                <Download className="size-4" />
                Export
              </Button>
              <Button variant="primary" size="md">
                <Plus className="size-4" />
                New invoice
              </Button>
            </>
          }
        />
      </div>

      {/* KPI row */}
      <div className="animate-enter stagger-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Outstanding"
          value={formatMoneyCents(kpis.outstanding)}
          sublabel={`${counts.sent + counts.overdue} invoices`}
          icon={<Clock />}
        />
        <KpiCard
          label="Overdue"
          value={formatMoneyCents(kpis.overdue)}
          sublabel={`${counts.overdue} invoices`}
          icon={<DollarSign />}
          trend={
            kpis.overdue > 0
              ? {
                  direction: "up",
                  value: formatMoneyCents(kpis.overdue),
                  positiveIsGood: false,
                }
              : undefined
          }
        />
        <KpiCard
          label="Collected (30d)"
          value={formatMoneyCents(kpis.paidThisMonth)}
          sublabel={`${counts.paid} invoices paid`}
          icon={<DollarSign />}
        />
      </div>

      {/* Table card */}
      <Card className="animate-enter stagger-3 gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <FilterChips<StatusFilter>
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "draft", label: "Draft", count: counts.draft },
              { value: "sent", label: "Sent", count: counts.sent },
              { value: "overdue", label: "Overdue", count: counts.overdue },
              { value: "paid", label: "Paid", count: counts.paid },
            ]}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            label="Filter by status"
          />
          <div className="w-full md:w-72">
            <SearchInput
              value={search}
              onValueChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Invoice #, broker, load…"
            />
          </div>
        </div>

        {pageRows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Receipt}
              title="No invoices match these filters"
              description="Adjust the filters above or create a new invoice from completed loads."
              action={
                <Button variant="primary" size="sm">
                  <Plus className="size-4" />
                  New invoice
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <InvoicesTable rows={pageRows} />
            <div className="border-t border-border p-3">
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={filtered.length}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function InvoicesTable({ rows }: { rows: FixtureInvoice[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              Invoice
              <ArrowUpDown className="size-3" aria-hidden />
            </button>
          </TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Broker</TableHead>
          <TableHead>Loads</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Issued</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>Payment</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((inv) => {
          const dueDays = daysUntil(inv.dueDate);
          return (
            <TableRow key={inv.id} className="cursor-pointer">
              <TableCell>
                <span className="font-mono text-sm font-semibold">
                  {inv.invoiceNumber}
                </span>
              </TableCell>
              <TableCell>
                <StatusPill kind="invoice" status={inv.status} />
              </TableCell>
              <TableCell className="text-sm">
                {inv.broker.companyName}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <FileText className="size-3.5 text-muted-foreground" />
                  <span className="text-sm">{inv.loadCount}</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono text-sm tabular-nums font-medium">
                {formatMoneyCents(inv.totalCents)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDateShort(inv.issueDate)}
              </TableCell>
              <TableCell>
                <span
                  className={
                    inv.status === "overdue"
                      ? "text-sm font-medium text-[var(--danger)]"
                      : "text-sm text-muted-foreground"
                  }
                >
                  {formatDateShort(inv.dueDate)}
                  {inv.status === "overdue" && (
                    <span className="ml-1 text-[11px]">
                      ({Math.abs(dueDays)}d late)
                    </span>
                  )}
                </span>
              </TableCell>
              <TableCell>
                {inv.paidAt ? (
                  <div className="flex flex-col">
                    <span className="text-sm">{inv.paymentMethod}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDateShort(inv.paidAt)}
                    </span>
                  </div>
                ) : inv.status === "sent" || inv.status === "overdue" ? (
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    <Send className="size-3" />
                    Resend
                  </Button>
                ) : inv.status === "draft" ? (
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    <Mail className="size-3" />
                    Send
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
