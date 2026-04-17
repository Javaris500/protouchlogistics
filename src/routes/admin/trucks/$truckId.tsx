import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import {
  FileText,
  Gauge,
  MoreHorizontal,
  Pencil,
  Truck as TruckIcon,
  UserPlus,
  Wrench,
  XCircle,
} from "lucide-react";

import { BackLink } from "@/components/common/BackLink";
import { PageHeader } from "@/components/common/PageHeader";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FIXTURE_TRUCKS } from "@/lib/fixtures/trucks";

export const Route = createFileRoute("/admin/trucks/$truckId")({
  loader: ({ params }) => {
    const truck = FIXTURE_TRUCKS.find((t) => t.id === params.truckId);
    if (!truck) throw notFound();
    return { truck };
  },
  component: TruckDetailPage,
});

function TruckDetailPage() {
  const { truck } = Route.useLoaderData();

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/trucks">Back to trucks</BackLink>

      <PageHeader
        eyebrow="Truck"
        title={
          <span className="inline-flex items-center gap-3">
            <span className="font-mono">Unit {truck.unitNumber}</span>
            <StatusPill kind="truck" status={truck.status} />
          </span>
        }
        description={`${truck.year} ${truck.make} ${truck.model} · VIN ${truck.vin}`}
        actions={
          <>
            <Button variant="outline" size="md">
              <Pencil className="size-4" />
              Edit
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
                <DropdownMenuItem>
                  <UserPlus /> Assign driver
                </DropdownMenuItem>
                <DropdownMenuItem disabled={truck.status === "in_shop"}>
                  <Wrench /> Move to shop
                </DropdownMenuItem>
                <DropdownMenuItem disabled={truck.status === "out_of_service"}>
                  <XCircle /> Out of service
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="danger">
                  <XCircle /> Retire truck
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">Load history</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="gap-0 p-5 lg:col-span-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <TruckIcon className="size-3.5" /> Vehicle
              </div>
              <Separator className="my-3" />
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                <Field label="Year" value={String(truck.year)} />
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
            </Card>

            <Card className="gap-0 p-5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <Gauge className="size-3.5" /> Assignment
              </div>
              <Separator className="my-3" />
              {truck.assignedDriver ? (
                <Link
                  to="/admin/drivers/$driverId"
                  params={{ driverId: truck.assignedDriver.id }}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] p-2 transition-colors hover:bg-[var(--surface-2)]"
                >
                  <div className="flex size-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-semibold">
                    {initials(
                      truck.assignedDriver.firstName,
                      truck.assignedDriver.lastName,
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {truck.assignedDriver.firstName}{" "}
                      {truck.assignedDriver.lastName}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      View driver profile →
                    </span>
                  </div>
                </Link>
              ) : (
                <Button variant="outline" size="sm">
                  <UserPlus className="size-4" /> Assign driver
                </Button>
              )}
            </Card>
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
          <Card className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <TruckIcon className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Load history</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Past loads hauled by this truck show up here.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DocRow({ label, date }: { label: string; date: string }) {
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-muted">
          <FileText className="size-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-[11px] text-muted-foreground">
            Expires {date}
          </span>
        </div>
      </div>
      <ExpirationBadge date={date} />
    </li>
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

function initials(first: string, last: string): string {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}
