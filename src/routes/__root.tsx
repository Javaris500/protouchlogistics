import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return <Outlet />;
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
