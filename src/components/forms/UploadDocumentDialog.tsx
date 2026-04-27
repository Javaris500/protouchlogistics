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

export type UploadOwnerKind = "driver" | "truck" | "load";

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

const ALL_TYPES = [...DRIVER_TYPES, ...TRUCK_TYPES, ...LOAD_TYPES];

const EXPIRABLE = new Set([
  "driver_cdl",
  "driver_medical",
  "truck_registration",
  "truck_insurance",
  "truck_inspection",
]);

function ownerKindFromType(type: string): UploadOwnerKind | null {
  if (type.startsWith("driver_")) return "driver";
  if (type.startsWith("truck_")) return "truck";
  if (type.startsWith("load_")) return "load";
  return null;
}

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * If provided, locks the owner so the user only picks file + type.
   * - "driver" with ownerId → only driver_* doc types selectable
   * - "truck" with ownerId → only truck_* doc types selectable
   * - "load" with ownerId → only load_* doc types selectable
   * Omit both to render an "owner kind" picker (used on /admin/documents).
   */
  ownerKind?: UploadOwnerKind;
  ownerId?: string;
  /** Pre-selected doc type. */
  defaultType?: string;
  /** Called with FormData after a successful upload. */
  onSubmit: (formData: FormData) => Promise<void>;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  ownerKind,
  ownerId,
  defaultType,
  onSubmit,
}: UploadDocumentDialogProps) {
  const [type, setType] = React.useState<string>(defaultType ?? "");
  const [file, setFile] = React.useState<File | null>(null);
  const [expiration, setExpiration] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setType(defaultType ?? "");
      setFile(null);
      setExpiration("");
      setNotes("");
      setError(null);
      setSubmitting(false);
    }
  }, [open, defaultType]);

  const availableTypes = React.useMemo(() => {
    if (ownerKind === "driver") return DRIVER_TYPES;
    if (ownerKind === "truck") return TRUCK_TYPES;
    if (ownerKind === "load") return LOAD_TYPES;
    return ALL_TYPES;
  }, [ownerKind]);

  const requiresExpiration = type ? EXPIRABLE.has(type) : false;

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
    if (!resolvedKind || !ownerId) {
      setError("This dialog needs an owner — open it from a driver, truck, or load detail page.");
      return;
    }
    if (requiresExpiration && !expiration) {
      setError("This document type requires an expiration date.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("ownerKind", resolvedKind);
      fd.append("ownerId", ownerId);
      fd.append("type", type);
      fd.append("file", file);
      if (expiration) fd.append("expirationDate", expiration);
      if (notes.trim()) fd.append("notes", notes.trim());
      await onSubmit(fd);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setSubmitting(false);
    }
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
      <FormField label="Document type" required>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
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

      <FormField label="File" required>
        <Input
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/heic,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file && (
          <p className="text-[12px] text-[var(--muted-foreground)] mt-1">
            {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
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
