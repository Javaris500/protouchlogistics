import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus, Receipt } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EMPTY_COPY } from "@/lib/empty-copy";

export const Route = createFileRoute("/admin/invoices/")({
  component: InvoicesListPage,
});

function InvoicesListPage() {
  const copy = EMPTY_COPY["invoices.firstTime"];

  return (
    <div className="flex flex-col gap-5">
      <div className="animate-enter stagger-1">
        <PageHeader
          eyebrow="Billing"
          title="Invoices"
          description="Generate, send, and reconcile broker invoices."
          actions={
            <Button asChild variant="primary" size="md">
              <Link to="/admin/invoices/new">
                <Plus className="size-4" />
                New invoice
              </Link>
            </Button>
          }
        />
      </div>

      <Card className="animate-enter stagger-2 p-6">
        <EmptyState
          icon={Receipt}
          variant={copy.variant}
          title={copy.title}
          description={copy.description}
          action={
            copy.ctaLabel && copy.ctaHref ? (
              <Button asChild variant="primary" size="sm">
                <Link to="/admin/invoices/new">
                  <Plus className="size-4" />
                  {copy.ctaLabel}
                </Link>
              </Button>
            ) : undefined
          }
        />
      </Card>
    </div>
  );
}
