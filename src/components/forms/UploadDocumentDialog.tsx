import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { put } from "@vercel/blob/client";
import { Upload } from "lucide-react";
import * as React from "react";

import { FormDialog } from "@/components/common/FormDialog";
import { FormField } from "@/components/common/FormField";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listDrivers } from "@/server/functions/drivers";
import {
  requestUploadTokenFn,
  type FinalizeDocumentPayload,
} from "@/server/functions/documents";
import { listLoadsAdmin } from "@/server/functions/loads";
import { listTrucks } from "@/server/functions/trucks";

export type UploadOwnerKind = "driver" | "truck" | "load" | "company";

const DRIVER_TYPES = [
  { value: "driver_cdl", label: "CDL" },
  { value: "driver_medical", label: "Medical card" },
  { value: "driver_mvr", label: "MVR" },
  { value: "driver_drug_test", label: "Drug test" },
  { value: "driver_other", label: "Other (driver)" },
] as const;

const TRUCK_TYPES = [
  { value: "truck_registration", label: "Registration" },
  { value: "truck_insurance", label: "Insurance" },
  { value: "truck_inspection", label: "Annual inspection" },
  { value: "truck_other", label: "Other (truck)" },
] as const;

const LOAD_TYPES = [
  { value: "load_bol", label: "BOL" },
  { value: "load_rate_confirmation", label: "Rate confirmation" },
  { value: "load_pod", label: "POD" },
  { value: "load_lumper_receipt", label: "Lumper receipt" },
  { value: "load_scale_ticket", label: "Scale ticket" },
  { value: "load_other", label: "Other (load)" },
] as const;

const COMPANY_TYPES = [
  { value: "company_mc_authority", label: "MC authority" },
  { value: "company_operating_authority", label: "DOT operating authority" },
  { value: "company_w9", label: "W-9" },
  { value: "company_liability_insurance", label: "Liability insurance" },
  { value: "company_cargo_insurance", label: "Cargo insurance" },
  { value: "company_other", label: "Other (company)" },
] as const;

const ALL_TYPES = [
  ...DRIVER_TYPES,
  ...TRUCK_TYPES,
  ...LOAD_TYPES,
  ...COMPANY_TYPES,
];

const EXPIRABLE = new Set([
  "driver_cdl",
  "driver_medical",
  "truck_registration",
  "truck_insurance",
  "truck_inspection",
  "company_liability_insurance",
  "company_cargo_insurance",
]);

