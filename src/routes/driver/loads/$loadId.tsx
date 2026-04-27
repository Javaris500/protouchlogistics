import { useState } from "react";
import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  FileText,
  MapPin,
  Phone,
  Truck,
} from "lucide-react";

import { BackLink } from "@/components/common/BackLink";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { toast } from "@/lib/toast";
import {
  formatDateTimeShort,
  formatMoneyCents,
  formatPhone,
  formatRelativeFromNow,
} from "@/lib/format";
import { dialUrl, mapsUrl } from "@/lib/dispatch";
import {
  getDriverLoadFn,
  updateDriverLoadStatusFn,
  uploadDriverLoadDocFn,
  type DriverLoadDetail,
  type DriverLoadStatus,
  type DriverTransition,
} from "@/server/functions/driver/loads";

export const Route = createFileRoute("/driver/loads/$loadId")({
  loader: async ({ params }) => {
    const load = await getDriverLoadFn({ data: { loadId: params.loadId } });
    if (!load) throw notFound();
    return load;
  },
  component: DriverLoadDetailPage,
});

const NEXT_ACTION: Record<
  DriverLoadStatus,
  { action: DriverTransition; label: string } | null
> = {
  draft: null,
  assigned: { action: "accept", label: "Accept load" },
  accepted: { action: "start_to_pickup", label: "Start drive to pickup" },
  en_route_pickup: { action: "arrive_pickup", label: "I'm at pickup" },
  at_pickup: { action: "load", label: "Loaded — leaving pickup" },
  loaded: { action: "start_to_delivery", label: "Start drive to delivery" },
  en_route_delivery: { action: "arrive_delivery", label: "I'm at delivery" },
  at_delivery: { action: "deliver", label: "Mark delivered" },
  delivered: null,
  pod_uploaded: null,
  completed: null,
  cancelled: null,
};

