import { createFileRoute } from "@tanstack/react-router";
import { Filter, History } from "lucide-react";

import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { EMPTY_COPY } from "@/lib/empty-copy";

export const Route = createFileRoute("/admin/settings/audit")({
  component: AuditPage,
});

function AuditPage() {
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

      <EmptyState
        icon={History}
        title={EMPTY_COPY["settings.audit.firstTime"].title}
        description={EMPTY_COPY["settings.audit.firstTime"].description}
        variant={EMPTY_COPY["settings.audit.firstTime"].variant}
      />
    </div>
  );
}
