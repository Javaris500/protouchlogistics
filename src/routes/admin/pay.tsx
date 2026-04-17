import { Link, createFileRoute } from "@tanstack/react-router";
import { Download, Wallet } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toCsv, downloadCsv } from "@/lib/csv";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/admin/pay")({
  component: PayOverviewPage,
});

const PERIODS = [
  {
    id: "2026-w12",
    label: "Mar 17 – Mar 23, 2026",
    status: "open" as const,
    totalCents: 24_850_00,
    loadCount: 18,
    driverCount: 5,
  },
  {
    id: "2026-w11",
    label: "Mar 10 – Mar 16, 2026",
    status: "settled" as const,
    totalCents: 22_410_00,
    loadCount: 17,
    driverCount: 5,
  },
  {
    id: "2026-w10",
    label: "Mar 3 – Mar 9, 2026",
    status: "settled" as const,
    totalCents: 19_980_00,
    loadCount: 14,
    driverCount: 5,
  },
];

function PayOverviewPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Billing"
        title="Driver Pay"
        description="Weekly pay periods. Settle to mark drivers paid; drill in for per-driver and per-load breakdowns."
        actions={
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              const csv = toCsv(
                PERIODS.map((p) => ({
                  period_id: p.id,
                  label: p.label,
                  status: p.status,
                  loads: p.loadCount,
                  drivers: p.driverCount,
                  total_cents: p.totalCents,
                })),
              );
              downloadCsv(
                `pay-periods-${new Date().toISOString().slice(0, 10)}`,
                csv,
              );
              toast.success(`Exported ${PERIODS.length} pay periods`);
            }}
          >
            <Download className="size-4" /> Export CSV
          </Button>
        }
      />

      <Card className="gap-0 p-0">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Wallet className="size-3.5" /> Recent periods
        </div>
        <ul className="divide-y divide-border">
          {PERIODS.map((p) => (
            <li key={p.id}>
              <Link
                to="/admin/pay/$periodId"
                params={{ periodId: p.id }}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--surface-2)]/60 focus-visible:bg-[var(--surface-2)]/60 focus-visible:outline-none"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{p.label}</span>
                    <Badge
                      variant={p.status === "open" ? "warning" : "success"}
                    >
                      {p.status === "open" ? "Open" : "Settled"}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {p.loadCount} loads · {p.driverCount} drivers
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono text-base font-semibold tabular-nums">
                    ${(p.totalCents / 100).toLocaleString()}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Period total
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
