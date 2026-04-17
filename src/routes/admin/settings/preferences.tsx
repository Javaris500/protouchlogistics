import { createFileRoute } from "@tanstack/react-router";
import { Bell, Globe, Monitor, Palette } from "lucide-react";

import { BackLink } from "@/components/common/BackLink";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/settings/preferences")({
  component: PreferencesPage,
});

function PreferencesPage() {
  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/settings">Back to settings</BackLink>

      <PageHeader
        eyebrow="Settings"
        title="Preferences"
        description="How ProTouch Logistics looks, sounds, and behaves for your account."
      />

      <div className="flex flex-col gap-4">
        <PrefCard
          icon={<Palette />}
          title="Appearance"
          description="Default theme for new sessions. You can still toggle on the fly."
          control={
            <Select defaultValue="system">
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">Follow system</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        <PrefCard
          icon={<Globe />}
          title="Timezone"
          description="Used for expiration alerts, cron jobs, and timestamp display."
          control={
            <Select defaultValue="America/Chicago">
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/New_York">
                  Eastern (New York)
                </SelectItem>
                <SelectItem value="America/Chicago">
                  Central (Chicago)
                </SelectItem>
                <SelectItem value="America/Denver">
                  Mountain (Denver)
                </SelectItem>
                <SelectItem value="America/Phoenix">
                  Mountain (Phoenix, no DST)
                </SelectItem>
                <SelectItem value="America/Los_Angeles">
                  Pacific (Los Angeles)
                </SelectItem>
              </SelectContent>
            </Select>
          }
        />

        <PrefCard
          icon={<Bell />}
          title="Email notifications"
          description="How often we email you for non-urgent events."
          control={
            <Select defaultValue="immediate">
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="hourly">Hourly digest</SelectItem>
                <SelectItem value="daily">Daily digest</SelectItem>
                <SelectItem value="off">Off (in-app only)</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        <PrefCard
          icon={<Monitor />}
          title="Density"
          description="Table row height and card padding."
          control={
            <Select defaultValue="comfortable">
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </div>
    </div>
  );
}

function PrefCard({
  icon,
  title,
  description,
  control,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <Card className="gap-0 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4">
            {icon}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">{title}</span>
            <span className="text-xs text-muted-foreground">{description}</span>
          </div>
        </div>
        <div className="sm:shrink-0">{control}</div>
      </div>
      <Separator className="mt-4 opacity-0" />
    </Card>
  );
}
