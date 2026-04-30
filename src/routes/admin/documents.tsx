import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Download,
  Eye,
  FileText,
  Trash2,
  Upload,
} from "lucide-react";
import * as React from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { UploadDocumentDialog } from "@/components/forms/UploadDocumentDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExpirationBadge } from "@/components/ui/expiration-badge";
import { errorMessage } from "@/lib/errors";
import { EMPTY_COPY } from "@/lib/empty-copy";
import { toast } from "@/lib/toast";
import {
  deleteDocument,
  downloadDocument,
  finalizeDocumentUploadFn,
  listDocuments,
  type FinalizeDocumentPayload,
} from "@/server/functions/documents";

export const Route = createFileRoute("/admin/documents")({
  component: DocumentsPage,
});

const DOC_TYPE_LABEL: Record<string, string> = {
  driver_cdl: "CDL",
  driver_medical: "Medical card",
  driver_mvr: "MVR",
  driver_drug_test: "Drug test",
  driver_other: "Other (driver)",
  truck_registration: "Registration",
  truck_insurance: "Insurance",
  truck_inspection: "Inspection",
  truck_other: "Other (truck)",
  load_bol: "BOL",
  load_rate_confirmation: "Rate conf",
  load_pod: "POD",
  load_lumper_receipt: "Lumper",
  load_scale_ticket: "Scale ticket",
  load_other: "Other (load)",
};

