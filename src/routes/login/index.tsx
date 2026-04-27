import * as React from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInFn } from "@/server/auth/functions";

export const Route = createFileRoute("/login/")({
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  void router; // satisfies linter; redirect uses window.location to refresh server context
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    // Hard timeout — if signInFn hasn't returned in 15s the user gets a
    // real error instead of a stuck spinner. Common cause: Railway DB
    // wake-up latency on first hit after idle.
    const timeoutId = window.setTimeout(() => {
      setError(
        "Sign-in is taking longer than expected. Try again — if the database was idle, the next attempt should be fast.",
      );
      setSubmitting(false);
    }, 15_000);

    try {
      const user = await signInFn({ data: { email, password } });
      window.clearTimeout(timeoutId);
      const target =
        user.role === "admin"
          ? "/admin/dashboard"
          : user.driverId
            ? "/driver"
            : "/onboarding";
      window.location.href = target;
    } catch (err) {
      window.clearTimeout(timeoutId);
      setError(
        err instanceof Error
          ? err.message
          : "Sign-in failed. Check your email and password.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="flex items-center px-6 py-6 sm:px-10">
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

      <main className="flex flex-1 items-center justify-center px-6 pb-12">
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
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[12.5px] font-medium">
                Password
              </Label>
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
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

            {error && (
              <div
                role="alert"
                className="rounded-[var(--radius-md)] border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-3 py-2 text-[12.5px] text-[var(--danger)]"
              >
                {error}
              </div>
            )}

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
            <Link
              to="/signup"
              className="font-medium text-[var(--foreground)] underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </main>

      <footer className="flex flex-col items-center justify-between gap-2 border-t border-[var(--border)] px-6 py-5 text-[11px] text-[var(--subtle-foreground)] sm:flex-row sm:px-10">
        <span>© {new Date().getFullYear()} ProTouch Logistics, LLC.</span>
        <div className="flex items-center gap-5">
          <a href="#" className="transition-colors hover:text-[var(--foreground)]">
            Terms
          </a>
          <a href="#" className="transition-colors hover:text-[var(--foreground)]">
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
    </div>
  );
}
