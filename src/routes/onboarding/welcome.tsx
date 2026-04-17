import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Camera,
  ClipboardList,
  IdCard,
  Clock3,
} from "lucide-react";

export const Route = createFileRoute("/onboarding/welcome")({
  component: WelcomeScreen,
});

const CHECKLIST = [
  {
    icon: ClipboardList,
    title: "Your basic info",
    subtitle: "Name, DOB, phone, address, emergency contact",
  },
  {
    icon: IdCard,
    title: "Your CDL",
    subtitle: "We'll photograph it and verify the details",
  },
  {
    icon: Camera,
    title: "Your medical card",
    subtitle: "Same drill — we'll read the expiration",
  },
];

function WelcomeScreen() {
  const navigate = useNavigate();
  const isDev = import.meta.env.DEV;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[var(--surface)] text-[var(--foreground)]">
      {/* Ambient backdrop — subtle copper glow behind the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgb(201_123_58_/_0.08),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 h-64 bg-[radial-gradient(ellipse_40%_100%_at_50%_0%,rgb(201_123_58_/_0.12),transparent)]"
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--foreground)] shadow-[var(--shadow-sm)]">
            <span className="font-mono text-[10px] font-bold tracking-wider text-[var(--background)]">
              PTL
            </span>
          </div>
          <span className="text-sm font-semibold tracking-tight">
            ProTouch Logistics
          </span>
        </div>
        <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
          Onboarding
        </span>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-md animate-onboarding-in space-y-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)]/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--primary)] shadow-[var(--shadow-sm)] backdrop-blur">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--primary)] opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-[var(--primary)]" />
              </span>
              <span>Welcome</span>
            </div>
            <h1 className="text-[2.25rem] font-semibold leading-[1.05] tracking-tight sm:text-[2.75rem]">
              Let's get you
              <br />
              <span className="text-[var(--primary)]">on the road.</span>
            </h1>
            <p className="text-[15px] leading-relaxed text-[var(--muted-foreground)]">
              This takes about 3 minutes. You can pause and come back anytime —
              we'll remember where you left off.
            </p>
          </div>

          {/* Checklist */}
          <ul className="space-y-2.5">
            {CHECKLIST.map(({ icon: Icon, title, subtitle }, i) => (
              <li
                key={title}
                className="group flex items-start gap-3.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--background)] px-4 py-3.5 shadow-[var(--shadow-sm)] transition-all duration-150 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]"
              >
                <div className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-br from-[var(--primary)]/15 to-[var(--primary)]/5 text-[var(--primary)]">
                  <Icon className="size-4" strokeWidth={1.75} />
                  <span className="absolute -left-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[var(--background)] text-[9px] font-bold text-[var(--muted-foreground)] shadow-[var(--shadow-sm)]">
                    {i + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-[14px] font-semibold leading-tight">
                    {title}
                  </p>
                  <p className="text-[12px] leading-snug text-[var(--muted-foreground)]">
                    {subtitle}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* Timer hint */}
          <div className="flex items-center justify-center gap-1.5 text-[12px] text-[var(--muted-foreground)]">
            <Clock3 className="size-3.5" />
            <span>Average time: 3 minutes</span>
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <Button
              size="lg"
              className="h-12 w-full text-[15px] font-semibold shadow-[var(--shadow-md)] transition-transform active:scale-[0.98]"
              onClick={() => navigate({ to: "/onboarding/about" })}
            >
              <span>Let's go</span>
              <ArrowRight className="size-4" />
            </Button>
            <p className="text-center text-[11px] leading-snug text-[var(--subtle-foreground)]">
              Gary reviews every submission within 24 hours.
            </p>
          </div>

          {isDev && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => navigate({ to: "/onboarding/about" })}
                className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--subtle-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                Skip welcome (dev)
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
