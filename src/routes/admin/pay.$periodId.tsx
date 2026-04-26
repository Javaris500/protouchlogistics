import { Link, createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";

import { BackLink } from "@/components/common/BackLink";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/admin/pay/$periodId")({
  component: PayPeriodDetailPage,
});

function PayPeriodDetailPage() {
  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/pay">Back to driver pay</BackLink>
      <PageHeader eyebrow="Pay period" title="Pay period not found" />
      <Card className="p-6">
        <EmptyState
          icon={Wallet}
          variant="first-time"
          title="We couldn't find that pay period"
          description="Pay periods are generated automatically once loads complete. Head back to the pay overview to see what's available."
          action={
            <Button asChild variant="primary" size="sm">
              <Link to="/admin/pay">Back to driver pay</Link>
            </Button>
          }
        />
      </Card>
    </div>
  );
}