function ownerKindFromType(type: string): UploadOwnerKind | null {
  if (type.startsWith("driver_")) return "driver";
  if (type.startsWith("truck_")) return "truck";
  if (type.startsWith("load_")) return "load";
  if (type.startsWith("company_")) return "company";
  return null;
}

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * If provided with `ownerId`, locks the owner so the user only picks file + type.
   * If provided WITHOUT `ownerId`, renders an entity picker scoped to that kind
   * (used on /admin/documents — Gary picks the driver/truck/load by name instead
   * of pasting a UUID).
   * Omit both to render an "owner kind" picker (uncommon — UI normally always
   * passes at least the kind).
   */
  ownerKind?: UploadOwnerKind;
  ownerId?: string;
  /** Pre-selected doc type. */
  defaultType?: string;
  /** Called with the finalize payload after the file has been uploaded to Blob. */
  onSubmit: (payload: FinalizeDocumentPayload) => Promise<void>;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  ownerKind,
  ownerId: lockedOwnerId,
  defaultType,
  onSubmit,
}: UploadDocumentDialogProps) {
  const [type, setType] = React.useState<string>(defaultType ?? "");
  const [file, setFile] = React.useState<File | null>(null);
  const [expiration, setExpiration] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [pickedOwnerId, setPickedOwnerId] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setType(defaultType ?? "");
      setFile(null);
      setExpiration("");
      setNotes("");
      setPickedOwnerId("");
      setError(null);
      setSubmitting(false);
    }
  }, [open, defaultType]);

  const availableTypes = React.useMemo(() => {
    if (ownerKind === "driver") return DRIVER_TYPES;
    if (ownerKind === "truck") return TRUCK_TYPES;
    if (ownerKind === "load") return LOAD_TYPES;
    if (ownerKind === "company") return COMPANY_TYPES;
    return ALL_TYPES;
  }, [ownerKind]);

  const requiresExpiration = type ? EXPIRABLE.has(type) : false;
  const needsEntityPicker =
    !!ownerKind && ownerKind !== "company" && !lockedOwnerId;
  const ownerId =
    ownerKind === "company" ? null : (lockedOwnerId ?? pickedOwnerId);

  // Fetch the entity options only when the picker is needed and the dialog is open.
  const driversQuery = useQuery({
    queryKey: ["picker", "drivers"],
    queryFn: () => listDrivers({ data: {} }),
    enabled: open && needsEntityPicker && ownerKind === "driver",
    staleTime: 30_000,
  });
  const trucksQuery = useQuery({
    queryKey: ["picker", "trucks"],
    queryFn: () => listTrucks({ data: {} }),
    enabled: open && needsEntityPicker && ownerKind === "truck",
    staleTime: 30_000,
  });
  const loadsQuery = useQuery({
    queryKey: ["picker", "loads"],
    queryFn: () => listLoadsAdmin({ data: {} }),
    enabled: open && needsEntityPicker && ownerKind === "load",
    staleTime: 30_000,
  });

  const entityOptions: { value: string; label: string }[] =
    React.useMemo(() => {
      if (!needsEntityPicker) return [];
      if (ownerKind === "driver") {
        return (driversQuery.data?.drivers ?? [])
          .filter((d): d is typeof d & { id: string } => !!d.id)
          .map((d) => ({
            value: d.id,
            label: `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || d.email,
          }));
      }
      if (ownerKind === "truck") {
        return (trucksQuery.data?.trucks ?? [])
          .filter((t): t is typeof t & { id: string } => !!t.id)
          .map((t) => ({
            value: t.id,
            label: `Unit ${t.unitNumber} — ${t.year} ${t.make} ${t.model}`,
          }));
      }
      if (ownerKind === "load") {
        return (loadsQuery.data?.loads ?? [])
          .filter((l): l is typeof l & { id: string; loadNumber: string } =>
            !!l.id && !!l.loadNumber,
          )
          .map((l) => ({ value: l.id, label: l.loadNumber }));
      }
      return [];
    }, [
      needsEntityPicker,
      ownerKind,
      driversQuery.data,
      trucksQuery.data,
      loadsQuery.data,
    ]);

  const entityLoading =
    (ownerKind === "driver" && driversQuery.isLoading) ||
    (ownerKind === "truck" && trucksQuery.isLoading) ||
    (ownerKind === "load" && loadsQuery.isLoading);

  const noEntitiesAvailable =
    needsEntityPicker && !entityLoading && entityOptions.length === 0;

  const createRoute =
    ownerKind === "driver"
      ? "/admin/drivers"
      : ownerKind === "truck"
        ? "/admin/trucks"
        : "/admin/loads/new";

  const createLabel =
    ownerKind === "driver"
      ? "Invite a driver"
      : ownerKind === "truck"
        ? "Add a truck"
        : "Create a load";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!type) {
      setError("Pick a document type.");
      return;
    }
    if (!file) {
      setError("Pick a file to upload.");
      return;
    }
    const resolvedKind = ownerKind ?? ownerKindFromType(type);
    if (!resolvedKind) {
      setError("Couldn't determine document owner kind.");
      return;
    }
    if (needsEntityPicker && !pickedOwnerId) {
      setError(
        `Pick which ${resolvedKind} this document belongs to.`,
      );
      return;
    }
    if (resolvedKind !== "company" && !ownerId) {
      setError(
        "This dialog needs an owner — open it from a driver, truck, or load detail page.",
      );
      return;
    }
    if (requiresExpiration && !expiration) {
      setError("This document type requires an expiration date.");
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: server validates auth/owner/type, returns a scoped token.
      const { token, pathname } = await requestUploadTokenFn({
        data: {
          ownerKind: resolvedKind,
          ownerId: ownerId ?? null,
          type,
          fileName: file.name,
          mimeType: file.type,
          fileSizeBytes: file.size,
        },
      });

      // Step 2: browser uploads directly to Vercel Blob — bypasses the
      // 4.5 MB function body limit entirely.
      const result = await put(pathname, file, {
        access: "private",
        token,
        multipart: true,
      });

      // Step 3: parent writes the DB record.
      await onSubmit({
        blobKey: result.url,
        ownerKind: resolvedKind,
        ownerId: ownerId ?? null,
        type: type as FinalizeDocumentPayload["type"],
        fileName: file.name,
        mimeType: file.type,
        fileSizeBytes: file.size,
        expirationDate: expiration || null,
        notes: notes.trim() || null,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setSubmitting(false);
    }
  }

  if (noEntitiesAvailable) {
    return (
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={`No ${ownerKind}s yet`}
        description={`Documents have to attach to a ${ownerKind}. Create one first, then come back to upload.`}
        icon={<Upload className="size-5" />}
        submitLabel="Got it"
        footer={
          <>
            <Link
              to={createRoute}
              onClick={() => onOpenChange(false)}
              className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--primary)] px-4 text-[13px] font-semibold text-[var(--primary-foreground)] shadow-[var(--shadow-sm)] hover:opacity-90"
            >
              {createLabel}
            </Link>
          </>
        }
      >
        <p className="text-[13px] text-[var(--muted-foreground)]">
          Tip: every document in the library is tied to a driver, truck, or
          load. If you want to store company-wide documents (MC authority, W-9,
          etc.) that aren't tied to a single asset, let the team know — that's
          a separate feature.
        </p>
      </FormDialog>
    );
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Upload document"
      description="Choose a document type, attach a file, and add expiration if required."
      icon={<Upload className="size-5" />}
      onSubmit={handleSubmit}
      submitLabel={submitting ? "Uploading…" : "Upload"}
      isSubmitting={submitting}
      banner={error}
    >
      {needsEntityPicker && (
        <FormField
          label={
            ownerKind === "driver"
              ? "Driver"
              : ownerKind === "truck"
                ? "Truck"
                : "Load"
          }
          required
          hint={
            entityOptions.length === 0 && !entityLoading
              ? `No ${ownerKind}s exist yet — create one first.`
              : undefined
          }
        >
          <Select value={pickedOwnerId} onValueChange={setPickedOwnerId}>
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  entityLoading
                    ? "Loading…"
                    : `Select a ${ownerKind}…`
                }
              />
            </SelectTrigger>
            <SelectContent>
              {entityLoading ? (
                <div className="px-2 py-2 text-sm text-[var(--muted-foreground)]">
                  Loading…
                </div>
              ) : entityOptions.length === 0 ? (
                <div className="px-2 py-2 text-sm text-[var(--muted-foreground)]">
                  No {ownerKind}s yet.
                </div>
              ) : (
                entityOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </FormField>
      )}

      <FormField label="Document type" required>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a type…" />
          </SelectTrigger>
          <SelectContent>
            {availableTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        label="File"
        required
        hint={
          file
            ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`
            : undefined
        }
      >
        <Input
          type="file"
          accept="application/pdf,image/jpeg,image/jpg,image/png,image/heic,image/heif,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </FormField>

      <FormField
        label={requiresExpiration ? "Expiration date" : "Expiration date (optional)"}
        required={requiresExpiration}
      >
        <Input
          type="date"
          value={expiration}
          onChange={(e) => setExpiration(e.target.value)}
        />
      </FormField>

      <FormField label="Notes (optional)">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything worth remembering about this doc."
        />
      </FormField>
    </FormDialog>
  );
}
