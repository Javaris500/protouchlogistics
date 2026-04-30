import { createFileRoute } from "@tanstack/react-router";

import {
  blobHealthFn,
  dbHealthFn,
  echoPostFn,
} from "@/server/functions/health";

// Keep echoPostFn referenced so the build bundles it. Diagnostic only.
void echoPostFn;

/**
 * Diagnostic route. Checks DB connectivity and Vercel Blob read/write.
 * Navigate to /health to verify the upload pipeline is configured correctly.
 */
export const Route = createFileRoute("/health")({
  loader: async () => {
    const [db, blob] = await Promise.all([dbHealthFn(), blobHealthFn()]);
    return { db, blob };
  },
  component: HealthPage,
});

function HealthPage() {
  const { db, blob } = Route.useLoaderData();
  return (
    <pre style={{ padding: 24, fontFamily: "monospace", fontSize: 13 }}>
      {JSON.stringify({ db, blob }, null, 2)}
    </pre>
  );
}
