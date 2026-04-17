import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Mail } from "lucide-react";

export const Route = createFileRoute("/onboarding/pending")({
  component: PendingScreen,
});

function PendingScreen() {
  const isDev = import.meta.env.DEV;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[var(--surface)] text-[var(--foreground)]">
      {/* Ambient success glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[55vh] bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgb(22_163_74_/_0.08),transparent_70%)]"
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
          Submitted
        </span>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-md animate-onboarding-in space-y-8 text-center">
          {/* Success mark with ambient ring */}
          <div className="relative mx-auto flex size-20 items-center justify-center">
            <div
              aria-hidden
              className="absolute inset-0 animate-ping rounded-full bg-[var(--success)]/20"
              style={{ animationDuration: "2.4s" }}
            />
            <div className="relative flex size-20 items-center justify-center rounded-full bg-[var(--success)]/10 text-[var(--success)] ring-[3px] ring-[var(--success)]/15">
              <CheckCircle2 className="size-10" strokeWidth={1.75} />
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--success)]">
              Submitted
            </p>
            <h1 className="text-[2rem] font-semibold leading-[1.1] tracking-tight sm:text-[2.25rem]">
              You're all set.
            </h1>
            <p className="mx-auto max-w-sm text-[15px] leading-relaxed text-[var(--muted-foreground)]">
              Gary's reviewing your info now. We'll email you the moment you're
              approved — usually within 24 hours.
            </p>
          </div>

          {/* Status cards */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--background)] px-4 py-3.5 text-left shadow-[var(--shadow-sm)]">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--warning)]/12 text-[var(--warning)]">
                <Clock className="size-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-[13px] font-semibold">
                  Pending admin review
                </p>
                <p className="text-[12px] text-[var(--muted-foreground)]">
                  Average response time: under 24 hours
                </p>
              </div>
              <div className="flex size-2 animate-pulse rounded-full bg-[var(--warning)]" />
            </div>

            <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--background)] px-4 py-3.5 text-left shadow-[var(--shadow-sm)]">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/12 text-[var(--primary)]">
                <Mail className="size-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-[13px] font-semibold">Watch your inbox</p>
                <p className="text-[12px] text-[var(--muted-foreground)]">
                  Approval email lands the moment Gary signs off
                </p>
              </div>
            </div>
          </div>

          {/* Sign out */}
          <div className="pt-2">
            <Button variant="ghost" size="sm" className="text-[13px]">
              Sign out
            </Button>
          </div>

          {isDev && (
            <div className="pt-2">
              <a
                href="/onboarding/welcome"
                className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--subtle-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                Run onboarding again (dev)
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
