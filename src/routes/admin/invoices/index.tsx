import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "@/lib/toast";
import { toCsv, downloadCsv } from "@/lib/csv";
import {
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
import { cn } from "@/lib/utils";

import { EmptyState } from "@/components/common/EmptyState";
import { KpiCard } from "@/components/common/KpiCard";
import { PageHeader } from "@/components/common/PageHeader";
import { FilterChips } from "@/components/data/FilterChips";
import { Pagination } from "@/components/data/Pagination";
import { SearchInput } from "@/components/data/SearchInput";
import { SortButton } from "@/components/data/SortButton";
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

type SortKey = "invoice" | "total" | "issued" | "due";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;

function InvoicesListPage() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  // Default: most recently issued first
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "issued",
    dir: "desc",
  });

  const toggleSort = (key: SortKey) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : // New column: newest-first default for dates, high-to-low for money,
          // a-z for strings. Invoice # is treated as a string.
          { key, dir: key === "invoice" ? "asc" : "desc" },
    );
    setPage(1);
  };

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

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sort.key) {
        case "invoice":
          cmp = a.invoiceNumber.localeCompare(b.invoiceNumber);
          break;
        case "total":
          cmp = a.totalCents - b.totalCents;
          break;
        case "issued":
          // ISO dates (YYYY-MM-DD) sort lexically
          cmp = a.issueDate.localeCompare(b.issueDate);
          break;
        case "due":
          cmp = a.dueDate.localeCompare(b.dueDate);
          break;
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sort]);

  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-5">
      <div className="animate-enter stagger-1">
        <PageHeader
          eyebrow="Billing"
          title="Invoices"
          description="Generate, send, and reconcile broker invoices."
          actions={
            <>
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  const csv = toCsv(
                    sorted.map((i) => ({
                      invoice_number: i.invoiceNumber,
                      status: i.status,
                      broker: i.broker.companyName,
                      loads: i.loadCount,
                      total_cents: i.totalCents,
                      issue_date: i.issueDate,
                      due_date: i.dueDate,
                      paid_at: i.paidAt ?? "",
                      payment_method: i.paymentMethod ?? "",
                    })),
                  );
                  if (!csv) {
                    toast.info("Nothing to export with current filters");
                    return;
                  }
                  downloadCsv(
                    `invoices-${new Date().toISOString().slice(0, 10)}`,
                    csv,
                  );
                  toast.success(`Exported ${sorted.length} invoices`);
                }}
              >
                <Download className="size-4" />
                Export
              </Button>
              <Button asChild variant="primary" size="md">
                <Link to="/admin/invoices/new">
                  <Plus className="size-4" />
                  New invoice
                </Link>
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
          <>
            <InvoicesTable
              rows={pageRows}
              sort={sort}
              onToggleSort={toggleSort}
            />
            <div className="border-t border-border p-3">
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={sorted.length}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function InvoicesTable({
  rows,
  sort,
  onToggleSort,
}: {
  rows: FixtureInvoice[];
  sort: { key: SortKey; dir: SortDir };
  onToggleSort: (key: SortKey) => void;
}) {
  const navigate = useNavigate();
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead>
            <SortButton
              active={sort.key === "invoice"}
              direction={sort.key === "invoice" ? sort.dir : null}
              onToggle={() => onToggleSort("invoice")}
            >
              Invoice
            </SortButton>
          </TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Broker</TableHead>
          <TableHead>Loads</TableHead>
          <TableHead className="text-right">
            <SortButton
              active={sort.key === "total"}
              direction={sort.key === "total" ? sort.dir : null}
              onToggle={() => onToggleSort("total")}
            >
              Total
            </SortButton>
          </TableHead>
          <TableHead>
            <SortButton
              active={sort.key === "issued"}
              direction={sort.key === "issued" ? sort.dir : null}
              onToggle={() => onToggleSort("issued")}
            >
              Issued
            </SortButton>
          </TableHead>
          <TableHead>
            <SortButton
              active={sort.key === "due"}
              direction={sort.key === "due" ? sort.dir : null}
              onToggle={() => onToggleSort("due")}
            >
              Due
            </SortButton>
          </TableHead>
          <TableHead>Payment</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((inv) => {
          const dueDays = daysUntil(inv.dueDate);
          return (
            <TableRow
              key={inv.id}
              className="cursor-pointer"
              onClick={() =>
                navigate({
                  to: "/admin/invoices/$invoiceId",
                  params: { invoiceId: inv.id },
                })
              }
            >
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Send className="size-3" />
                    Resend
                  </Button>
                ) : inv.status === "draft" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
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
