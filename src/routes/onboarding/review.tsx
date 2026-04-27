import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { OnboardingFooter } from "@/components/onboarding/OnboardingFooter";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { cn } from "@/lib/utils";
import {
  Pencil,
  Check,
  User,
  MapPin,
  IdCard,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { US_STATES } from "@/lib/onboarding/us-states";

export const Route = createFileRoute("/onboarding/review")({
  component: ReviewStep,
});

const RELATION_LABEL: Record<string, string> = {
  spouse: "Spouse",
  parent: "Parent",
  sibling: "Sibling",
  child: "Child",
  friend: "Friend",
  other: "Other",
};

function formatDob(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ReviewStep() {
  const { data, reset, submit } = useOnboarding();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await submit();
      reset();
      await navigate({ to: "/onboarding/pending" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[onboarding] submit failed", err);
      alert(
        err instanceof Error
          ? err.message
          : "Could not submit your profile. Please try again.",
      );
      setSubmitting(false);
    }
  };

  const stateName = (code?: string) =>
    US_STATES.find((s) => s.code === code)?.name ?? code ?? "—";

  return (
    <OnboardingShell
      currentStep="review"
      eyebrow="Step 5"
      title="Double-check everything."
      subtitle="Tap Edit on any section to make changes. When it's right, submit for Gary's approval."
      footer={
        <OnboardingFooter
          onNext={handleSubmit}
          nextLabel="Submit for approval"
          loading={submitting}
          onBack={() =>
            navigate({ to: "/onboarding/medical", search: { sub: "details" } })
          }
          helperText="Gary reviews within 24 hours. You'll get an email the moment you're approved."
        />
      }
    >
      <div className="space-y-3">
        <ReviewCard
          icon={User}
          title="About you"
          onEdit={() => navigate({ to: "/onboarding/about" })}
          rows={[
            {
              label: "Legal name",
              value: [data.firstName, data.lastName].filter(Boolean).join(" "),
            },
            { label: "Date of birth", value: formatDob(data.dob) },
            { label: "Mobile phone", value: data.phone },
          ]}
        />

        <ReviewCard
          icon={MapPin}
          title="Contact"
          onEdit={() => navigate({ to: "/onboarding/contact" })}
          rows={[
            {
              label: "Home address",
              value: data.address ? (
                <div className="text-right">
                  <div>{data.address.line1}</div>
                  <div className="text-[var(--muted-foreground)]">
                    {data.address.city}, {data.address.state} {data.address.zip}
                  </div>
                </div>
              ) : null,
            },
            {
              label: "Emergency",
              value: data.emergency ? (
                <div className="text-right">
                  <div>{data.emergency.name}</div>
                  <div className="text-[var(--muted-foreground)]">
                    {data.emergency.phone} ·{" "}
                    {RELATION_LABEL[data.emergency.relation] ??
                      data.emergency.relation}
                  </div>
                </div>
              ) : null,
            },
          ]}
        />

        <ReviewCard
          icon={IdCard}
          title="Commercial Driver's License"
          onEdit={() =>
            navigate({ to: "/onboarding/cdl", search: { sub: "details" } })
          }
          hasPhoto={!!data.cdlPhotoKey}
          rows={[
            {
              label: "Number",
              value: data.cdlNumber ? (
                <span className="font-mono text-[13px]">{data.cdlNumber}</span>
              ) : null,
            },
            {
              label: "Class",
              value: data.cdlClass ? `Class ${data.cdlClass}` : null,
            },
            {
              label: "State",
              value: data.cdlClass ? stateName(data.cdlState) : null,
            },
            { label: "Expires", value: formatDob(data.cdlExpiration) },
          ]}
        />

        <ReviewCard
          icon={Stethoscope}
          title="Medical card"
          onEdit={() =>
            navigate({ to: "/onboarding/medical", search: { sub: "details" } })
          }
          hasPhoto={!!data.medicalPhotoKey}
          rows={[
            { label: "Expires", value: formatDob(data.medicalExpiration) },
          ]}
        />
      </div>
    </OnboardingShell>
  );
}

interface Row {
  label: string;
  value: React.ReactNode;
}

interface ReviewCardProps {
  icon: LucideIcon;
  title: string;
  onEdit: () => void;
  rows: Row[];
  hasPhoto?: boolean;
}

function ReviewCard({
  icon: Icon,
  title,
  onEdit,
  rows,
  hasPhoto,
}: ReviewCardProps) {
  const hasEmpty = rows.some(
    (r) =>
      r.value === undefined ||
      r.value === null ||
      r.value === "" ||
      r.value === "—",
  );
  const complete = !hasEmpty;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--background)]",
        "transition-all duration-150",
        complete
          ? "border-[var(--border)] hover:border-[var(--border-strong)]"
          : "border-[var(--warning)]/40 bg-[var(--warning)]/[0.02]",
      )}
    >
      <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex size-7 items-center justify-center rounded-[var(--radius-sm)]",
              complete
                ? "bg-[var(--surface-2)] text-[var(--muted-foreground)]"
                : "bg-[var(--warning)]/12 text-[var(--warning)]",
            )}
          >
            <Icon className="size-3.5" strokeWidth={2} />
          </div>
          <h3 className="text-[14px] font-semibold tracking-tight">{title}</h3>
          {complete && (
            <div
              aria-label="Section complete"
              className="flex size-4 items-center justify-center rounded-full bg-[var(--success)]/15 text-[var(--success)]"
            >
              <Check className="size-2.5" strokeWidth={3} />
            </div>
          )}
          {hasPhoto && (
            <div className="flex items-center gap-1 rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
              <Check className="size-2.5" strokeWidth={3} />
              <span>Photo</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-[12px] font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--primary)]"
        >
          <Pencil className="size-3" />
          <span>Edit</span>
        </button>
      </header>

      <dl className="divide-y divide-[var(--border)]">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-start justify-between gap-4 px-4 py-2.5"
          >
            <dt className="pt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--subtle-foreground)]">
              {row.label}
            </dt>
            <dd
              className={cn(
                "text-right text-[14px] leading-snug",
                row.value === undefined ||
                  row.value === null ||
                  row.value === ""
                  ? "text-[var(--warning)] italic"
                  : "text-[var(--foreground)]",
              )}
            >
              {row.value || "Missing"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
