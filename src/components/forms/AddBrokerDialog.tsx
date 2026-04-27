import { Handshake } from "lucide-react";
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

type PaymentTerms = "net_15" | "net_30" | "net_45" | "net_60" | "quick_pay";

interface AddBrokerValues {
  companyName: string;
  mcNumber: string;
  dotNumber: string;
  contactName: string;
  contactEmail: string;
  billingEmail: string;
  contactPhone: string;
  paymentTerms: PaymentTerms;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
}

interface AddBrokerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (values: AddBrokerValues) => Promise<void> | void;
}

export function AddBrokerDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddBrokerDialogProps) {
  const [values, setValues] = useState<AddBrokerValues>(initial);
  const [errors, setErrors] = useState<
    Partial<Record<keyof AddBrokerValues, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<K extends keyof AddBrokerValues>(
    key: K,
    v: AddBrokerValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function reset() {
    setValues(initial);
    setErrors({});
  }

  function validate(): boolean {
    const next: Partial<Record<keyof AddBrokerValues, string>> = {};
    if (!values.companyName.trim())
      next.companyName = "Company name is required.";
    if (!values.contactName.trim())
      next.contactName = "Primary contact is required.";
    if (!values.contactPhone.trim())
      next.contactPhone = "Phone is required.";
    if (!values.contactEmail.trim())
      next.contactEmail = "Contact email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail.trim()))
      next.contactEmail = "Enter a valid email.";
    if (
      values.billingEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.billingEmail.trim())
    )
      next.billingEmail = "Enter a valid email.";
    if (!values.addressLine1.trim())
      next.addressLine1 = "Street address is required.";
    if (!values.city.trim()) next.city = "City is required.";
    if (!values.state.trim() || !/^[A-Z]{2}$/.test(values.state.trim()))
      next.state = "Use the 2-letter state code.";
    if (!values.zip.trim()) next.zip = "ZIP is required.";
    if (values.mcNumber && !/^\d{5,8}$/.test(values.mcNumber.trim()))
      next.mcNumber = "MC numbers are typically 5–8 digits.";
    if (values.dotNumber && !/^\d{5,9}$/.test(values.dotNumber.trim()))
      next.dotNumber = "DOT numbers are typically 5–9 digits.";
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
      eyebrow="Partners"
      title="Add broker"
      description="Capture the company, primary contact, and payment terms. You can refine details anytime."
      icon={<Handshake />}
      onSubmit={handleSubmit}
      submitLabel="Add broker"
      isSubmitting={isSubmitting}
    >
      <FormField label="Company name" required error={errors.companyName}>
        <Input
          placeholder="Acme Logistics Inc."
          value={values.companyName}
          onChange={(e) => update("companyName", e.target.value)}
          disabled={isSubmitting}
          autoFocus
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="MC number"
          meta={<span>Optional</span>}
          error={errors.mcNumber}
        >
          <Input
            inputMode="numeric"
            placeholder="123456"
            value={values.mcNumber}
            onChange={(e) =>
              update("mcNumber", e.target.value.replace(/\D/g, ""))
            }
            className="font-mono"
            maxLength={8}
            disabled={isSubmitting}
          />
        </FormField>
        <FormField
          label="DOT number"
          meta={<span>Optional</span>}
          error={errors.dotNumber}
        >
          <Input
            inputMode="numeric"
            placeholder="1234567"
            value={values.dotNumber}
            onChange={(e) =>
              update("dotNumber", e.target.value.replace(/\D/g, ""))
            }
            className="font-mono"
            maxLength={9}
            disabled={isSubmitting}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Primary contact" required error={errors.contactName}>
          <Input
            placeholder="Jane Dispatcher"
            value={values.contactName}
            onChange={(e) => update("contactName", e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>
        <FormField label="Phone" required error={errors.contactPhone}>
          <Input
            type="tel"
            inputMode="tel"
            placeholder="(555) 123-4567"
            value={values.contactPhone}
            onChange={(e) => update("contactPhone", e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Contact email" required error={errors.contactEmail}>
          <Input
            type="email"
            inputMode="email"
            placeholder="dispatch@acme.com"
            value={values.contactEmail}
            onChange={(e) => update("contactEmail", e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>
        <FormField
          label="Billing email"
          error={errors.billingEmail}
          hint="Where invoices and POD packages are sent."
        >
          <Input
            type="email"
            inputMode="email"
            placeholder="billing@acme.com"
            value={values.billingEmail}
            onChange={(e) => update("billingEmail", e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>
      </div>

      <FormField label="Street address" required error={errors.addressLine1}>
        <Input
          placeholder="123 Main St"
          value={values.addressLine1}
          onChange={(e) => update("addressLine1", e.target.value)}
          disabled={isSubmitting}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-[1fr_100px_140px]">
        <FormField label="City" required error={errors.city}>
          <Input
            placeholder="Dallas"
            value={values.city}
            onChange={(e) => update("city", e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>
        <FormField label="State" required error={errors.state}>
          <Input
            placeholder="TX"
            value={values.state}
            onChange={(e) =>
              update("state", e.target.value.toUpperCase().slice(0, 2))
            }
            className="uppercase"
            maxLength={2}
            disabled={isSubmitting}
          />
        </FormField>
        <FormField label="ZIP" required error={errors.zip}>
          <Input
            inputMode="numeric"
            placeholder="75201"
            value={values.zip}
            onChange={(e) => update("zip", e.target.value)}
            className="font-mono"
            maxLength={10}
            disabled={isSubmitting}
          />
        </FormField>
      </div>

      <FormField
        label="Payment terms"
        hint="Used to auto-calculate invoice due dates."
      >
        <Select
          value={values.paymentTerms}
          onValueChange={(v) => update("paymentTerms", v as PaymentTerms)}
          disabled={isSubmitting}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quick_pay">QuickPay (same day)</SelectItem>
            <SelectItem value="net_15">Net 15</SelectItem>
            <SelectItem value="net_30">Net 30</SelectItem>
            <SelectItem value="net_45">Net 45</SelectItem>
            <SelectItem value="net_60">Net 60</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        label="Internal notes"
        meta={<span>Admin-only</span>}
        hint="Dispatcher quirks, favoured lanes, what drivers should know."
      >
        <Textarea
          placeholder="e.g., 'Emails POD same day of delivery — good payer.'"
          value={values.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
          disabled={isSubmitting}
        />
      </FormField>
    </FormDialog>
  );
}

const initial: AddBrokerValues = {
  companyName: "",
  mcNumber: "",
  dotNumber: "",
  contactName: "",
  contactEmail: "",
  billingEmail: "",
  contactPhone: "",
  paymentTerms: "net_30",
  addressLine1: "",
  city: "",
  state: "",
  zip: "",
  notes: "",
};
