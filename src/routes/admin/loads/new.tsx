import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";

import { BackLink } from "@/components/common/BackLink";
import { PageHeader } from "@/components/common/PageHeader";
import { PagePlaceholder } from "@/components/common/PagePlaceholder";

export const Route = createFileRoute("/admin/loads/new")({
  component: NewLoadPage,
});

function NewLoadPage() {
  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/loads">Back to loads</BackLink>
      <PageHeader
        eyebrow="Dispatch"
        title="New load"
        description="Create a load manually. For broker-emailed rate confirmations, use the AI intake (Phase 1.5)."
      />
      <PagePlaceholder
        title="Create-load form coming soon"
        description="Broker + pickup/delivery (Google Places autocomplete), commodity, rate, driver/truck assignment, rate confirmation upload. Wires to the createLoad server function."
      >
        <div className="flex items-center gap-2">
          <Package className="size-4 text-[var(--primary)]" />
          Spec: 03-ROUTES-AND-FEATURES §2.2
        </div>
      </PagePlaceholder>
    </div>
  );
}