function DriverLoadDetailPage() {
  const load = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState<DriverTransition | "bol" | "pod" | null>(
    null,
  );

  const action = NEXT_ACTION[load.status];

  async function transition(act: DriverTransition) {
    if (busy) return;
    setBusy(act);
    try {
      await updateDriverLoadStatusFn({ data: { loadId: load.id, action: act } });
      await router.invalidate();
      toast.success("Status updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/driver/loads">Back to loads</BackLink>

      <PageHeader
        eyebrow={`#${load.loadNumber}`}
        title={load.brokerName}
        description={`Updated ${formatRelativeFromNow(load.updatedAt)}`}
        actions={<StatusPill kind="load" status={load.status} />}
      />

      <Section title="Summary">
        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryRow label="Commodity" value={load.commodity} />
          <SummaryRow
            label="Miles"
            value={load.miles != null ? load.miles.toLocaleString() : "—"}
          />
          <SummaryRow
            label="Driver pay"
            value={
              load.driverPayCents != null
                ? formatMoneyCents(load.driverPayCents)
                : "Pay pending — Gary sets before pickup"
            }
          />
          <SummaryRow
            label="Truck"
            value={load.truckUnitNumber ?? "Not assigned"}
            icon={Truck}
          />
          <SummaryRow
            label="Reference"
            value={load.referenceNumber ?? "—"}
          />
          <SummaryRow
            label="BOL #"
            value={load.bolNumber ?? "—"}
          />
        </div>
        {load.specialInstructions && (
          <p className="mt-4 rounded-md bg-muted/50 p-3 text-[13px] leading-relaxed text-[var(--foreground)]">
            <span className="font-semibold">Special instructions: </span>
            {load.specialInstructions}
          </p>
        )}
      </Section>

      {action && (
        <div className="flex justify-end">
          <Button
            type="button"
            size="lg"
            disabled={busy !== null}
            onClick={() => transition(action.action)}
          >
            {busy === action.action ? "Updating…" : action.label}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      )}

      <Section title="Stops" description={`${load.stops.length} total`}>
        <ol className="flex flex-col gap-3">
          {load.stops.map((s) => (
            <li key={s.id}>
              <Card className="gap-0 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
                        {s.stopType === "pickup" ? "Pickup" : "Delivery"} ·{" "}
                        {s.sequence}
                      </span>
                      {s.arrivedAt && (
                        <CheckCircle2
                          className="size-3.5 text-[var(--success)]"
                          aria-hidden
                        />
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold">
                      {s.companyName ?? "—"}
                    </p>
                    <a
                      href={mapsUrl({
                        addressLine1: s.addressLine1,
                        city: s.city,
                        state: s.state,
                        zip: s.zip,
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 flex items-center gap-1 text-xs text-[var(--primary)] underline-offset-2 hover:underline"
                    >
                      <MapPin className="size-3 shrink-0" aria-hidden />
                      {s.addressLine1}, {s.city}, {s.state} {s.zip}
                    </a>
                    <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                      Window {formatDateTimeShort(s.windowStart)} →{" "}
                      {formatDateTimeShort(s.windowEnd)}
                    </p>
                    {s.contactName && (
                      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-[var(--muted-foreground)]">
                        Contact: {s.contactName}
                        {s.contactPhone && (
                          <>
                            {" · "}
                            <a
                              href={dialUrl(s.contactPhone)}
                              className="inline-flex items-center gap-1 text-[var(--primary)] underline-offset-2 hover:underline"
                            >
                              <Phone className="size-3 shrink-0" aria-hidden />
                              {formatPhone(s.contactPhone)}
                            </a>
                          </>
                        )}
                      </p>
                    )}
                    {s.notes && (
                      <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                        {s.notes}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        title="Paperwork"
        description={`${load.documents.length} on file`}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <UploadButton
              label="BOL"
              loadId={load.id}
              type="load_bol"
              busy={busy === "bol"}
              onBusy={setBusy}
              onDone={() => router.invalidate()}
            />
            <UploadButton
              label="POD"
              loadId={load.id}
              type="load_pod"
              busy={busy === "pod"}
              onBusy={setBusy}
              onDone={() => router.invalidate()}
            />
          </div>

          {load.documents.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              No documents uploaded yet.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
              {load.documents.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-3 px-3 py-2.5 text-[13px]"
                >
                  <FileText
                    className="size-4 shrink-0 text-[var(--muted-foreground)]"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{d.fileName}</p>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      {formatDocType(d.type)} ·{" "}
                      {formatRelativeFromNow(d.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof Truck;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
        {label}
      </span>
      <span className="flex items-center gap-1.5 text-sm">
        {Icon && (
          <Icon
            className="size-3.5 text-[var(--muted-foreground)]"
            aria-hidden
          />
        )}
        <span className="text-[var(--foreground)]">{value}</span>
      </span>
    </div>
  );
}

function UploadButton({
  label,
  loadId,
  type,
  busy,
  onBusy,
  onDone,
}: {
  label: string;
  loadId: string;
  type: "load_bol" | "load_pod";
  busy: boolean;
  onBusy: (k: "bol" | "pod" | null) => void;
  onDone: () => void;
}) {
  const slot = type === "load_bol" ? "bol" : "pod";

  async function handleFile(file: File) {
    onBusy(slot);
    try {
      // Multipart upload — no base64 round-trip. See pre-prod fix #4 in
      // sprint-docs/16-PRE-PROD-FIXES.md. Phone-camera BOL/POD photos
      // (8–15 MB) used to inflate by 33% as base64-in-JSON and trip
      // Vercel function body limits.
      const fd = new FormData();
      fd.append("loadId", loadId);
      fd.append("type", type);
      fd.append("file", file);
      await uploadDriverLoadDocFn({ data: fd });
      toast.success(
        `${type === "load_bol" ? "BOL" : "POD"} uploaded`,
      );
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      onBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label
        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-[13px] font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)] aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        aria-disabled={busy}
      >
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFile(file);
              e.target.value = "";
            }
          }}
        />
        <Camera className="size-4" aria-hidden />
        {busy ? "Uploading…" : `Photograph ${label}`}
      </label>
      <label
        className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-[12px] font-medium text-[var(--muted-foreground)] transition-colors hover:bg-muted/40 hover:text-[var(--foreground)] aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        aria-disabled={busy}
        title="Pick a file (PDF or saved image)"
      >
        <input
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFile(file);
              e.target.value = "";
            }
          }}
        />
        <FileText className="size-3.5" aria-hidden />
        File
      </label>
    </div>
  );
}

function formatDocType(t: DriverLoadDetail["documents"][number]["type"]): string {
  if (t === "load_bol") return "BOL";
  if (t === "load_pod") return "POD";
  return t;
}
