import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, FileText, Trash2, Upload } from "lucide-react";
import * as React from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { UploadDocumentDialog } from "@/components/forms/UploadDocumentDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExpirationBadge } from "@/components/ui/expiration-badge";
import { errorMessage } from "@/lib/errors";
import { toast } from "@/lib/toast";
import {
  createDocument,
  deleteDocument,
  downloadDocument,
  listDocuments,
} from "@/server/functions/documents";

type OwnerKind = "driver" | "truck" | "load";

const DOC_TYPE_LABEL: Record<string, string> = {
  driver_cdl: "CDL",
  driver_medical: "Medical card",
  driver_mvr: "MVR",
  driver_drug_test: "Drug test",
  driver_other: "Other",
  truck_registration: "Registration",
  truck_insurance: "Insurance",
  truck_inspection: "Inspection",
  truck_other: "Other",
  load_bol: "BOL",
  load_rate_confirmation: "Rate conf",
  load_pod: "POD",
  load_lumper_receipt: "Lumper receipt",
  load_scale_ticket: "Scale ticket",
  load_other: "Other",
};

interface DocumentPanelProps {
  ownerKind: OwnerKind;
  ownerId: string;
  /**
   * Optional title for the section. Defaults to "Documents".
   */
  title?: string;
  /**
   * Optional default doc type to pre-select in the upload dialog
   * (e.g. `"load_bol"` on a load page).
   */
  defaultUploadType?: string;
}

/**
 * Reusable documents panel. Shows the list of documents attached to a
 * specific owner (driver / truck / load) with upload, download, and
 * delete actions inline. Used on the three admin detail pages so Gary
 * doesn't have to bounce out to /admin/documents to manage docs.
 *
 * Download routes through the `downloadDocument` server function, which
 * streams the bytes server-side using the Vercel Blob read-write token.
 * The browser receives the bytes and triggers a real `<a download>` save.
 */
export function DocumentPanel({
  ownerKind,
  ownerId,
  title = "Documents",
  defaultUploadType,
}: DocumentPanelProps) {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = React.useState(false);

  const queryKey = ["documents", ownerKind, ownerId] as const;
  const docsQuery = useQuery({
    queryKey,
    queryFn: () => listDocuments({ data: { ownerKind, ownerId } }),
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => createDocument({ data: formData }),
    onSuccess: () => {
      toast.success("Document uploaded");
      queryClient.invalidateQueries({ queryKey });
      // Cross-cut: the global documents page also shows this row.
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
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["documents.list"] });
      queryClient.invalidateQueries({ queryKey: ["documents.expiring"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  async function fetchBlobUrl(documentId: string): Promise<string> {
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
      // Open the blob in a new tab. Browser renders PDFs and images natively;
      // anything else (rare — we only allow pdf/jpeg/png/heic/webp) prompts
      // the user to save instead. Revoke the URL after the new tab has had
      // time to claim the bytes; keep it long enough for slow networks.
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(errorMessage(err));
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
      toast.error(errorMessage(err));
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[14px] font-semibold tracking-tight">{title}</h3>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setUploadOpen(true)}
        >
          <Upload className="size-3.5" />
          Upload
        </Button>
      </div>

      <QueryBoundary
        query={docsQuery}
        skeleton={
          <div className="h-24 animate-pulse rounded-[var(--radius-md)] bg-[var(--surface-2)]" />
        }
      >
        {(data) =>
          data.documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              variant="first-time"
              title="No documents yet"
              description={`Upload the first ${ownerKind} document to get started.`}
            />
          ) : (
            <ul className="divide-y divide-[var(--border)] -mx-1">
              {data.documents.map((d) => (
                <li
                  key={d.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 px-1 py-2 text-[13px]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium" title={d.fileName}>
                      {d.fileName}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-[11.5px] text-[var(--muted-foreground)]">
                      <span>{DOC_TYPE_LABEL[d.type] ?? d.type}</span>
                      <span>·</span>
                      <span>{(d.fileSizeBytes / 1024).toFixed(0)} KB</span>
                      {d.expirationDate && (
                        <>
                          <span>·</span>
                          <ExpirationBadge date={d.expirationDate} />
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
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
                </li>
              ))}
            </ul>
          )
        }
      </QueryBoundary>

      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        ownerKind={ownerKind}
        ownerId={ownerId}
        defaultType={defaultUploadType}
        onSubmit={async (fd) => {
          await uploadMutation.mutateAsync(fd);
        }}
      />
    </Card>
  );
}
