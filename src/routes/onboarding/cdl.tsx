import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { OnboardingFooter } from "@/components/onboarding/OnboardingFooter";
import {
  OnboardingField,
  OnboardingInput,
  OnboardingSegmented,
  OnboardingSelect,
} from "@/components/onboarding/OnboardingField";
import { PhotoCapture } from "@/components/onboarding/PhotoCapture";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { US_STATES } from "@/lib/onboarding/us-states";
import { FAKE_CDL } from "@/lib/onboarding/fake-data";

type Sub = "photo" | "details";

export const Route = createFileRoute("/onboarding/cdl")({
  validateSearch: (search: Record<string, unknown>): { sub: Sub } => {
    const sub = search.sub === "details" ? "details" : "photo";
    return { sub };
  },
  component: CdlStep,
});

function CdlStep() {
  const { sub } = Route.useSearch();
  const { data, update, recordAiCall } = useOnboarding();
  const navigate = useNavigate();

  // Preview URL kept locally — the provider only stores the photo key.
  const [previewUrl, setPreviewUrl] = React.useState<string | undefined>(
    undefined,
  );

  const handlePhotoConfirm = (
    key: string,
    preview: string,
    extracted: unknown,
    fileMeta: {
      fileName: string;
      mimeType: string;
      fileSizeBytes: number;
    },
  ) => {
    setPreviewUrl(preview);
    const cdl = extracted as
      | {
          number: string;
          class: "A" | "B" | "C";
          state: string;
          expiration: string;
        }
      | null;
    update({
      cdlPhotoKey: key,
      cdlFile: fileMeta,
      ...(cdl
        ? {
            cdlNumber: cdl.number,
            cdlClass: cdl.class,
            cdlState: cdl.state,
            cdlExpiration: cdl.expiration,
          }
        : {}),
    });
    navigate({ to: "/onboarding/cdl", search: { sub: "details" } });
  };

  if (sub === "photo") {
    return (
      <OnboardingShell
        currentStep="cdl"
        eyebrow="Step 3"
        title="Let's photograph your CDL."
        subtitle="Lay it flat in good light. Get all 4 corners in the frame."
        footer={
          <OnboardingFooter
            onNext={() =>
              navigate({ to: "/onboarding/cdl", search: { sub: "details" } })
            }
            nextLabel={data.cdlPhotoKey ? "Continue" : "Skip photo"}
            nextDisabled={false}
            onBack={() => navigate({ to: "/onboarding/contact" })}
            onSkip={() => {
              update(FAKE_CDL);
              // eslint-disable-next-line no-console
              console.info("[DEV] skipped step: cdl (photo)");
              navigate({ to: "/onboarding/cdl", search: { sub: "details" } });
            }}
            helperText="We'll use this to pre-fill the next screen."
          />
        }
      >
        <PhotoCapture
          label="CDL"
          docType="cdl"
          onConfirm={handlePhotoConfirm}
          existingKey={data.cdlPhotoKey}
          existingPreview={previewUrl}
          onAiCall={recordAiCall}
        />
      </OnboardingShell>
    );
  }

  return <CdlDetails />;
}

