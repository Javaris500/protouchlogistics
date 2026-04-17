import { createFileRoute } from "@tanstack/react-router";
import { MapPinned, Radio, Truck } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/tracking")({
  component: TrackingPage,
});

function TrackingPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Live"
        title="Fleet Tracking"
        description="Real-time driver positions on active loads with breadcrumb trails."
      />

      <Card className="relative flex min-h-[65vh] flex-col items-center justify-center gap-5 overflow-hidden py-16">
        {/* Faux map grid background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--primary)_12%,transparent)]">
            <MapPinned className="h-8 w-8 text-[var(--primary)]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-semibold">Live map coming soon</h2>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Full-viewport Mapbox map with active driver positions, clickable
              info cards, and breadcrumb trail overlays. Refreshes every 20
              seconds.
            </p>
          </div>

          {/* Preview of what active drivers will look like */}
          <div className="mt-4 flex flex-col gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Active drivers preview
            </p>
            <div className="flex flex-col gap-2">
              {[
                {
                  name: "Jordan Reeves",
                  truck: "101",
                  load: "PTL-2026-0142",
                  status: "En route",
                },
                {
                  name: "Marcus Holloway",
                  truck: "T-205",
                  load: "PTL-2026-0141",
                  status: "At pickup",
                },
              ].map((d) => (
                <div
                  key={d.name}
                  className="flex items-center gap-3 rounded-md bg-[var(--background)] px-3 py-2"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
                  </span>
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-medium">{d.name}</span>
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Truck className="size-3" />
                      {d.truck} · {d.load}
                    </span>
                  </div>
                  <Badge variant="primary">{d.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
