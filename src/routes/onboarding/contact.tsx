import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { OnboardingFooter } from "@/components/onboarding/OnboardingFooter";
import {
  OnboardingField,
  OnboardingInput,
  OnboardingSelect,
} from "@/components/onboarding/OnboardingField";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { US_STATES } from "@/lib/onboarding/us-states";
import { formatUsPhone, isValidUsPhone } from "@/lib/onboarding/phone";

export const Route = createFileRoute("/onboarding/contact")({
  component: ContactStep,
});

const RELATIONS = [
  { value: "spouse", label: "Spouse" },
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Sibling" },
  { value: "child", label: "Child" },
  { value: "friend", label: "Friend" },
  { value: "other", label: "Other" },
];

function ContactStep() {
  const { data, update } = useOnboarding();
  const navigate = useNavigate();

  // Home address
  const [line1, setLine1] = React.useState(data.address?.line1 ?? "");
  const [city, setCity] = React.useState(data.address?.city ?? "");
  const [state, setState] = React.useState(data.address?.state ?? "");
  const [zip, setZip] = React.useState(data.address?.zip ?? "");

  // Emergency contact
  const [ecName, setEcName] = React.useState(data.emergency?.name ?? "");
  const [ecPhone, setEcPhone] = React.useState(data.emergency?.phone ?? "");
  const [ecRelation, setEcRelation] = React.useState(
    data.emergency?.relation ?? "",
  );

  const [touched, setTouched] = React.useState({
    line1: false,
    city: false,
    state: false,
    zip: false,
    ecName: false,
    ecPhone: false,
    ecRelation: false,
  });

  const addressValid =
    line1.trim() !== "" &&
    city.trim() !== "" &&
    state !== "" &&
    /^\d{5}(-\d{4})?$/.test(zip);

  const emergencyValid =
    ecName.trim() !== "" && isValidUsPhone(ecPhone) && ecRelation !== "";

  const isValid = addressValid && emergencyValid;

  const blur = (field: keyof typeof touched) =>
    setTouched((t) => ({ ...t, [field]: true }));

  const handleNext = () => {
    setTouched({
      line1: true,
      city: true,
      state: true,
      zip: true,
      ecName: true,
      ecPhone: true,
      ecRelation: true,
    });
    if (!isValid) return;
    update({
      address: { line1, city, state, zip },
      emergency: { name: ecName, phone: ecPhone, relation: ecRelation },
    });
    navigate({ to: "/onboarding/cdl", search: { sub: "photo" } });
  };

  return (
    <OnboardingShell
      currentStep="contact"
      eyebrow="Step 2"
      title="How do we reach you?"
      subtitle="Your home address and an emergency contact."
      footer={
        <OnboardingFooter
          onNext={handleNext}
          nextDisabled={!isValid}
          onBack={() => navigate({ to: "/onboarding/about" })}
        />
      }
    >
      <div className="space-y-8">
        {/* Home address */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-2">
            <h2 className="text-[15px] font-semibold tracking-tight">
              Home address
            </h2>
            <span className="text-[11px] text-[var(--subtle-foreground)]">
              Where you live
            </span>
          </div>

          <OnboardingField
            label="Street address"
            htmlFor="line1"
            error={touched.line1 && !line1.trim() ? "Required" : undefined}
            helper="Phase 2: Google Places autocomplete. For now, type manually."
          >
            <OnboardingInput
              id="line1"
              name="line1"
              autoComplete="street-address"
              placeholder="1420 Industrial Blvd"
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              onBlur={() => blur("line1")}
              invalid={touched.line1 && !line1.trim()}
            />
          </OnboardingField>

          <div className="grid grid-cols-[1fr_7rem] gap-3 sm:grid-cols-[1fr_9rem_8rem]">
            <OnboardingField
              label="City"
              htmlFor="city"
              error={touched.city && !city.trim() ? "Required" : undefined}
            >
              <OnboardingInput
                id="city"
                name="city"
                autoComplete="address-level2"
                autoCapitalize="words"
                placeholder="Kansas City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onBlur={() => blur("city")}
                invalid={touched.city && !city.trim()}
              />
            </OnboardingField>

            <OnboardingField
              label="State"
              htmlFor="state"
              error={touched.state && !state ? "Required" : undefined}
              className="hidden sm:block"
            >
              <OnboardingSelect
                id="state"
                name="state"
                autoComplete="address-level1"
                value={state}
                onChange={(e) => setState(e.target.value)}
                onBlur={() => blur("state")}
              >
                <option value="">Select</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code}
                  </option>
                ))}
              </OnboardingSelect>
            </OnboardingField>

            <OnboardingField
              label="ZIP"
              htmlFor="zip"
              error={
                touched.zip
                  ? !zip
                    ? "Required"
                    : !/^\d{5}(-\d{4})?$/.test(zip)
                      ? "Invalid ZIP"
                      : undefined
                  : undefined
              }
            >
              <OnboardingInput
                id="zip"
                name="zip"
                autoComplete="postal-code"
                inputMode="numeric"
                placeholder="64120"
                maxLength={10}
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                onBlur={() => blur("zip")}
                invalid={touched.zip && !/^\d{5}(-\d{4})?$/.test(zip)}
              />
            </OnboardingField>
          </div>

          {/* Mobile-only state field (outside grid to get full width) */}
          <OnboardingField
            label="State"
            htmlFor="state-mobile"
            error={touched.state && !state ? "Required" : undefined}
            className="sm:hidden"
          >
            <OnboardingSelect
              id="state-mobile"
              name="state-mobile"
              autoComplete="address-level1"
              value={state}
              onChange={(e) => setState(e.target.value)}
              onBlur={() => blur("state")}
            >
              <option value="">Select your state</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </OnboardingSelect>
          </OnboardingField>
        </section>

        {/* Emergency contact */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-2">
            <h2 className="text-[15px] font-semibold tracking-tight">
              Emergency contact
            </h2>
            <span className="text-[11px] text-[var(--subtle-foreground)]">
              Who we call
            </span>
          </div>

          <OnboardingField
            label="Contact name"
            htmlFor="ecName"
            error={touched.ecName && !ecName.trim() ? "Required" : undefined}
          >
            <OnboardingInput
              id="ecName"
              name="ecName"
              autoCapitalize="words"
              placeholder="Taylor Reeves"
              value={ecName}
              onChange={(e) => setEcName(e.target.value)}
              onBlur={() => blur("ecName")}
              invalid={touched.ecName && !ecName.trim()}
            />
          </OnboardingField>

          <div className="grid gap-3 sm:grid-cols-2">
            <OnboardingField
              label="Phone"
              htmlFor="ecPhone"
              error={
                touched.ecPhone && !isValidUsPhone(ecPhone)
                  ? "Invalid phone"
                  : undefined
              }
            >
              <OnboardingInput
                id="ecPhone"
                name="ecPhone"
                type="tel"
                inputMode="tel"
                placeholder="(555) 555-0199"
                value={ecPhone}
                onChange={(e) => setEcPhone(formatUsPhone(e.target.value))}
                onBlur={() => blur("ecPhone")}
                invalid={touched.ecPhone && !isValidUsPhone(ecPhone)}
                maxLength={14}
              />
            </OnboardingField>

            <OnboardingField
              label="Relationship"
              htmlFor="ecRelation"
              error={touched.ecRelation && !ecRelation ? "Required" : undefined}
            >
              <OnboardingSelect
                id="ecRelation"
                name="ecRelation"
                value={ecRelation}
                onChange={(e) => setEcRelation(e.target.value)}
                onBlur={() => blur("ecRelation")}
              >
                <option value="">Select</option>
                {RELATIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </OnboardingSelect>
            </OnboardingField>
          </div>
        </section>
      </div>
    </OnboardingShell>
  );
}
