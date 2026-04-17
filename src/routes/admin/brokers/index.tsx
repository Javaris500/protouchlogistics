import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";

import { PagePlaceholder } from "@/components/common/PagePlaceholder";
import { PageHeader } from "@/components/common/PageHeader";
import { AddBrokerDialog } from "@/components/forms/AddBrokerDialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/brokers/")({
  component: BrokersListPage,
});

function BrokersListPage() {
  const [addOpen, setAddOpen] = useState(false);

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

      <PagePlaceholder
        title="Brokers list coming soon"
        description="Broker cards with scorecards (on-time pay %, avg rate/mile, grade) and load history land here. The add flow is live — try the button above."
      />

      <AddBrokerDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
