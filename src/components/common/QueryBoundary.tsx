import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { EmptyState, type EmptyStateVariant } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { Skeleton } from "./Skeleton";
import { errorMessage, errorTechnical } from "@/lib/errors";
import { EMPTY_COPY, type SurfaceKey } from "@/lib/empty-copy";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

/**
 * Single source of truth for the four-state pattern across admin routes.
 *
 *   pending  → <Skeleton />
 *   error    → <ErrorState onRetry={refetch} />
 *   empty    → <EmptyState variant=... />
 *   else     → children(data)
 *
 * Brief §3.1. Reuses Skeleton, ErrorState, EmptyState as-is.
 */
interface QueryBoundaryProps<TData> {
  query: UseQueryResult<TData>;
  children: (data: TData) => ReactNode;

  /**
   * Treat `data` as empty. Defaults:
   *   - data == null → true
   *   - Array.isArray(data) → data.length === 0
   *   - { items: T[] } → items.length === 0
   *   - else → false
   */
  isEmpty?: (data: TData) => boolean;

  /** Empty-copy lookup key from `src/lib/empty-copy.ts`. */
  emptyKey?: SurfaceKey;

  /** Override the empty-copy variant. */
  emptyVariant?: EmptyStateVariant;

  /** Replace the empty-state CTA. Wins over the EMPTY_COPY entry's ctaHref. */
  emptyAction?: ReactNode;

  /** Skeleton override. Default is a 128px-tall pulsing block. */
  skeleton?: ReactNode;

  /** ErrorState title override. */
  errorTitle?: string;
}

export function QueryBoundary<TData>({
  query,
  children,
  isEmpty,
  emptyKey,
  emptyVariant,
  emptyAction,
  skeleton,
  errorTitle = "Couldn't load this section",
}: QueryBoundaryProps<TData>) {
  if (query.status === "pending") {
    return <>{skeleton ?? <Skeleton className="h-32 w-full" />}</>;
  }

  if (query.status === "error") {
    return (
      <ErrorState
        title={errorTitle}
        description={errorMessage(query.error)}
        onRetry={() => query.refetch()}
        technicalDetails={errorTechnical(query.error)}
      />
    );
  }

  const data = query.data as TData;
  const empty = isEmpty ? isEmpty(data) : defaultIsEmpty(data);
  if (empty && emptyKey) {
    const copy = EMPTY_COPY[emptyKey];
    return (
      <EmptyState
        title={copy.title}
        description={copy.description}
        variant={emptyVariant ?? copy.variant}
        action={emptyAction ?? renderCopyCta(copy)}
      />
    );
  }

  return <>{children(data)}</>;
}

function defaultIsEmpty(data: unknown): boolean {
  if (data == null) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === "object" && data !== null && "items" in data) {
    const items = (data as { items: unknown }).items;
    if (Array.isArray(items)) return items.length === 0;
  }
  return false;
}

function renderCopyCta(copy: (typeof EMPTY_COPY)[SurfaceKey]): ReactNode {
  if (!copy.ctaLabel || !copy.ctaHref) return null;
  return (
    <Button asChild variant="primary" size="sm">
      <Link to={copy.ctaHref}>{copy.ctaLabel}</Link>
    </Button>
  );
}
