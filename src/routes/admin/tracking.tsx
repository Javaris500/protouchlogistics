import { createFileRoute } from "@tanstack/react-router";
import { MapPinned } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { EMPTY_COPY } from "@/lib/empty-copy";

export const Route = createFileRoute("/admin/tracking")({
  component: TrackingPage,
});

function TrackingPage() {
  const copy = EMPTY_COPY["tracking.firstTime"];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Live"
        title="Fleet Tracking"
        description="Real-time driver positions on active loads with breadcrumb trails."
      />

      <Card className="relative flex min-h-[65vh] flex-col items-center justify-center overflow-hidden py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative w-full max-w-md px-6">
          <EmptyState
            icon={MapPinned}
            variant={copy.variant}
            title={copy.title}
            description={copy.description}
            className="border-transparent bg-transparent"
          />
        </div>
      </Card>
    </div>
  );
}
