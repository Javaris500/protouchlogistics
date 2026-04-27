/**
 * Vercel Function entry — bridges Vercel's Node runtime to TanStack Start's
 * Web-Standard fetch handler.
 *
 * Vercel passes (req: IncomingMessage, res: ServerResponse) — Node-style.
 * TanStack Start expects fetch(request: Request) — Web-style.
 * We convert in both directions.
 */
import { Readable } from "node:stream";

import server from "../dist/server/server.js";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  const host = req.headers.host ?? "localhost";
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const url = `${proto}://${host}${req.url}`;

  // Node headers → Web Headers
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) {
      for (const item of v) headers.append(k, item);
    } else if (v !== undefined) {
      headers.set(k, v);
    }
  }

  const init = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = Readable.toWeb(req);
    init.duplex = "half";
  }
  const webRequest = new Request(url, init);

  let webResponse;
  try {
    webResponse = await server.fetch(webRequest);
  } catch (err) {
    console.error("[api/index] server.fetch threw", err);
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain");
    res.end("Server error");
    return;
  }

  // Web Response → Node response
  res.statusCode = webResponse.status;

  // Set-Cookie may have multiple values; preserve them.
  const setCookies =
    typeof webResponse.headers.getSetCookie === "function"
      ? webResponse.headers.getSetCookie()
      : [];
  webResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    res.setHeader(key, value);
  });
  if (setCookies.length > 0) {
    res.setHeader("Set-Cookie", setCookies);
  }

  if (webResponse.body) {
    Readable.fromWeb(webResponse.body).pipe(res);
  } else {
    res.end();
  }
}
