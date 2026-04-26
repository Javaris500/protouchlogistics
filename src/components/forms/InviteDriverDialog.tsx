import { UserPlus } from "lucide-react";
import { useState } from "react";

import { FormDialog } from "@/components/common/FormDialog";
import { FormField } from "@/components/common/FormField";
import { Input } from "@/components/ui/input";

interface InviteDriverValues {
  email: string;
  hireDate: string;
}

interface InviteDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (values: InviteDriverValues) => Promise<void> | void;
}

export function InviteDriverDialog({
  open,
  onOpenChange,
  onSubmit,
}: InviteDriverDialogProps) {
  const [email, setEmail] = useState("");
  const [hireDate, setHireDate] = useState(() => todayIso());
  const [errors, setErrors] = useState<
    Partial<Record<keyof InviteDriverValues, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setEmail("");
    setHireDate(todayIso());
    setErrors({});
  }

  function validate(): boolean {
    const next: Partial<Record<keyof InviteDriverValues, string>> = {};
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = "Enter a valid email address.";
    if (!hireDate) next.hireDate = "Hire date is required.";
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

      <FormField label="Hire date" required error={errors.hireDate}>
        <Input
          type="date"
          value={hireDate}
          onChange={(e) => setHireDate(e.target.value)}
          disabled={isSubmitting}
        />
      </FormField>
    </FormDialog>
  );
}

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
