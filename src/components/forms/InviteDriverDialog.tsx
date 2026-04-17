import { UserPlus } from "lucide-react";
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

type PayModel = "percent_of_rate" | "per_mile" | "flat_per_load";

interface InviteDriverValues {
  email: string;
  hireDate: string;
  payModel: PayModel;
  payRate: string;
}

interface InviteDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (values: InviteDriverValues) => Promise<void> | void;
}

const PAY_MODEL_HINT: Record<PayModel, string> = {
  percent_of_rate: "Percent of each load's rate (e.g. 28 = 28%).",
  per_mile: "Cents per mile (e.g. 65 = $0.65/mile).",
  flat_per_load: "Flat dollars per completed load.",
};

export function InviteDriverDialog({
  open,
  onOpenChange,
  onSubmit,
}: InviteDriverDialogProps) {
  const [email, setEmail] = useState("");
  const [hireDate, setHireDate] = useState(() => todayIso());
  const [payModel, setPayModel] = useState<PayModel>("percent_of_rate");
  const [payRate, setPayRate] = useState("");
  const [errors, setErrors] = useState<
    Partial<Record<keyof InviteDriverValues, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setEmail("");
    setHireDate(todayIso());
    setPayModel("percent_of_rate");
    setPayRate("");
    setErrors({});
  }

  function validate(): boolean {
    const next: Partial<Record<keyof InviteDriverValues, string>> = {};
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = "Enter a valid email address.";
    if (!hireDate) next.hireDate = "Hire date is required.";
    const rate = Number.parseFloat(payRate);
    if (!payRate || Number.isNaN(rate) || rate <= 0)
      next.payRate = "Enter a positive number.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await onSubmit?.({
        email: email.trim().toLowerCase(),
        hireDate,
        payModel,
        payRate,
      });
      reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      eyebrow="Drivers"
      title="Invite driver"
      description="We'll email a secure link to set a password and complete onboarding."
      icon={<UserPlus />}
      onSubmit={handleSubmit}
      submitLabel="Send invite"
      isSubmitting={isSubmitting}
    >
      <FormField
        label="Email"
        required
        hint="The invite link goes to this address. Valid for 7 days."
        error={errors.email}
      >
        <Input
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="driver@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Hire date" required error={errors.hireDate}>
          <Input
            type="date"
            value={hireDate}
            onChange={(e) => setHireDate(e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField
          label="Pay model"
          required
          hint="You can change this later on the driver profile."
        >
          <Select
            value={payModel}
            onValueChange={(v) => setPayModel(v as PayModel)}
            disabled={isSubmitting}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percent_of_rate">Percent of rate</SelectItem>
              <SelectItem value="per_mile">Per mile</SelectItem>
              <SelectItem value="flat_per_load">Flat per load</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <FormField
        label={payLabel(payModel)}
        required
        hint={PAY_MODEL_HINT[payModel]}
        error={errors.payRate}
      >
        <Input
          type="number"
          inputMode="decimal"
          step={
            payModel === "per_mile"
              ? "0.01"
              : payModel === "percent_of_rate"
                ? "0.1"
                : "1"
          }
          min="0"
          placeholder={
            payModel === "percent_of_rate"
              ? "28"
              : payModel === "per_mile"
                ? "0.65"
                : "500"
          }
          value={payRate}
          onChange={(e) => setPayRate(e.target.value)}
          disabled={isSubmitting}
        />
      </FormField>
    </FormDialog>
  );
}

function payLabel(m: PayModel): string {
  switch (m) {
    case "percent_of_rate":
      return "Percent";
    case "per_mile":
      return "Cents per mile";
    case "flat_per_load":
      return "Dollars per load";
  }
}

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
