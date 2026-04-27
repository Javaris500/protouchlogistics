import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { OnboardingFooter } from "@/components/onboarding/OnboardingFooter";
import {
  OnboardingField,
  OnboardingInput,
} from "@/components/onboarding/OnboardingField";
import { PhotoCapture } from "@/components/onboarding/PhotoCapture";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { FAKE_MEDICAL } from "@/lib/onboarding/fake-data";
import { AlertTriangle } from "lucide-react";

type Sub = "photo" | "details";

export const Route = createFileRoute("/onboarding/medical")({
  validateSearch: (search: Record<string, unknown>): { sub: Sub } => {
    const sub = search.sub === "details" ? "details" : "photo";
    return { sub };
  },
  component: MedicalStep,
});

function MedicalStep() {
  const { sub } = Route.useSearch();
  const { data, update, recordAiCall } = useOnboarding();
  const navigate = useNavigate();

  const [previewUrl, setPreviewUrl] = React.useState<string | undefined>(
    undefined,
  );

  const handlePhotoConfirm = (
    key: string,
    preview: string,
    extracted: unknown,
  ) => {
    setPreviewUrl(preview);
    const med = extracted as { expiration: string } | null;
    update({
      medicalPhotoKey: key,
      ...(med ? { medicalExpiration: med.expiration } : {}),
    });
    navigate({ to: "/onboarding/medical", search: { sub: "details" } });
  };

  if (sub === "photo") {
    return (
      <OnboardingShell
        currentStep="medical"
        eyebrow="Step 4"
        title="Now your medical card."
        subtitle="Same deal — flat surface, good light, all 4 corners."
        footer={
          <OnboardingFooter
            onNext={() =>
              navigate({
                to: "/onboarding/medical",
                search: { sub: "details" },
              })
            }
            nextLabel={data.medicalPhotoKey ? "Continue" : "Skip photo"}
            onBack={() =>
              navigate({ to: "/onboarding/cdl", search: { sub: "details" } })
            }
            onSkip={() => {
              update(FAKE_MEDICAL);
              // eslint-disable-next-line no-console
              console.info("[DEV] skipped step: medical (photo)");
              navigate({
                to: "/onboarding/medical",
                search: { sub: "details" },
              });
            }}
            helperText="We'll pre-fill the expiration from your photo."
          />
        }
      >
        <PhotoCapture
          label="Medical card"
          docType="medical"
          onConfirm={handlePhotoConfirm}
          existingKey={data.medicalPhotoKey}
          existingPreview={previewUrl}
          onAiCall={recordAiCall}
        />
      </OnboardingShell>
    );
  }

  return <MedicalDetails />;
}

function MedicalDetails() {
  const { data, update } = useOnboarding();
  const navigate = useNavigate();

  const [medicalExpiration, setMedicalExpiration] = React.useState(
    data.medicalExpiration ?? "",
  );
  const [touched, setTouched] = React.useState(false);

  const isFutureDate = (d: string) => {
    if (!d) return false;
    const t = new Date(d);
    return !Number.isNaN(t.getTime()) && t > new Date();
  };

  const isExpired =
    medicalExpiration !== "" && !isFutureDate(medicalExpiration);
  const isValid = isFutureDate(medicalExpiration);

  const handleNext = () => {
    setTouched(true);
    if (!isValid) return;
    update({ medicalExpiration });
    navigate({ to: "/onboarding/review" });
  };

  const handleSkip = () => {
    update(FAKE_MEDICAL);
    // eslint-disable-next-line no-console
    console.info("[DEV] skipped step: medical (details)");
    navigate({ to: "/onboarding/review" });
  };

  return (
    <OnboardingShell
      currentStep="medical"
      eyebrow="Step 4 · Expiration"
      title="When does your medical card expire?"
      subtitle={
        data.medicalPhotoKey
          ? "We pre-filled this from your photo. Confirm or adjust."
          : "Enter the expiration date from your medical card."
      }
      footer={
        <OnboardingFooter
          onNext={handleNext}
          nextDisabled={!isValid}
          onBack={() =>
            navigate({ to: "/onboarding/medical", search: { sub: "photo" } })
          }
          onSkip={handleSkip}
        />
      }
    >
      <div className="space-y-4">
        <OnboardingField
          label="Medical card expiration"
          htmlFor="medicalExpiration"
          error={touched && !medicalExpiration ? "Required" : undefined}
        >
          <OnboardingInput
            id="medicalExpiration"
            name="medicalExpiration"
            type="date"
            value={medicalExpiration}
            onChange={(e) => {
              setMedicalExpiration(e.target.value);
              setTouched(true);
            }}
            invalid={touched && (!medicalExpiration || isExpired)}
          />
        </OnboardingField>

        {isExpired && (
          <div
            role="alert"
            className="flex gap-3 rounded-[var(--radius-lg)] border border-[var(--danger)]/30 bg-[var(--danger)]/8 p-4"
          >
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[var(--danger)]" />
            <div className="space-y-1">
              <p className="text-[14px] font-medium text-[var(--foreground)]">
                Your medical card has expired.
              </p>
              <p className="text-[13px] leading-snug text-[var(--muted-foreground)]">
                You'll need a new DOT physical before you can drive. Reach out
                to Gary — he can point you to a clinic near you.
              </p>
            </div>
          </div>
        )}
      </div>
    </OnboardingShell>
  );
}
