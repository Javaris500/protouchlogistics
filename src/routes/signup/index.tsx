import * as React from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpFn } from "@/server/auth/functions";

export const Route = createFileRoute("/signup/")({
  component: SignUpPage,
});

function SignUpPage() {
  const router = useRouter();
  void router; // redirect uses window.location to refresh server context
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await signUpFn({
        data: { email, password, name: name.trim() || undefined },
      });
      window.location.href = "/onboarding";
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sign-up failed. Try a different email.",
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
            Create your account
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--muted-foreground)]">
            You'll walk through onboarding next. Gary reviews and approves new
            drivers within 24 hours.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[12.5px] font-medium">
                Full name{" "}
                <span className="font-normal text-[var(--muted-foreground)]">
                  (optional)
                </span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="You can fill this in onboarding"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
              />
            </div>

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
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                required
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
                  autoComplete="new-password"
                  placeholder="At least 12 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-11"
                  required
                  minLength={12}
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

            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-[12.5px] font-medium">
                Confirm password
              </Label>
              <Input
                id="confirm"
                name="confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-11"
                required
                minLength={12}
              />
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
                  <span>Creating account…</span>
                </>
              ) : (
                <>
                  <span>Create account</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-[12.5px] text-[var(--muted-foreground)]">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-[var(--foreground)] underline-offset-4 hover:underline"
            >
              Sign in
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
