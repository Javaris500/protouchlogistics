import { createFileRoute } from "@tanstack/react-router";
import {
  Database,
  HardDrive,
  Mail,
  Map as MapIcon,
  MapPin,
  ShieldAlert,
  Cloud,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/settings/integrations")({
  component: IntegrationsPage,
});

interface IntegrationCard {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
}

const INTEGRATIONS: IntegrationCard[] = [
  {
    id: "neon",
    name: "Neon",
    description: "Postgres database powering every admin and driver query.",
    icon: Database,
  },
  {
    id: "cloudflare-r2",
    name: "Cloudflare R2",
    description: "Object storage for CDLs, rate cons, POD photos, and invoices.",
    icon: HardDrive,
  },
  {
    id: "resend",
    name: "Resend",
    description: "Transactional email for invites, alerts, and invoice delivery.",
    icon: Mail,
  },
  {
    id: "mapbox",
    name: "Mapbox",
    description: "Route maps, driver tracking, and truck-aware directions.",
    icon: MapIcon,
  },
  {
    id: "google-places",
    name: "Google Places",
    description: "Address autocomplete for pickups, deliveries, and broker offices.",
    icon: MapPin,
  },
  {
    id: "sentry",
    name: "Sentry",
    description: "Error tracking and performance telemetry for the admin app.",
    icon: ShieldAlert,
  },
  {
    id: "vercel",
    name: "Vercel",
    description: "Hosting and preview deployments for the ProTouch web app.",
    icon: Cloud,
  },
];

function IntegrationsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Connect the services ProTouch uses to automate dispatch, billing, and
          driver operations.
        </p>
        <span className="shrink-0 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">0</span> of{" "}
          {INTEGRATIONS.length} connected
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {INTEGRATIONS.map((it) => (
          <IntegrationCardView key={it.id} integration={it} />
        ))}
      </div>
    </div>
  );
}

function IntegrationCardView({ integration }: { integration: IntegrationCard }) {
  const Icon = integration.icon;
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl",
        "border border-[color-mix(in_oklab,var(--border)_70%,transparent)]",
        "bg-card text-card-foreground shadow-[var(--shadow-sm)]",
      )}
    >
      <div className="flex flex-col gap-3 p-4 pb-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-[10px]",
              "bg-muted text-muted-foreground",
              "ring-1 ring-inset ring-[var(--border)]",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="truncate text-sm font-semibold leading-tight">
              {integration.name}
            </h3>
            <NotConnectedPill />
          </div>
        </div>

        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {integration.description}
        </p>
      </div>

      <div
        className={cn(
          "mt-auto flex items-center justify-end border-t px-4 py-2.5",
          "border-[color-mix(in_oklab,var(--border)_60%,transparent)]",
        )}
      >
        <Button type="button" size="sm" variant="outline" disabled>
          Connect
        </Button>
      </div>
    </div>
  );
}

function NotConnectedPill() {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5",
        "text-[10px] font-semibold uppercase tracking-wider",
        "bg-muted text-muted-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
      />
      Not connected
    </span>
  );
}