function CdlDetails() {
  const { data, update } = useOnboarding();
  const navigate = useNavigate();

  const [cdlNumber, setCdlNumber] = React.useState(data.cdlNumber ?? "");
  const [cdlClass, setCdlClass] = React.useState<"A" | "B" | "C" | undefined>(
    data.cdlClass,
  );
  const [cdlState, setCdlState] = React.useState(
    data.cdlState ?? data.address?.state ?? "",
  );
  const [cdlExpiration, setCdlExpiration] = React.useState(
    data.cdlExpiration ?? "",
  );

  const [touched, setTouched] = React.useState({
    cdlNumber: false,
    cdlClass: false,
    cdlState: false,
    cdlExpiration: false,
  });

  const isFutureDate = (d: string) => {
    if (!d) return false;
    const t = new Date(d);
    return !Number.isNaN(t.getTime()) && t > new Date();
  };

  const isValid =
    cdlNumber.trim().length >= 5 &&
    !!cdlClass &&
    cdlState !== "" &&
    isFutureDate(cdlExpiration);

  const blur = (field: keyof typeof touched) =>
    setTouched((t) => ({ ...t, [field]: true }));

  const handleNext = () => {
    setTouched({
      cdlNumber: true,
      cdlClass: true,
      cdlState: true,
      cdlExpiration: true,
    });
    if (!isValid) return;
    update({
      cdlNumber,
      cdlClass,
      cdlState,
      cdlExpiration,
    });
    navigate({ to: "/onboarding/medical", search: { sub: "photo" } });
  };

  const handleSkip = () => {
    update(FAKE_CDL);
    // eslint-disable-next-line no-console
    console.info("[DEV] skipped step: cdl (details)");
    navigate({ to: "/onboarding/medical", search: { sub: "photo" } });
  };

  return (
    <OnboardingShell
      currentStep="cdl"
      eyebrow="Step 3 · Details"
      title="Confirm your CDL details."
      subtitle={
        data.cdlPhotoKey
          ? "We filled these in from your photo. Tap anything that's wrong."
          : "No photo yet — enter the details from your CDL below."
      }
      footer={
        <OnboardingFooter
          onNext={handleNext}
          nextDisabled={!isValid}
          onBack={() =>
            navigate({ to: "/onboarding/cdl", search: { sub: "photo" } })
          }
          onSkip={handleSkip}
        />
      }
    >
      <div className="space-y-5">
        <OnboardingField
          label="CDL number"
          htmlFor="cdlNumber"
          error={
            touched.cdlNumber && cdlNumber.trim().length < 5
              ? "CDL number looks too short"
              : undefined
          }
        >
          <OnboardingInput
            id="cdlNumber"
            name="cdlNumber"
            autoCapitalize="characters"
            placeholder="MO-D8821-R14"
            value={cdlNumber}
            onChange={(e) => setCdlNumber(e.target.value.toUpperCase())}
            onBlur={() => blur("cdlNumber")}
            invalid={touched.cdlNumber && cdlNumber.trim().length < 5}
            className="font-mono"
          />
        </OnboardingField>

        <OnboardingField
          label="Class"
          error={
            touched.cdlClass && !cdlClass ? "Select your class" : undefined
          }
          helper="Class A covers most interstate tractor-trailer work."
        >
          <OnboardingSegmented
            name="cdlClass"
            value={cdlClass}
            onChange={(v) => {
              setCdlClass(v);
              blur("cdlClass");
            }}
            options={[
              { value: "A", label: "Class A" },
              { value: "B", label: "Class B" },
              { value: "C", label: "Class C" },
            ]}
          />
        </OnboardingField>

        <div className="grid gap-4 sm:grid-cols-2">
          <OnboardingField
            label="Issuing state"
            htmlFor="cdlState"
            error={touched.cdlState && !cdlState ? "Required" : undefined}
          >
            <OnboardingSelect
              id="cdlState"
              name="cdlState"
              value={cdlState}
              onChange={(e) => setCdlState(e.target.value)}
              onBlur={() => blur("cdlState")}
            >
              <option value="">Select state</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </OnboardingSelect>
          </OnboardingField>

          <OnboardingField
            label="Expiration date"
            htmlFor="cdlExpiration"
            error={
              touched.cdlExpiration
                ? !cdlExpiration
                  ? "Required"
                  : !isFutureDate(cdlExpiration)
                    ? "Expiration must be in the future"
                    : undefined
                : undefined
            }
          >
            <OnboardingInput
              id="cdlExpiration"
              name="cdlExpiration"
              type="date"
              value={cdlExpiration}
              onChange={(e) => setCdlExpiration(e.target.value)}
              onBlur={() => blur("cdlExpiration")}
              invalid={
                touched.cdlExpiration &&
                (!cdlExpiration || !isFutureDate(cdlExpiration))
              }
            />
          </OnboardingField>
        </div>
      </div>
    </OnboardingShell>
  );
}
