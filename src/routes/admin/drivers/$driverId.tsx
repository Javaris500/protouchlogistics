import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import {
  AlertOctagon,
  FileText,
  MoreHorizontal,
  Pencil,
  Phone,
  ShieldCheck,
  Truck,
  UserCircle2,
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
import {
  FIXTURE_DRIVERS,
  PAY_MODEL_LABEL,
  formatPayRate,
  formatPhone,
} from "@/lib/fixtures/drivers";

export const Route = createFileRoute("/admin/drivers/$driverId")({
  loader: ({ params }) => {
    const driver = FIXTURE_DRIVERS.find((d) => d.id === params.driverId);
    if (!driver) throw notFound();
    return { driver };
  },
  component: DriverDetailPage,
});

function DriverDetailPage() {
  const { driver } = Route.useLoaderData();

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/drivers">Back to drivers</BackLink>

      <PageHeader
        eyebrow="Driver"
        title={
          <span className="inline-flex items-center gap-3">
            <span>
              {driver.firstName} {driver.lastName}
            </span>
            <StatusPill kind="driver" status={driver.status} />
          </span>
        }
        description={
          driver.hireDate
            ? `Hired ${driver.hireDate} · Pay ${formatPayRate(driver)} (${PAY_MODEL_LABEL[driver.payModel]})`
            : `Pay ${formatPayRate(driver)} (${PAY_MODEL_LABEL[driver.payModel]})`
        }
        actions={
          <>
            <Button variant="outline" size="md">
              <Pencil className="size-4" /> Edit
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
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Driver actions</DropdownMenuLabel>
                <DropdownMenuItem>
                  <ShieldCheck /> Reset 2FA
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText /> Request new doc
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="danger">
                  <AlertOctagon /> Suspend driver
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
          <TabsTrigger value="pay">Pay</TabsTrigger>
          <TabsTrigger value="loads">Loads</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="gap-0 p-5 lg:col-span-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <UserCircle2 className="size-3.5" /> Contact
              </div>
              <Separator className="my-3" />
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <Field label="Email" value={driver.email} />
                <Field label="Phone" value={formatPhone(driver.phone)} mono />
                <Field
                  label="Home base"
                  value={`${driver.city}, ${driver.state}`}
                />
                <Field
                  label="Loads YTD"
                  value={String(driver.loadsThisYear)}
                  mono
                />
              </dl>
            </Card>

            <Card className="gap-0 p-5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <Truck className="size-3.5" /> Assignment
              </div>
              <Separator className="my-3" />
              {driver.assignedTruck ? (
                <Link
                  to="/admin/trucks/$truckId"
                  params={{ truckId: driver.assignedTruck.id }}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] p-2 transition-colors hover:bg-[var(--surface-2)]"
                >
                  <div className="flex size-9 items-center justify-center rounded-md bg-[var(--surface-2)]">
                    <Truck className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-mono text-sm font-medium">
                      Unit {driver.assignedTruck.unitNumber}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      View truck profile →
                    </span>
                  </div>
                </Link>
              ) : (
                <Button variant="outline" size="sm">
                  <Truck className="size-4" /> Assign truck
                </Button>
              )}
            </Card>

            <Card className="gap-0 p-5 lg:col-span-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <ShieldCheck className="size-3.5" /> Credentials
              </div>
              <Separator className="my-3" />
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                <Field label="CDL class" value={driver.cdlClass} />
                <Field label="CDL number" value={driver.cdlNumber} mono />
                <Field label="CDL state" value={driver.cdlState} />
                <div className="flex flex-col gap-1">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    CDL expires
                  </dt>
                  <dd>
                    <ExpirationBadge date={driver.cdlExpiration} />
                  </dd>
                </div>
                <div className="flex flex-col gap-1 sm:col-span-4">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Medical card expires
                  </dt>
                  <dd>
                    <ExpirationBadge date={driver.medicalExpiration} />
                  </dd>
                </div>
              </dl>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card className="flex flex-col items-center justify-center gap-3 py-16">
            <FileText className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              CDL, medical card, MVR, drug test
            </p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Driver qualification file lives here. Expiration-tracked documents
              surface at the top.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="pay" className="mt-4">
          <Card className="flex flex-col items-center justify-center gap-3 py-16">
            <p className="text-sm font-medium">Per-period pay breakdown</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              YTD, current period, past periods. Drilldown to per-load calc.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="loads" className="mt-4">
          <Card className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <Phone className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">
              Loads delivered by this driver
            </p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Most recent first. Filter by status, broker, date range.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
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
