/**
 * Vercel Function entry — diagnostic mode.
 * Replaced with the real TanStack Start delegate once we confirm the
 * function infra works at all.
 */
export const config = {
  runtime: "nodejs",
};

export default async function handler(request) {
  return new Response(
    JSON.stringify(
      {
        ok: true,
        url: request.url,
        method: request.method,
        envCheck: {
          hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
          hasAuthSecret: Boolean(process.env.BETTER_AUTH_SECRET),
          nodeVersion: process.version,
        },
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
}
