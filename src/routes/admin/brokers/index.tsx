import { Link, createFileRoute } from "@tanstack/react-router";
import { Building2, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { FilterChips } from "@/components/data/FilterChips";
import { SearchInput } from "@/components/data/SearchInput";
import { AddBrokerDialog } from "@/components/forms/AddBrokerDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EMPTY_COPY } from "@/lib/empty-copy";
import {
  FIXTURE_BROKERS,
  PAYMENT_TERMS_LABEL,
  formatRatePerMile,
  gradeTone,
  type BrokerGrade,
} from "@/lib/fixtures/brokers";
import { formatMoneyCents } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/brokers/")({
  component: BrokersListPage,
});

type StatusFilter = "all" | "A" | "B" | "C" | "D";

function BrokersListPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return FIXTURE_BROKERS.filter((b) => {
      if (filter !== "all" && b.grade !== filter) return false;
      if (q) {
        const haystack = [
          b.companyName,
          b.mcNumber,
          b.dotNumber,
          b.contactName,
          b.contactEmail,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [filter, search]);

  const counts = useMemo(() => {
    const byGrade = { A: 0, B: 0, C: 0, D: 0 } as Record<BrokerGrade, number>;
    for (const b of FIXTURE_BROKERS) byGrade[b.grade]++;
    return {
      all: FIXTURE_BROKERS.length,
      ...byGrade,
    };
  }, []);

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
          <FilterChips<StatusFilter>
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

        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Building2}
              variant={EMPTY_COPY["brokers.filter"].variant}
              title={EMPTY_COPY["brokers.filter"].title}
              description={EMPTY_COPY["brokers.filter"].description}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilter("all");
                    setSearch("");
                  }}
                >
                  {EMPTY_COPY["brokers.filter"].ctaLabel}
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((b) => {
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
                          MC {b.mcNumber} · DOT {b.dotNumber} ·{" "}
                          {PAYMENT_TERMS_LABEL[b.paymentTerms]}
                        </span>
                      </div>
                    </div>
                    <div className="hidden shrink-0 items-center gap-6 text-right sm:flex">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Avg days to pay
                        </span>
                        <span className="font-mono text-sm font-semibold tabular-nums">
                          {b.avgDaysToPay}d
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Avg rate / mi
                        </span>
                        <span className="font-mono text-sm font-semibold tabular-nums">
                          {formatRatePerMile(b.avgRatePerMileCents)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Revenue YTD
                        </span>
                        <span className="font-mono text-sm font-semibold tabular-nums">
                          {formatMoneyCents(b.revenueYtdCents)}
                        </span>
                      </div>
                      <Badge variant="muted" className="text-[10px]">
                        {b.status}
                      </Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <AddBrokerDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
