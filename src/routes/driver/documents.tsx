import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AlertTriangle, FileText, ShieldCheck, Upload } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";
import { Card } from "@/components/ui/card";
import { DRIVER_EMPTY_COPY } from "@/components/driver/driver-empty-copy";
import { toast } from "@/lib/toast";
import { daysUntil, formatDateShort, formatRelativeFromNow } from "@/lib/format";
import { getDriverSelfFn } from "@/server/functions/driver/me";
import {
  listDriverDocumentsFn,
  replaceDriverDocumentFn,
  type DriverDocument,
} from "@/server/functions/driver/documents";

export const Route = createFileRoute("/driver/documents")({
  loader: async () => {
    const [me, docs] = await Promise.all([
      getDriverSelfFn(),
      listDriverDocumentsFn(),
    ]);
    return { me, docs };
  },
  component: DriverDocumentsPage,
});

const WARN_DAYS = 30;

function DriverDocumentsPage() {
  const { me, docs } = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState<"driver_cdl" | "driver_medical" | null>(null);

  const cdlDays = daysUntil(me.cdlExpiration);
  const medDays = daysUntil(me.medicalCardExpiration);

  const cdlDocs = docs.filter((d) => d.type === "driver_cdl");
  const medDocs = docs.filter((d) => d.type === "driver_medical");

  async function handleUpload(
    type: "driver_cdl" | "driver_medical",
    file: File,
    expirationDate?: string,
  ) {
    if (busy) return;
    setBusy(type);
    try {
      const buf = await file.arrayBuffer();
      const contentBase64 = bufferToBase64(buf);
      await replaceDriverDocumentFn({
        data: {
          type,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          contentBase64,
          expirationDate,
        },
      });
      toast.success("Document uploaded");
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  if (cdlDocs.length === 0 && medDocs.length === 0) {
    const copy = DRIVER_EMPTY_COPY["driver.documents.firstTime"];
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Documents"
          description="Your CDL and medical card on file."
        />
        <EmptyState
          icon={FileText}
          title={copy.title}
          description={copy.description}
          variant={copy.variant}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Documents"
        description="Your CDL and medical card. Upload a new file before expiration to replace."
      />

      <Section title="CDL" description={`Class ${"—"}`}>
        <DocCard
          slot="driver_cdl"
          expiration={me.cdlExpiration}
          daysLeft={cdlDays}
          docs={cdlDocs}
          busy={busy === "driver_cdl"}
          onUpload={(f, exp) => handleUpload("driver_cdl", f, exp)}
        />
      </Section>

      <Section title="Medical card">
        <DocCard
          slot="driver_medical"
          expiration={me.medicalCardExpiration}
          daysLeft={medDays}
          docs={medDocs}
          busy={busy === "driver_medical"}
          onUpload={(f, exp) => handleUpload("driver_medical", f, exp)}
        />
      </Section>
    </div>
  );
}

function DocCard({
  slot,
  expiration,
  daysLeft,
  docs,
  busy,
  onUpload,
}: {
  slot: "driver_cdl" | "driver_medical";
  expiration: string;
  daysLeft: number;
  docs: DriverDocument[];
  busy: boolean;
  onUpload: (file: File, expirationDate?: string) => void;
}) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [expDate, setExpDate] = useState("");

  const expiringSoon = daysLeft <= WARN_DAYS && daysLeft >= 0;
  const expired = daysLeft < 0;
  const latest = docs[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
            expired
              ? "bg-[color-mix(in_oklab,var(--destructive)_14%,transparent)] text-[var(--destructive)]"
              : expiringSoon
                ? "bg-[color-mix(in_oklab,var(--warning)_14%,transparent)] text-[var(--warning)]"
                : "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[var(--success)]"
          }`}
        >
          {expired || expiringSoon ? (
            <AlertTriangle className="size-4" aria-hidden />
          ) : (
            <ShieldCheck className="size-4" aria-hidden />
          )}
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold">
            Expires {formatDateShort(expiration)}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {expired
              ? `Expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} ago — upload a new file now`
              : expiringSoon
                ? `Expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"} — upload a replacement soon`
                : `${daysLeft} days remaining`}
          </p>
        </div>
      </div>

      {latest && (
        <Card className="gap-0 p-3">
          <div className="flex items-center gap-3">
            <FileText
              className="size-4 shrink-0 text-[var(--muted-foreground)]"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">
                {latest.fileName}
              </p>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Uploaded {formatRelativeFromNow(latest.createdAt)}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="rounded-md border border-dashed border-[var(--border-strong)] p-3">
        <p className="text-xs font-semibold text-[var(--foreground)]">
          Replace this document
        </p>
        <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
          Pick a JPG, PNG, or PDF and confirm the new expiration date.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-[11px] font-medium">
            <span className="text-[var(--muted-foreground)]">Expiration</span>
            <input
              type="date"
              value={expDate}
              onChange={(e) => setExpDate(e.target.value)}
              className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-[13px]"
            />
          </label>
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-[12px] font-medium hover:bg-muted/40 aria-disabled:cursor-not-allowed aria-disabled:opacity-50">
            <input
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPendingFile(f);
              }}
            />
            <Upload className="size-3.5" aria-hidden />
            {pendingFile ? pendingFile.name.slice(0, 24) : "Choose file"}
          </label>
          <button
            type="button"
            disabled={!pendingFile || !expDate || busy}
            onClick={() => {
              if (!pendingFile || !expDate) return;
              onUpload(pendingFile, expDate);
              setPendingFile(null);
              setExpDate("");
            }}
            className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--primary)] px-4 text-[12px] font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
      <span className="hidden">{slot}</span>
    </div>
  );
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}
