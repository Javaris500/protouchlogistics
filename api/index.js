/**
 * Vercel Function entry — delegates every request to TanStack Start's
 * server entry. Vercel's Node runtime adapter passes path-only Requests
 * (e.g. `/favicon.svg`); TanStack Start (via h3/srvx) needs a full URL.
 * We rebuild the Request with an absolute URL before delegating.
 */
import server from "../dist/server/server.js";

export const config = {
  runtime: "nodejs",
};

export default async function handler(request) {
  const host = request.headers.get("host") ?? "localhost";
  const proto = request.headers.get("x-forwarded-proto") ?? "https";

  const incoming = new URL(request.url, `${proto}://${host}`);

  const init = {
    method: request.method,
    headers: request.headers,
  };
  // GET / HEAD cannot have a body; everything else forwards as-is.
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  const fullRequest = new Request(incoming, init);
  return server.fetch(fullRequest);
}
