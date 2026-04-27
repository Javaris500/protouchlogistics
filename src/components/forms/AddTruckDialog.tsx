import { Truck } from "lucide-react";
import { useState } from "react";

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

type TruckStatus = "active" | "in_shop" | "out_of_service";

interface AddTruckValues {
  unitNumber: string;
  vin: string;
  make: string;
  model: string;
  year: string;
  licensePlate: string;
  plateState: string;
  status: TruckStatus;
  currentMileage: string;
  registrationExpiration: string;
  insuranceExpiration: string;
  annualInspectionExpiration: string;
  notes: string;
}

interface AddTruckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (values: AddTruckValues) => Promise<void> | void;
}

const CURRENT_YEAR = new Date().getFullYear();

export function AddTruckDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddTruckDialogProps) {
  const [values, setValues] = useState<AddTruckValues>(initial);
  const [errors, setErrors] = useState<
    Partial<Record<keyof AddTruckValues, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<K extends keyof AddTruckValues>(
    key: K,
    v: AddTruckValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function reset() {
    setValues(initial);
    setErrors({});
  }

  function validate(): boolean {
    const next: Partial<Record<keyof AddTruckValues, string>> = {};
    if (!values.unitNumber.trim()) next.unitNumber = "Unit number is required.";
    if (!values.vin.trim()) next.vin = "VIN is required.";
    else if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(values.vin.trim()))
      next.vin = "VIN must be 17 characters (letters and numbers, no I/O/Q).";
    if (!values.make.trim()) next.make = "Make is required.";
    if (!values.model.trim()) next.model = "Model is required.";
    const year = Number.parseInt(values.year, 10);
    if (!values.year || Number.isNaN(year)) next.year = "Year is required.";
    else if (year < 1980 || year > CURRENT_YEAR + 1)
      next.year = `Year must be between 1980 and ${CURRENT_YEAR + 1}.`;
    if (!values.licensePlate.trim())
      next.licensePlate = "License plate is required.";
    if (
      !values.plateState.trim() ||
      !/^[A-Z]{2}$/.test(values.plateState.trim())
    )
      next.plateState = "Use the 2-letter state code.";
    const miles = Number.parseInt(values.currentMileage, 10);
    if (values.currentMileage && (Number.isNaN(miles) || miles < 0))
      next.currentMileage = "Mileage must be a positive number.";
    if (!values.registrationExpiration)
      next.registrationExpiration = "Registration expiration is required.";
    if (!values.insuranceExpiration)
      next.insuranceExpiration = "Insurance expiration is required.";
    if (!values.annualInspectionExpiration)
      next.annualInspectionExpiration =
        "Annual inspection expiration is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await onSubmit?.(values);
      reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormDialog
      size="lg"
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      eyebrow="Fleet"
      title="Add truck"
      description="Basic details now — upload registration, insurance, and inspection on the truck's detail page after."
      icon={<Truck />}
      onSubmit={handleSubmit}
      submitLabel="Add truck"
      isSubmitting={isSubmitting}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Unit number"
          required
          hint="How your team refers to this truck (e.g., 101)."
          error={errors.unitNumber}
        >
          <Input
            placeholder="101"
            value={values.unitNumber}
            onChange={(e) => update("unitNumber", e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField
          label="Status"
          required
          hint="In-shop and out-of-service trucks can't be assigned."
        >
          <Select
            value={values.status}
            onValueChange={(v) => update("status", v as TruckStatus)}
            disabled={isSubmitting}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="in_shop">In shop</SelectItem>
              <SelectItem value="out_of_service">Out of service</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <FormField
        label="VIN"
        required
        error={errors.vin}
        hint="17-character vehicle identification number."
      >
        <Input
          placeholder="1FUJGLDV6CSXXXXXX"
          value={values.vin}
          onChange={(e) => update("vin", e.target.value.toUpperCase())}
          maxLength={17}
          className="font-mono tracking-wide"
          disabled={isSubmitting}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Year" required error={errors.year}>
          <Input
            type="number"
            inputMode="numeric"
            min="1980"
            max={CURRENT_YEAR + 1}
            placeholder={String(CURRENT_YEAR)}
            value={values.year}
            onChange={(e) => update("year", e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>
        <FormField label="Make" required error={errors.make}>
          <Input
            placeholder="Freightliner"
            value={values.make}
            onChange={(e) => update("make", e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>
        <FormField label="Model" required error={errors.model}>
          <Input
            placeholder="Cascadia"
            value={values.model}
            onChange={(e) => update("model", e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_100px_140px]">
        <FormField label="License plate" required error={errors.licensePlate}>
          <Input
            placeholder="ABC-1234"
            value={values.licensePlate}
            onChange={(e) =>
              update("licensePlate", e.target.value.toUpperCase())
            }
            className="font-mono uppercase"
            disabled={isSubmitting}
          />
        </FormField>
        <FormField label="State" required error={errors.plateState}>
          <Input
            placeholder="TX"
            value={values.plateState}
            onChange={(e) =>
              update("plateState", e.target.value.toUpperCase().slice(0, 2))
            }
            className="uppercase"
            maxLength={2}
            disabled={isSubmitting}
          />
        </FormField>
        <FormField
          label="Mileage"
          error={errors.currentMileage}
          meta={<span>Optional</span>}
        >
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="125,400"
            value={values.currentMileage}
            onChange={(e) => update("currentMileage", e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          label="Registration expires"
          required
          error={errors.registrationExpiration}
        >
          <Input
            type="date"
            value={values.registrationExpiration}
            onChange={(e) => update("registrationExpiration", e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>
        <FormField
          label="Insurance expires"
          required
          error={errors.insuranceExpiration}
        >
          <Input
            type="date"
            value={values.insuranceExpiration}
            onChange={(e) => update("insuranceExpiration", e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>
        <FormField
          label="Inspection expires"
          required
          error={errors.annualInspectionExpiration}
        >
          <Input
            type="date"
            value={values.annualInspectionExpiration}
            onChange={(e) =>
              update("annualInspectionExpiration", e.target.value)
            }
            disabled={isSubmitting}
          />
        </FormField>
      </div>

      <FormField
        label="Notes"
        meta={<span>Optional · admin-only</span>}
        hint="Anything drivers shouldn't see — nicknames, known issues, maintenance quirks."
      >
        <Textarea
          placeholder="e.g., 'APU needs service by end of Q2', nicknames, etc."
          value={values.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
          disabled={isSubmitting}
        />
      </FormField>
    </FormDialog>
  );
}

const initial: AddTruckValues = {
  unitNumber: "",
  vin: "",
  make: "",
  model: "",
  year: String(CURRENT_YEAR),
  licensePlate: "",
  plateState: "",
  status: "active",
  currentMileage: "",
  registrationExpiration: "",
  insuranceExpiration: "",
  annualInspectionExpiration: "",
  notes: "",
};
