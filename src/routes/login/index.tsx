import * as React from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import { signInFn } from "@/server/auth/functions";

/**
 * Bare /login scaffold — intentionally minimal.
 *
 * Per the Session-1 brief §3.4, this scaffold is locked: Sessions 2 and 3
 * cannot redesign it during this sprint. Phase 2 will re-skin it once the
 * auth flows are stable.
 */
export const Route = createFileRoute("/login/")({
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const user = await signInFn({ data: { email, password } });
      if (user.role === "admin") {
        await router.navigate({ to: "/admin/dashboard" });
      } else {
        await router.navigate({ to: "/onboarding" });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
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
          maxWidth: "320px",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Sign in</h1>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem" }}>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: "0.5rem", fontSize: "1rem" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem" }}>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: "0.5rem", fontSize: "1rem" }}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          style={{ padding: "0.6rem", fontSize: "1rem", marginTop: "0.5rem" }}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        {error && (
          <p role="alert" style={{ color: "#b91c1c", fontSize: "0.85rem", margin: 0 }}>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
