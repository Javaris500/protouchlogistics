import { createFileRoute } from "@tanstack/react-router";
import { Building2, Globe, Key, Monitor, Palette, Shield } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/settings/")({
  component: SettingsPage,
});

const SETTINGS_SECTIONS = [
  {
    icon: Building2,
    label: "Company info",
    description: "Legal name, address, MC/DOT numbers for invoices",
  },
  {
    icon: Globe,
    label: "Timezone & locale",
    description: "Cron jobs, expiration alerts, date display",
  },
  {
    icon: Palette,
    label: "Appearance",
    description: "Theme preference, default mode for new sessions",
  },
  {
    icon: Shield,
    label: "Two-factor auth",
    description: "TOTP setup, backup codes, enforce on login",
  },
  {
    icon: Key,
    label: "API keys & tokens",
    description: "Mapbox, Google Places, Resend, Sentry DSN",
  },
  {
    icon: Monitor,
    label: "Display tokens",
    description: "Wall-mount TV dashboards with read-only access",
  },
];

function SettingsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Settings"
        title="Company Settings"
        description="Configure ProTouch Logistics preferences and integrations."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SETTINGS_SECTIONS.map((section) => (
          <Card
            key={section.label}
            className={cn(
              "group cursor-pointer gap-3 p-5 transition-shadow duration-200 ease-out hover:shadow-[var(--shadow-md)]",
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-2)] text-muted-foreground transition-colors duration-200 ease-out group-hover:bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] group-hover:text-[var(--primary)]">
                <section.icon className="size-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">{section.label}</span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {section.description}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
