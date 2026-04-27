import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import * as React from "react";
import { CheckCircle2, Receipt } from "lucide-react";

import { BackLink } from "@/components/common/BackLink";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatMoneyCents } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { toast } from "@/lib/toast";
import { listBrokers } from "@/server/functions/brokers";
import {
  createInvoice,
  listCompletedLoadsForBroker,
} from "@/server/functions/invoices";

export const Route = createFileRoute("/admin/invoices/new")({
  component: NewInvoicePage,
});

function NewInvoicePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [brokerId, setBrokerId] = React.useState<string>("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [adjustmentsDollars, setAdjustmentsDollars] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const brokersQuery = useQuery({
    queryKey: ["admin", "brokers"],
    queryFn: () => listBrokers({ data: { limit: 200, cursor: null } }),
  });

  const loadsQuery = useQuery({
    queryKey: ["admin", "invoices", "billable", brokerId],
    queryFn: () => listCompletedLoadsForBroker({ data: { brokerId } }),
    enabled: !!brokerId,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const adjCents = adjustmentsDollars
        ? Math.round(parseFloat(adjustmentsDollars) * 100)
        : 0;
      return createInvoice({
        data: {
          brokerId,
          loadIds: Array.from(selected),
          adjustmentsCents: Number.isNaN(adjCents) ? 0 : adjCents,
          notes: notes.trim() || null,
        },
      });
    },
    onSuccess: ({ invoice }) => {
      toast.success(`Invoice ${invoice.invoiceNumber} created`);
      queryClient.invalidateQueries({ queryKey: ["admin", "invoices"] });
      router.navigate({
        to: "/admin/invoices/$invoiceId",
        params: { invoiceId: invoice.id },
      });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  // Reset selection when broker changes
  React.useEffect(() => {
    setSelected(new Set());
  }, [brokerId]);

  const billableLoads = loadsQuery.data?.loads ?? [];
  const subtotalCents = billableLoads
    .filter((l) => selected.has(l.id))
    .reduce((sum, l) => sum + l.rateCents, 0);
  const adjCents = adjustmentsDollars
    ? Math.round(parseFloat(adjustmentsDollars) * 100) || 0
    : 0;
  const totalCents = subtotalCents + adjCents;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(billableLoads.map((l) => l.id)));
  }

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/invoices">Back to invoices</BackLink>
      <PageHeader
        eyebrow="Billing"
        title="New invoice"
        description="Pick a broker, select completed loads, review totals, save as draft."
      />

      {/* Broker picker */}
      <Card className="p-5">
        <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Broker
        </label>
        <div className="mt-2">
          <Select value={brokerId} onValueChange={setBrokerId}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Pick a broker…" />
            </SelectTrigger>
            <SelectContent>
              {(brokersQuery.data?.brokers ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.companyName}
                  {b.mcNumber ? ` · MC ${b.mcNumber}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {brokerId && (
        <Card className="gap-0 p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Unbilled completed loads
            </span>
            {billableLoads.length > 0 && (
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Select all ({billableLoads.length})
              </Button>
            )}
          </div>
          <QueryBoundary query={loadsQuery}>
            {(data) =>
              data.loads.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={CheckCircle2}
                    variant="caught-up"
                    title="No unbilled loads for this broker"
                    description="Every completed load with this broker is already on an invoice. Pick another broker or come back when more loads close."
                  />
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {data.loads.map((l) => {
                    const checked = selected.has(l.id);
                    return (
                      <li
                        key={l.id}
                        className="flex items-center gap-3 px-5 py-3"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(l.id)}
                          className="size-4"
                          id={`load-${l.id}`}
                        />
                        <label
                          htmlFor={`load-${l.id}`}
                          className="flex flex-1 cursor-pointer items-center justify-between gap-3"
                        >
                          <div className="flex flex-col">
                            <span className="font-mono text-sm font-semibold">
                              {l.loadNumber}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {l.commodity} · {l.miles ?? 0} mi · completed{" "}
                              {new Date(l.completedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <span className="font-mono text-sm font-semibold tabular-nums">
                            {formatMoneyCents(l.rateCents)}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )
            }
          </QueryBoundary>
        </Card>
      )}

      {/* Totals + adjustments */}
      {brokerId && billableLoads.length > 0 && (
        <Card className="p-5">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Adjustments + notes
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[12.5px] font-medium">
                Adjustments (USD, optional)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 50.00 for detention, -25.00 for discount"
                value={adjustmentsDollars}
                onChange={(e) => setAdjustmentsDollars(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[12.5px] font-medium">
                Notes (optional)
              </label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal note — not shown to broker."
              />
            </div>
          </div>

          <div className="mt-5 space-y-1.5 border-t border-border pt-4 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Subtotal ({selected.size} load{selected.size === 1 ? "" : "s"})
              </span>
              <span className="font-mono tabular-nums">
                {formatMoneyCents(subtotalCents)}
              </span>
            </div>
            {adjCents !== 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Adjustments</span>
                <span className="font-mono tabular-nums">
                  {formatMoneyCents(adjCents)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border pt-2 text-[15px] font-semibold">
              <span>Total</span>
              <span className="font-mono tabular-nums">
                {formatMoneyCents(totalCents)}
              </span>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => router.navigate({ to: "/admin/invoices" })}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="lg"
              disabled={selected.size === 0 || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              <Receipt className="size-4" />
              {createMutation.isPending
                ? "Creating…"
                : "Create draft invoice"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
