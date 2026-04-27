import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";

import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";
import {
  formatDateTimeShort,
  formatMoneyCents,
  formatRelativeFromNow,
} from "@/lib/format";

import type { DriverLoadSummary } from "@/server/functions/driver/loads";

interface Props {
  load: DriverLoadSummary;
  /** When true, render as a non-link card (used on /driver Home where the
   * primary CTA is elsewhere). */
  asLink?: boolean;
  className?: string;
}

export function LoadCard({ load, asLink = true, className }: Props) {
  const inner = <LoadCardInner load={load} />;
  if (!asLink) {
    return (
      <Card
        className={cn(
          "gap-0 p-4 transition-shadow hover:shadow-[var(--shadow-md)]",
          className,
        )}
      >
        {inner}
      </Card>
    );
  }
  return (
    <Link
      to="/driver/loads/$loadId"
      params={{ loadId: load.id }}
      className={cn("block", className)}
    >
      <Card className="gap-0 p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
        {inner}
      </Card>
    </Link>
  );
}

function LoadCardInner({ load }: { load: DriverLoadSummary }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            #{load.loadNumber}
          </p>
          <p className="mt-1 truncate text-[15px] font-semibold text-[var(--foreground)]">
            {load.brokerName}
          </p>
        </div>
        <StatusPill kind="load" status={load.status} />
      </div>

      {load.firstStop && load.lastStop && (
        <div className="flex items-center gap-2 text-[13px]">
          <MapPin
            className="size-3.5 shrink-0 text-[var(--muted-foreground)]"
            aria-hidden
          />
          <span className="truncate text-[var(--foreground)]">
            {load.firstStop.city}, {load.firstStop.state}
          </span>
          <ArrowRight
            className="size-3 shrink-0 text-[var(--muted-foreground)]"
            aria-hidden
          />
          <span className="truncate text-[var(--foreground)]">
            {load.lastStop.city}, {load.lastStop.state}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3 text-[12px]">
        <div className="flex items-center gap-3 text-[var(--muted-foreground)]">
          <span className="truncate">
            {load.commodity}
            {load.miles != null && ` · ${load.miles.toLocaleString()} mi`}
          </span>
        </div>
        <div className="text-right">
          {load.driverPayCents != null ? (
            <span className="font-semibold text-[var(--foreground)]">
              {formatMoneyCents(load.driverPayCents)}
            </span>
          ) : (
            <span className="text-[var(--muted-foreground)]">Pay pending</span>
          )}
        </div>
      </div>

      {load.firstStop && (
        <p className="text-[11px] text-[var(--muted-foreground)]">
          Pickup window {formatDateTimeShort(load.firstStop.windowStart)} ·
          updated {formatRelativeFromNow(load.updatedAt)}
        </p>
      )}
    </div>
  );
}
