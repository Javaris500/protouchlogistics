/**
 * Vercel Function entry point.
 *
 * TanStack Start v1.16x outputs a Web-Standard fetch handler at
 * `dist/server/server.js`. Vercel's Node runtime supports Request/Response
 * handler signatures natively, so we just delegate.
 *
 * vercel.json rewrites every non-static path to `/api`, so this function
 * serves all dynamic routes (admin pages, login, server functions, RPC).
 * Static assets in `dist/assets/`, `dist/client/`, and the prerendered
 * `dist/index.html` are served directly by Vercel without hitting this.
 */
import server from "../dist/server/server.js";

export const config = {
  runtime: "nodejs",
};

export default async function handler(request) {
  return server.fetch(request);
}
