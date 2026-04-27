import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { OnboardingFooter } from "@/components/onboarding/OnboardingFooter";
import {
  OnboardingField,
  OnboardingInput,
} from "@/components/onboarding/OnboardingField";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { formatUsPhone, isValidUsPhone } from "@/lib/onboarding/phone";

export const Route = createFileRoute("/onboarding/about")({
  component: AboutStep,
});

type Errors = {
  firstName?: string;
  lastName?: string;
  dob?: string;
  phone?: string;
};

function isAtLeast18(dob: string): boolean {
  if (!dob) return false;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 18 && d.getFullYear() >= 1920;
}

function AboutStep() {
  const { data, update } = useOnboarding();
  const navigate = useNavigate();

  const [firstName, setFirstName] = React.useState(data.firstName ?? "");
  const [lastName, setLastName] = React.useState(data.lastName ?? "");
  const [dob, setDob] = React.useState(data.dob ?? "");
  const [phone, setPhone] = React.useState(data.phone ?? "");
  const [errors, setErrors] = React.useState<Errors>({});
  const [touched, setTouched] = React.useState<Record<keyof Errors, boolean>>({
    firstName: false,
    lastName: false,
    dob: false,
    phone: false,
  });

  const validate = (): Errors => {
    const next: Errors = {};
    if (!firstName.trim()) next.firstName = "Enter your first name";
    if (!lastName.trim()) next.lastName = "Enter your last name";
    if (!dob) next.dob = "Enter your date of birth";
    else if (!isAtLeast18(dob))
      next.dob = "You must be at least 18 to drive commercially";
    if (!phone) next.phone = "Enter your mobile number";
    else if (!isValidUsPhone(phone))
      next.phone = "That doesn't look like a valid US phone number";
    return next;
  };

  const blur = (field: keyof Errors) => {
    setTouched((t) => ({ ...t, [field]: true }));
    const v = validate();
    setErrors((prev) => ({ ...prev, [field]: v[field] }));
  };

  const handleNext = () => {
    const v = validate();
    setErrors(v);
    setTouched({ firstName: true, lastName: true, dob: true, phone: true });
    if (Object.keys(v).length > 0) return;
    update({ firstName, lastName, dob, phone });
    navigate({ to: "/onboarding/contact" });
  };

  const isValid =
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    dob !== "" &&
    isAtLeast18(dob) &&
    isValidUsPhone(phone);

  return (
    <OnboardingShell
      currentStep="about"
      eyebrow="Step 1"
      title="Let's start with the basics."
      subtitle="Use your legal name exactly as it appears on your CDL."
      footer={
        <OnboardingFooter
          onNext={handleNext}
          nextDisabled={!isValid}
          helperText="Your info is saved automatically as you go."
        />
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <OnboardingField
            label="First name"
            htmlFor="firstName"
            error={touched.firstName ? errors.firstName : undefined}
          >
            <OnboardingInput
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              autoCapitalize="words"
              placeholder="Jordan"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onBlur={() => blur("firstName")}
              invalid={touched.firstName && !!errors.firstName}
            />
          </OnboardingField>

          <OnboardingField
            label="Last name"
            htmlFor="lastName"
            error={touched.lastName ? errors.lastName : undefined}
          >
            <OnboardingInput
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              autoCapitalize="words"
              placeholder="Reeves"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onBlur={() => blur("lastName")}
              invalid={touched.lastName && !!errors.lastName}
            />
          </OnboardingField>
        </div>

        <OnboardingField
          label="Date of birth"
          htmlFor="dob"
          error={touched.dob ? errors.dob : undefined}
          helper="You must be at least 18."
        >
          <OnboardingInput
            id="dob"
            name="dob"
            type="date"
            autoComplete="bday"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            onBlur={() => blur("dob")}
            invalid={touched.dob && !!errors.dob}
          />
        </OnboardingField>

        <OnboardingField
          label="Mobile phone"
          htmlFor="phone"
          error={touched.phone ? errors.phone : undefined}
          helper="We'll email or text you about load assignments."
        >
          <OnboardingInput
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel-national"
            inputMode="tel"
            placeholder="(555) 555-0123"
            value={phone}
            onChange={(e) => setPhone(formatUsPhone(e.target.value))}
            onBlur={() => blur("phone")}
            invalid={touched.phone && !!errors.phone}
            maxLength={14}
          />
        </OnboardingField>
      </div>
    </OnboardingShell>
  );
}
