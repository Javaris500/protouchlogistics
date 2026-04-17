import { createFileRoute } from "@tanstack/react-router";
import { Clock, Filter, History, Search, User } from "lucide-react";

import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/settings/audit")({
  component: AuditPage,
});

/** Fixture audit entries to show the table shape */
const FIXTURE_AUDIT = [
  {
    id: "aud_01",
    action: "load.assign",
    entityType: "load",
    entity: "PTL-2026-0142",
    user: "Gary Tavel",
    detail: "Assigned Jordan Reeves + Truck 101",
    timestamp: "2 hours ago",
  },
  {
    id: "aud_02",
    action: "load.status_change",
    entityType: "load",
    entity: "PTL-2026-0141",
    user: "Marcus Holloway",
    detail: "accepted → en_route_pickup",
    timestamp: "3 hours ago",
  },
  {
    id: "aud_03",
    action: "driver.approve",
    entityType: "driver",
    entity: "Devon Walker",
    user: "Gary Tavel",
    detail: "Approved onboarding submission",
    timestamp: "5 hours ago",
  },
  {
    id: "aud_04",
    action: "invoice.send",
    entityType: "invoice",
    entity: "PTL-INV-2026-0015",
    user: "Gary Tavel",
    detail: "Sent to CH Robinson (billing@chrobinson.com)",
    timestamp: "Yesterday",
  },
  {
    id: "aud_05",
    action: "document.upload",
    entityType: "document",
    entity: "mason_cdl_scan.pdf",
    user: "Terrell Mason",
    detail: "CDL upload during onboarding",
    timestamp: "Yesterday",
  },
  {
    id: "aud_06",
    action: "truck.update",
    entityType: "truck",
    entity: "Truck T-205",
    user: "Gary Tavel",
    detail: "Updated currentMileage: 142,500 → 143,200",
    timestamp: "2 days ago",
  },
  {
    id: "aud_07",
    action: "invoice.mark_paid",
    entityType: "invoice",
    entity: "PTL-INV-2026-0012",
    user: "Gary Tavel",
    detail: "Marked paid — ACH $7,250.00",
    timestamp: "3 days ago",
  },
  {
    id: "aud_08",
    action: "load.create",
    entityType: "load",
    entity: "PTL-2026-0137",
    user: "Gary Tavel",
    detail: "Draft load — Tulsa, OK → Phoenix, AZ",
    timestamp: "3 days ago",
  },
];

const ACTION_COLORS: Record<string, string> = {
  load: "primary",
  driver: "warning",
  invoice: "info",
  document: "success",
  truck: "muted",
};

function AuditPage() {
  return (
    <div className="flex flex-col gap-4">
      {/* Layout (src/routes/admin/settings.tsx) owns the PageHeader + tabs.
          Keeping a section-level Filters button inline here so the tab
          content still has local actions where they belong. */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Immutable record of every mutation. Filter by entity, user, or date
          range.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.info("Filter panel — coming soon")}
        >
          <Filter className="size-4" />
          Filters
        </Button>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        {/* Timeline-style entries */}
        <div className="divide-y divide-border">
          {FIXTURE_AUDIT.map((entry, i) => {
            const badgeVariant =
              (ACTION_COLORS[entry.entityType] as
                | "primary"
                | "warning"
                | "info"
                | "success"
                | "muted") ?? "muted";
            return (
              <div
                key={entry.id}
                className="flex items-start gap-4 px-5 py-4 transition-colors duration-150 ease-out hover:bg-[var(--surface)]"
              >
                {/* Timeline dot */}
                <div className="mt-1.5 flex flex-col items-center">
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      entry.entityType === "load" && "bg-[var(--primary)]",
                      entry.entityType === "driver" && "bg-[var(--warning)]",
                      entry.entityType === "invoice" && "bg-[var(--info)]",
                      entry.entityType === "document" && "bg-[var(--success)]",
                      entry.entityType === "truck" && "bg-muted-foreground",
                    )}
                  />
                  {i < FIXTURE_AUDIT.length - 1 && (
                    <div className="mt-1 h-full w-px bg-border" />
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={badgeVariant} className="text-[10px]">
                      {entry.action}
                    </Badge>
                    <span className="font-mono text-sm font-medium">
                      {entry.entity}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {entry.detail}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-subtle-foreground">
                    <span className="flex items-center gap-1">
                      <User className="size-3" />
                      {entry.user}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {entry.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toast.info("Pagination — coming soon")}
          >
            Load more entries
          </Button>
        </div>
      </Card>
    </div>
  );
}