function DocumentsPage() {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [ownerKind, setOwnerKind] = React.useState<"driver" | "truck" | "load">(
    "driver",
  );
  const [ownerId, setOwnerId] = React.useState("");

  const docsQuery = useQuery({
    queryKey: ["documents.list"],
    queryFn: () => listDocuments({ data: {} }),
  });

  const expiringQuery = useQuery({
    queryKey: ["documents.expiring"],
    queryFn: () => listDocuments({ data: { expiringWithinDays: 30 } }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: FinalizeDocumentPayload) =>
      finalizeDocumentUploadFn({ data: payload }),
    onSuccess: () => {
      toast.success("Document uploaded");
      queryClient.invalidateQueries({ queryKey: ["documents.list"] });
      queryClient.invalidateQueries({ queryKey: ["documents.expiring"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) =>
      deleteDocument({ data: { documentId } }),
    onSuccess: () => {
      toast.success("Document deleted");
      queryClient.invalidateQueries({ queryKey: ["documents.list"] });
      queryClient.invalidateQueries({ queryKey: ["documents.expiring"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Delete failed"),
  });

  async function fetchBlobUrl(documentId: string): Promise<string> {
    // downloadDocument streams the bytes server-side (the read-write token
    // for private blobs lives only on the server). The browser turns the
    // response into a blob: URL we can either save (download) or open
    // (view in a new tab — browser renders PDFs and images natively).
    const response = (await downloadDocument({
      data: { documentId },
    })) as unknown as Response;
    if (!response || !(response instanceof Response) || !response.ok) {
      throw new Error("Couldn't reach the document");
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  async function handleView(documentId: string) {
    try {
      const url = await fetchBlobUrl(documentId);
      window.open(url, "_blank", "noopener,noreferrer");
      // Defer revocation so the new tab has time to claim the bytes on
      // slow networks. Modern browsers GC the blob once no tab references it.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't open the document");
    }
  }

  async function handleDownload(documentId: string, fileName: string) {
    try {
      const url = await fetchBlobUrl(documentId);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  }

  function openUploadFor(kind: "driver" | "truck" | "load") {
    setOwnerKind(kind);
    // No ownerId — UploadDocumentDialog renders an entity picker scoped to the
    // chosen kind so Gary picks by name (e.g. "Unit 101 — 2022 Cascadia") instead
    // of pasting a UUID. When uploading from a detail page, ownerId is set
    // directly and the picker is skipped.
    setOwnerId("");
    setUploadOpen(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="animate-enter stagger-1">
        <PageHeader
          eyebrow="Compliance"
          title="Documents"
          description="Global document library with expiration tracking. Stay DOT-compliant."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="md"
                onClick={() => openUploadFor("driver")}
              >
                <Upload className="size-4" />
                Driver doc
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => openUploadFor("truck")}
              >
                <Upload className="size-4" />
                Truck doc
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => openUploadFor("load")}
              >
                <Upload className="size-4" />
                Load doc
              </Button>
            </div>
          }
        />
      </div>

      <QueryBoundary query={expiringQuery} skeleton={<div />}>
        {(data) =>
          data.documents.length > 0 ? (
            <Card className="animate-enter stagger-2 border-[var(--warning)]/40 bg-[var(--warning)]/5 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-5 shrink-0 text-[var(--warning)]" />
                <div className="flex-1">
                  <h3 className="text-[14px] font-semibold">
                    {data.documents.length} document
                    {data.documents.length === 1 ? "" : "s"} expiring within 30
                    days
                  </h3>
                  <ul className="mt-2 space-y-1 text-[13px]">
                    {data.documents.slice(0, 5).map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-3">
                        <span className="truncate">
                          {DOC_TYPE_LABEL[d.type] ?? d.type} — {d.fileName}
                        </span>
                        <ExpirationBadge date={d.expirationDate} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ) : null
        }
      </QueryBoundary>

      <Card className="animate-enter stagger-3 p-0 overflow-hidden">
        <QueryBoundary query={docsQuery}>
          {(data) =>
            data.documents.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={FileText}
                  variant={EMPTY_COPY["documents.firstTime"].variant}
                  title={EMPTY_COPY["documents.firstTime"].title}
                  description={EMPTY_COPY["documents.firstTime"].description}
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openUploadFor("driver")}
                    >
                      <Upload className="size-4" />
                      Upload first doc
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_auto] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  <span>File</span>
                  <span>Type</span>
                  <span>Owner</span>
                  <span>Expires</span>
                  <span></span>
                </div>
                {data.documents.map((d) => {
                  const owner = d.driverProfileId
                    ? { kind: "driver", id: d.driverProfileId }
                    : d.truckId
                      ? { kind: "truck", id: d.truckId }
                      : d.loadId
                        ? { kind: "load", id: d.loadId }
                        : null;
                  const ownerLink = owner
                    ? owner.kind === "driver"
                      ? `/admin/drivers/${owner.id}`
                      : owner.kind === "truck"
                        ? `/admin/trucks/${owner.id}`
                        : `/admin/loads/${owner.id}`
                    : null;
                  return (
                    <div
                      key={d.id}
                      className="grid grid-cols-[2fr_1fr_1fr_1.5fr_auto] gap-4 px-5 py-3 items-center text-[13px]"
                    >
                      <span className="truncate" title={d.fileName}>
                        {d.fileName}
                      </span>
                      <span className="text-[var(--muted-foreground)]">
                        {DOC_TYPE_LABEL[d.type] ?? d.type}
                      </span>
                      {ownerLink ? (
                        <Link
                          to={ownerLink}
                          className="text-[var(--primary)] hover:underline truncate"
                        >
                          {owner?.kind} →
                        </Link>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">—</span>
                      )}
                      <span>
                        {d.expirationDate ? (
                          <ExpirationBadge date={d.expirationDate} />
                        ) : (
                          <span className="text-[var(--muted-foreground)]">
                            No expiration
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(d.id)}
                          title="View in new tab"
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(d.id, d.fileName)}
                          title="Download"
                        >
                          <Download className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete "${d.fileName}"?`)) {
                              deleteMutation.mutate(d.id);
                            }
                          }}
                          title="Delete"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </QueryBoundary>
      </Card>

      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        ownerKind={ownerKind}
        ownerId={ownerId || undefined}
        onSubmit={async (payload) => {
          await createMutation.mutateAsync(payload);
        }}
      />
    </div>
  );
}
