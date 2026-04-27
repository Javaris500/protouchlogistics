/// <reference types="vite/client" />
import type { ReactNode } from "react";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";

import type { RouterContext } from "@/router";
import "@/styles/globals.css";

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "ProTouch Logistics" },
      // PWA + theme color (per scheme so the status bar matches the topbar)
      {
        name: "theme-color",
        content: "#ffffff",
        media: "(prefers-color-scheme: light)",
      },
      {
        name: "theme-color",
        content: "#111827",
        media: "(prefers-color-scheme: dark)",
      },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "ProTouch" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/logo.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
    scripts: [
      {
        // Apply theme class on <html> before paint to avoid FOUC.
        children: `(function(){try{var c=document.cookie.match(/(?:^|; )theme=([^;]+)/);var s=c?decodeURIComponent(c[1]):null;var p=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;var t=s==="light"||s==="dark"?s:(p?"dark":"light");document.documentElement.classList.toggle("dark",t==="dark");document.documentElement.dataset.theme=t;}catch(_){}}());`,
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <Outlet />
      </QueryClientProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <HeadContent />
      </head>
      <body className="h-full antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] p-6 text-[var(--foreground)]">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          The page you were looking for doesn't exist.
        </p>
      </div>
    </div>
  );
}
