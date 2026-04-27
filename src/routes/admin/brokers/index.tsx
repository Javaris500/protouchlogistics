import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { TableSkeleton } from "@/components/common/Skeleton";
import { FilterChips } from "@/components/data/FilterChips";
import { SearchInput } from "@/components/data/SearchInput";
import { AddBrokerDialog } from "@/components/forms/AddBrokerDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { errorMessage } from "@/lib/errors";
import { formatMoneyCents } from "@/lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  createBroker,
  listBrokers,
  type BrokerGrade,
} from "@/server/functions/brokers";

export const Route = createFileRoute("/admin/brokers/")({
  component: BrokersListPage,
});

type GradeFilter = "all" | BrokerGrade;

const PAYMENT_TERMS_LABEL: Record<string, string> = {
  net_15: "Net 15",
  net_30: "Net 30",
  net_45: "Net 45",
  net_60: "Net 60",
  quick_pay: "QuickPay",
  other: "Other",
};

function gradeTone(grade: BrokerGrade): "success" | "primary" | "warning" | "muted" {
  if (grade === "A") return "success";
  if (grade === "B") return "primary";
  if (grade === "C") return "warning";
  return "muted";
}

function formatRatePerMile(cents: number): string {
  if (cents === 0) return "—";
  return `$${(cents / 100).toFixed(2)}/mi`;
}

function BrokersListPage() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<GradeFilter>("all");
  const [search, setSearch] = useState("");

  const brokersQuery = useQuery({
    queryKey: ["admin", "brokers", { filter, search }],
    queryFn: () =>
      listBrokers({
        data: {
          grade: filter === "all" ? undefined : filter,
          search: search.trim() || undefined,
          limit: 200,
          cursor: null,
        },
      }),
  });

  const createMutation = useMutation({
    mutationFn: (input: {
      companyName: string;
      mcNumber: string | null;
      dotNumber: string | null;
      contactName: string;
      contactPhone: string;
      contactEmail: string;
      billingEmail: string | null;
      addressLine1: string;
      city: string;
      state: string;
      zip: string;
      paymentTerms:
        | "net_15"
        | "net_30"
        | "net_45"
        | "net_60"
        | "quick_pay"
        | "other";
      notes: string | null;
    }) => createBroker({ data: input }),
    onSuccess: ({ broker }) => {
      toast.success(`${broker.companyName} added`);
      queryClient.invalidateQueries({ queryKey: ["admin", "brokers"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const allRows = brokersQuery.data?.brokers ?? [];

  const counts = useMemo(() => {
    const byGrade = { A: 0, B: 0, C: 0, D: 0 } as Record<BrokerGrade, number>;
    for (const b of allRows) byGrade[b.grade]++;
    return { all: allRows.length, ...byGrade };
  }, [allRows]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Partners"
        title="Brokers"
        description="All brokers with scorecards, payment aging, and load history."
        actions={
          <Button variant="primary" size="md" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add broker
          </Button>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <FilterChips<GradeFilter>
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "A", label: "Grade A", count: counts.A },
              { value: "B", label: "Grade B", count: counts.B },
              { value: "C", label: "Grade C", count: counts.C },
              { value: "D", label: "Grade D", count: counts.D },
            ]}
            value={filter}
            onChange={setFilter}
            label="Filter by grade"
          />
          <div className="w-full md:w-72">
            <SearchInput
              value={search}
              onValueChange={setSearch}
              placeholder="Name, MC, DOT, contact…"
            />
          </div>
        </div>

        <QueryBoundary
          query={brokersQuery}
          emptyKey={
            search.trim() || filter !== "all"
              ? "brokers.filter"
              : "brokers.firstTime"
          }
          isEmpty={(d) => d.brokers.length === 0}
          skeleton={<TableSkeleton rows={6} cols={4} className="m-3" />}
          emptyAction={
            search.trim() || filter !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilter("all");
                  setSearch("");
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="size-4" /> Add broker
              </Button>
            )
          }
        >
          {(data) => (
            <ul className="divide-y divide-border">
              {data.brokers.map((b) => {
                const tone = gradeTone(b.grade);
                const gradePalette =
                  tone === "success"
                    ? "bg-[color-mix(in_oklab,var(--success)_12%,transparent)] text-[var(--success)] ring-[var(--success)]/30"
                    : tone === "primary"
                      ? "bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)] ring-[var(--primary)]/30"
                      : tone === "warning"
                        ? "bg-[color-mix(in_oklab,var(--warning)_15%,transparent)] text-[var(--warning)] ring-[var(--warning)]/30"
                        : "bg-muted text-muted-foreground ring-[var(--border-strong)]";
                return (
                  <li key={b.id}>
                    <Link
                      to="/admin/brokers/$brokerId"
                      params={{ brokerId: b.id }}
                      className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/30 sm:px-5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          aria-label={`Grade ${b.grade}`}
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                            gradePalette,
                          )}
                        >
                          <span className="font-mono text-base font-bold">
                            {b.grade}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-semibold">
                            {b.companyName}
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground">
                            {b.mcNumber ? `MC ${b.mcNumber}` : "MC —"}
                            {" · "}
                            {b.dotNumber ? `DOT ${b.dotNumber}` : "DOT —"}
                            {" · "}
                            {PAYMENT_TERMS_LABEL[b.paymentTerms] ??
                              b.paymentTerms}
                          </span>
                        </div>
                      </div>
                      <div className="hidden shrink-0 items-center gap-6 text-right sm:flex">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Star rating
                          </span>
                          <span className="font-mono text-sm font-semibold tabular-nums">
                            {b.starRating}/5
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Avg rate / mi
                          </span>
                          <span className="font-mono text-sm font-semibold tabular-nums">
                            {formatRatePerMile(0)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Revenue YTD
                          </span>
                          <span className="font-mono text-sm font-semibold tabular-nums">
                            {formatMoneyCents(0)}
                          </span>
                        </div>
                        <Badge variant="muted" className="text-[10px]">
                          {b.deletedAt ? "archived" : "active"}
                        </Badge>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </QueryBoundary>
      </Card>

      <AddBrokerDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={async (values) => {
          await createMutation.mutateAsync({
            companyName: values.companyName.trim(),
            mcNumber: values.mcNumber.trim() || null,
            dotNumber: values.dotNumber.trim() || null,
            contactName: values.contactName.trim(),
            contactPhone: values.contactPhone.trim(),
            contactEmail: values.contactEmail.trim().toLowerCase(),
            billingEmail: values.billingEmail.trim().toLowerCase() || null,
            addressLine1: values.addressLine1.trim(),
            city: values.city.trim(),
            state: values.state.trim().toUpperCase(),
            zip: values.zip.trim(),
            paymentTerms: values.paymentTerms,
            notes: values.notes.trim() || null,
          });
        }}
      />
    </div>
  );
}
