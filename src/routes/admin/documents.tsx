import { createFileRoute } from "@tanstack/react-router";
import { FileText, Upload } from "lucide-react";

import { toast } from "@/lib/toast";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EMPTY_COPY } from "@/lib/empty-copy";

export const Route = createFileRoute("/admin/documents")({
  component: DocumentsPage,
});

function DocumentsPage() {
  const copy = EMPTY_COPY["documents.firstTime"];

  return (
    <div className="flex flex-col gap-5">
      <div className="animate-enter stagger-1">
        <PageHeader
          eyebrow="Compliance"
          title="Documents"
          description="Global document library with expiration tracking. Stay DOT-compliant."
          actions={
            <Button
              variant="primary"
              size="md"
              onClick={() => toast.info("Document upload — coming soon")}
            >
              <Upload className="size-4" />
              Upload document
            </Button>
          }
        />
      </div>

      <Card className="animate-enter stagger-2 p-6">
        <EmptyState
          icon={FileText}
          variant={copy.variant}
          title={copy.title}
          description={copy.description}
          action={
            copy.ctaLabel ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => toast.info("Document upload — coming soon")}
              >
                <Upload className="size-4" />
                {copy.ctaLabel}
              </Button>
            ) : undefined
          }
        />
      </Card>
    </div>
  );
}
