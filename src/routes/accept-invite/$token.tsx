import * as React from "react";
import { createFileRoute, useParams, useRouter } from "@tanstack/react-router";

import { acceptInviteFn } from "@/server/auth/functions";

/**
 * Bare /accept-invite/$token scaffold — intentionally minimal. See the
 * note on /login. Phase 2 will polish.
 */
export const Route = createFileRoute("/accept-invite/$token")({
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { token } = useParams({ from: "/accept-invite/$token" });
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (password.length < 12) {
      setError("Password must be at least 12 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }

    setSubmitting(true);
    try {
      await acceptInviteFn({ data: { token, password } });
      await router.navigate({ to: "/onboarding" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invite invalid or expired");
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
        <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Set your password</h1>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#525252" }}>
          Choose a password to finish accepting your invite.
        </p>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem" }}>Password (min 12 chars)</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: "0.5rem", fontSize: "1rem" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem" }}>Confirm password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            style={{ padding: "0.5rem", fontSize: "1rem" }}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          style={{ padding: "0.6rem", fontSize: "1rem", marginTop: "0.5rem" }}
        >
          {submitting ? "Setting up…" : "Continue"}
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
