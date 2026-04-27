import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login/")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [remember, setRemember] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    // UI-only stub. The backend will read the role off the credentials
    // and route the user to /admin/* or /driver/* accordingly.
    console.log("[login submit]", { email, remember });
    setTimeout(() => setSubmitting(false), 900);
  }

  return (
    <div className="flex min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      {/* ---------- LEFT BRAND PANEL (lg+) ---------- */}
      <aside className="relative hidden w-[42%] max-w-[600px] overflow-hidden bg-[var(--foreground)] text-[var(--background)] lg:flex lg:flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-1/3 -left-1/4 size-[680px] rounded-full bg-[radial-gradient(circle,rgb(242_122_26_/_0.18),transparent_60%)] blur-2xl"
        />

        <div className="relative z-10 flex items-center gap-2.5 px-12 pt-12">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary)]">
            <span className="font-mono text-[10px] font-bold tracking-wider text-[var(--primary-foreground)]">
              PTL
            </span>
          </div>
          <span className="text-[13.5px] font-semibold tracking-tight">
            ProTouch Logistics
          </span>
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-end px-12 pb-12">
          <figure className="max-w-md">
            <blockquote className="text-[1.5rem] font-medium leading-[1.35] tracking-tight text-white">
              "Built for the way we actually run dispatch — every load, every
              driver, in one place."
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-white/10 font-semibold text-[12px] text-white">
                GM
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold text-white">
                  Gary Marshall
                </span>
                <span className="text-[12px] text-white/55">
                  Operations Lead, ProTouch
                </span>
              </div>
            </figcaption>
          </figure>
        </div>
      </aside>

      {/* ---------- RIGHT FORM PANEL ---------- */}
      <main className="flex flex-1 flex-col">
        {/* Mobile + small-screen header */}
        <header className="flex items-center justify-between px-6 py-6 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--foreground)]">
              <span className="font-mono text-[10px] font-bold tracking-wider text-[var(--background)]">
                PTL
              </span>
            </div>
            <span className="text-[13.5px] font-semibold tracking-tight">
              ProTouch Logistics
            </span>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 pb-12 sm:px-10">
          <div className="w-full max-w-[380px]">
            <h1 className="text-[1.625rem] font-semibold leading-tight tracking-tight">
              Sign in
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--muted-foreground)]">
              Enter your credentials to continue.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[12.5px] font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@protouchlogistics.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="text-[12.5px] font-medium"
                  >
                    Password
                  </Label>
                  <button
                    type="button"
                    className="text-[12px] font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                    onClick={() => console.log("[forgot password]")}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-11"
                    required
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[var(--radius-md)] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 select-none">
                <span className="relative flex size-4 items-center justify-center">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="peer size-4 cursor-pointer appearance-none rounded-[4px] border border-[var(--border-strong)] bg-[var(--background)] transition-colors checked:border-[var(--primary)] checked:bg-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40"
                  />
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    className="pointer-events-none absolute size-3 text-[var(--primary-foreground)] opacity-0 peer-checked:opacity-100"
                  >
                    <path
                      d="M3 8l3.5 3.5L13 5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="text-[12.5px] text-[var(--muted-foreground)]">
                  Keep me signed in
                </span>
              </label>

              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="h-11 w-full text-[14px] font-semibold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-8 text-[12.5px] text-[var(--muted-foreground)]">
              New driver?{" "}
              <a
                href="/onboarding"
                className="font-medium text-[var(--foreground)] underline-offset-4 hover:underline"
              >
                Start onboarding
              </a>
            </p>
          </div>
        </div>

        <footer className="flex flex-col items-center justify-between gap-2 border-t border-[var(--border)] px-6 py-5 text-[11px] text-[var(--subtle-foreground)] sm:flex-row sm:px-10">
          <span>© {new Date().getFullYear()} ProTouch Logistics, LLC.</span>
          <div className="flex items-center gap-5">
            <a
              href="#"
              className="transition-colors hover:text-[var(--foreground)]"
            >
              Terms
            </a>
            <a
              href="#"
              className="transition-colors hover:text-[var(--foreground)]"
            >
              Privacy
            </a>
            <a
              href="mailto:support@protouchlogistics.com"
              className="transition-colors hover:text-[var(--foreground)]"
            >
              Support
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
