import { Link, createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  Clock,
  FileText,
  Gauge,
  MapPinned,
  MoreHorizontal,
  Pencil,
  Truck as TruckIcon,
  Upload,
  UserPlus,
  Wrench,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { BackLink } from "@/components/common/BackLink";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { EntityChip } from "@/components/common/EntityChip";
import { KeyStatStrip } from "@/components/common/KeyStatStrip";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExpirationBadge } from "@/components/ui/expiration-badge";
import { Separator } from "@/components/ui/separator";
import { StatusPill } from "@/components/ui/status-pill";
import type { TruckStatus } from "@/components/ui/status-pill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FIXTURE_TRUCKS } from "@/lib/fixtures/trucks";
import { daysUntil } from "@/lib/format";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/admin/trucks/$truckId")({
  component: TruckDetailPage,
});

function TruckDetailPage() {
  const { truckId } = Route.useParams();
  const truck = FIXTURE_TRUCKS.find((t) => t.id === truckId);

  if (!truck) {
    return (
      <div className="flex flex-col gap-5">
        <BackLink to="/admin/trucks">Back to trucks</BackLink>
        <PageHeader eyebrow="Truck" title="Truck not found" />
        <Card className="p-6">
          <EmptyState
            icon={TruckIcon}
            variant="first-time"
            title="We couldn't find that truck"
            description="It may have been retired, or the link is out of date. Head back to the trucks list to pick another unit."
            action={
              <Button asChild variant="primary" size="sm">
                <Link to="/admin/trucks">Back to trucks</Link>
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const nextDoc = nextExpiring(truck);
  const primary = primaryActionFor(truck.status);
  const [retireOpen, setRetireOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/trucks">Back to trucks</BackLink>

      <section className="animate-enter stagger-1 flex flex-col gap-5">
        <PageHeader
          eyebrow="Truck"
          title={
            <span className="inline-flex flex-wrap items-center gap-3">
              <span className="font-mono">Unit {truck.unitNumber}</span>
              <StatusPill kind="truck" status={truck.status} />
            </span>
          }
          description={`${truck.year} ${truck.make} ${truck.model}`}
          actions={
            <>
              <Button
                variant={primary.variant}
                size="md"
                onClick={() => toast.info(`${primary.label} — coming soon`)}
              >
                <primary.icon className="size-4" />
                {primary.label}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="More actions"
                    className="rounded-md"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Truck actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onSelect={() => toast.info("Assign driver — coming soon")}
                  >
                    <UserPlus /> Assign driver
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={truck.status === "in_shop"}
                    onSelect={() =>
                      toast.success(`Truck ${truck.unitNumber} moved to shop`)
                    }
                  >
                    <Wrench /> Move to shop
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={truck.status === "out_of_service"}
                    onSelect={() =>
                      toast.success(
                        `Truck ${truck.unitNumber} marked out of service`,
                      )
                    }
                  >
                    <XCircle /> Out of service
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="danger"
                    onSelect={() => setRetireOpen(true)}
                  >
                    <XCircle /> Retire truck
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />

        {/* Spec strip — at-a-glance truck identity */}
        <SpecStrip
          chips={[
            { label: `${truck.year}` },
            { label: truck.make },
            { label: truck.model },
            {
              label: `VIN ${truck.vin.slice(-6)}`,
              mono: true,
              tooltip: truck.vin,
            },
            {
              label: `${truck.licensePlate} · ${truck.plateState}`,
              mono: true,
            },
          ]}
        />

        <KeyStatStrip
          stats={[
            {
              label: "Mileage",
              value: truck.currentMileage.toLocaleString(),
              sublabel: "miles driven",
              mono: true,
              emphasis: true,
            },
            {
              label: "Next expiration",
              value: nextDoc ? `${nextDoc.days}d` : "—",
              sublabel: nextDoc ? nextDoc.label : "All docs current",
              mono: !!nextDoc,
            },
            {
              label: "Assigned to",
              value: truck.assignedDriver
                ? `${truck.assignedDriver.firstName} ${truck.assignedDriver.lastName[0]}.`
                : "Unassigned",
            },
          ]}
        />
      </section>

      <Tabs defaultValue="overview" className="animate-enter stagger-2">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">Load history</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel icon={TruckIcon} title="Vehicle" className="lg:col-span-2">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                <Field label="Year" value={String(truck.year)} mono />
                <Field label="Make" value={truck.make} />
                <Field label="Model" value={truck.model} />
                <Field label="VIN" value={truck.vin} mono />
                <Field
                  label="Plate"
                  value={`${truck.licensePlate} · ${truck.plateState}`}
                  mono
                />
                <Field
                  label="Mileage"
                  value={truck.currentMileage.toLocaleString()}
                  mono
                />
              </dl>
            </Panel>

            <Panel icon={Gauge} title="Assignment">
              {truck.assignedDriver ? (
                <div className="flex flex-col gap-3">
                  <EntityChip
                    kind="driver"
                    id={truck.assignedDriver.id}
                    label={`${truck.assignedDriver.firstName} ${truck.assignedDriver.lastName}`}
                  />
                  <div className="rounded-md bg-[var(--surface-2)] px-3 py-2 text-[11px] text-muted-foreground">
                    Default driver for Unit {truck.unitNumber}. Reassign from
                    the driver's profile or the load dispatcher.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-3">
                  <p className="text-sm text-muted-foreground">
                    This truck has no default driver.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => toast.info("Assign driver — coming soon")}
                  >
                    <UserPlus className="size-4" /> Assign driver
                  </Button>
                </div>
              )}
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card className="gap-0 p-0">
            <ul className="divide-y divide-border">
              <DocRow
                label="Registration"
                date={truck.registrationExpiration}
              />
              <DocRow label="Insurance" date={truck.insuranceExpiration} />
              <DocRow
                label="Annual inspection"
                date={truck.annualInspectionExpiration}
              />
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <EmptyCard
            icon={Clock}
            title="No load history yet"
            description="Past loads hauled by Unit will appear here with miles, rates, and dates."
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/loads">
                  <MapPinned className="size-3.5" /> Open loads list
                </Link>
              </Button>
            }
          />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={retireOpen}
        onOpenChange={setRetireOpen}
        tone="danger"
        title={`Retire truck ${truck.unitNumber}?`}
        description="This removes the unit from the active fleet. It won't appear in dispatch pickers. This can't be undone."
        confirmLabel="Retire truck"
        onConfirm={() => {
          toast.success(`Truck ${truck.unitNumber} retired`);
          setRetireOpen(false);
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Spec strip                                                                */
/* -------------------------------------------------------------------------- */

function SpecStrip({
  chips,
}: {
  chips: { label: string; mono?: boolean; tooltip?: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c, i) => (
        <span
          key={i}
          title={c.tooltip}
          className={
            "inline-flex items-center rounded-full border border-[var(--border)] " +
            "bg-[var(--surface)] px-2.5 py-1 text-[11px] " +
            (c.mono ? "font-mono font-semibold tabular-nums" : "font-medium")
          }
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Doc row                                                                   */
/* -------------------------------------------------------------------------- */

function DocRow({ label, date }: { label: string; date: string }) {
  const days = daysUntil(date);
  const urgent = days <= 14;
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={
            "flex size-9 shrink-0 items-center justify-center rounded-md " +
            (urgent
              ? "bg-[color-mix(in_oklab,var(--warning)_15%,transparent)] text-[var(--warning)]"
              : "bg-muted text-muted-foreground")
          }
        >
          <FileText className="size-4" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-[11px] text-muted-foreground">
            Expires {date}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ExpirationBadge date={date} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.info("Document upload — coming soon")}
        >
          <Upload className="size-3.5" /> Replace
        </Button>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers / primitives                                                      */
/* -------------------------------------------------------------------------- */

function nextExpiring(truck: {
  registrationExpiration: string;
  insuranceExpiration: string;
  annualInspectionExpiration: string;
}): { label: string; days: number } | null {
  const all = [
    { label: "Registration", date: truck.registrationExpiration },
    { label: "Insurance", date: truck.insuranceExpiration },
    { label: "Annual inspection", date: truck.annualInspectionExpiration },
  ].map((d) => ({ ...d, days: daysUntil(d.date) }));
  const sorted = all.sort((a, b) => a.days - b.days);
  return sorted[0] ?? null;
}

interface PrimaryAction {
  label: string;
  icon: LucideIcon;
  variant: "primary" | "outline";
}

function primaryActionFor(status: TruckStatus): PrimaryAction {
  switch (status) {
    case "active":
      return { label: "Edit", icon: Pencil, variant: "outline" };
    case "in_shop":
      return { label: "Mark repaired", icon: Wrench, variant: "primary" };
    case "out_of_service":
      return {
        label: "Return to service",
        icon: TruckIcon,
        variant: "primary",
      };
    default:
      return { label: "Edit", icon: Pencil, variant: "outline" };
  }
}

function Panel({
  icon: Icon,
  title,
  trailing,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={"gap-0 p-5 " + (className ?? "")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Icon className="size-3.5" /> {title}
        </div>
        {trailing}
      </div>
      <Separator className="my-3" />
      {children}
    </Card>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className={mono ? "font-mono text-sm tabular-nums" : "text-sm"}>
        {value}
      </dd>
    </div>
  );
}

function EmptyCard({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="flex size-10 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]">
        <Icon className="size-5 text-[var(--primary)]" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-center text-xs text-muted-foreground">
        {description}
      </p>
      {action}
    </Card>
  );
}
