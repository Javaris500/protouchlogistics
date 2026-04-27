import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Filter } from "lucide-react";

import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { TableSkeleton } from "@/components/common/Skeleton";
import { formatRelativeFromNow } from "@/lib/format";
import { listAudit } from "@/server/functions/audit";

export const Route = createFileRoute("/admin/settings/audit")({
  component: AuditPage,
});

function AuditPage() {
  const auditQuery = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => listAudit({ data: { limit: 100, cursor: null } }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Immutable record of every mutation. Filter by entity, user, or date
          range.
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled
          onClick={() => toast.info("Filter panel — coming soon")}
        >
          <Filter className="size-4" />
          Filters
        </Button>
      </div>

      <QueryBoundary
        query={auditQuery}
        emptyKey="settings.audit.firstTime"
        isEmpty={(d) => d.entries.length === 0}
        skeleton={<TableSkeleton rows={10} cols={4} />}
      >
        {(data) => (
          <Card className="gap-0 p-0">
            <ul className="divide-y divide-border">
              {data.entries.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm sm:px-5"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="font-medium">
                      {e.actor?.name || e.actor?.email || "System"}{" "}
                      <span className="text-muted-foreground">{e.action}</span>{" "}
                      <span className="font-mono text-[12px]">
                        {e.entityType}
                      </span>
                    </span>
                    {e.entityId && (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {e.entityId}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeFromNow(e.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </QueryBoundary>
    </div>
  );
}
