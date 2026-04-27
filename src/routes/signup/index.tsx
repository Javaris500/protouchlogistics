import * as React from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

import { signUpFn } from "@/server/auth/functions";

/**
 * Public driver signup. Creates a `users` row with role='driver' and
 * status='pending_approval'. New users are routed straight into the
 * onboarding flow; Gary approves them later from /admin/drivers/pending.
 *
 * Bare scaffold to match /login. Phase 2 reskins both.
 */
export const Route = createFileRoute("/signup/")({
  component: SignUpPage,
});

function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters");
      return;
    }

    setSubmitting(true);
    try {
      await signUpFn({
        data: { email, password, name: name.trim() || undefined },
      });
      await router.navigate({ to: "/onboarding" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-up failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: "360px",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Create your driver account</h1>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569" }}>
          You'll walk through onboarding next. Gary reviews and approves new
          drivers within 24 hours.
        </p>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem" }}>Full name</span>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Optional — you can fill this in onboarding"
            style={{ padding: "0.5rem 0.75rem", fontSize: "1rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem", outline: "none" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem" }}>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: "0.5rem 0.75rem", fontSize: "1rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem", outline: "none" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem" }}>Password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={12}
            style={{ padding: "0.5rem 0.75rem", fontSize: "1rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem", outline: "none" }}
          />
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
            Minimum 12 characters.
          </span>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem" }}>Confirm password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={12}
            style={{ padding: "0.5rem 0.75rem", fontSize: "1rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem", outline: "none" }}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          style={{ padding: "0.6rem", fontSize: "1rem", marginTop: "0.5rem", background: "#0f172a", color: "white", border: "none", borderRadius: "0.375rem", cursor: submitting ? "wait" : "pointer", fontWeight: 600 }}
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>

        {error && (
          <p role="alert" style={{ color: "#b91c1c", fontSize: "0.85rem", margin: 0 }}>
            {error}
          </p>
        )}

        <p style={{ fontSize: "0.85rem", margin: "0.5rem 0 0", textAlign: "center" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#2563eb" }}>
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
