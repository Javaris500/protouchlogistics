import { createFileRoute } from "@tanstack/react-router";

import { dbHealthFn } from "@/server/functions/health";

/**
 * Diagnostic route. Runs `select now()` against the configured DB and
 * dumps the result. Use to distinguish "DB unreachable from Vercel" from
 * other failure modes during incident triage.
 */
export const Route = createFileRoute("/health")({
  loader: async () => dbHealthFn(),
  component: HealthPage,
});

function HealthPage() {
  const data = Route.useLoaderData();
  return (
    <pre style={{ padding: 24, fontFamily: "monospace", fontSize: 13 }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
