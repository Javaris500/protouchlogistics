import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  AlertOctagon,
  Calendar,
  Check,
  FileText,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  ShieldCheck,
  Truck,
  Upload,
  UserCircle2,
  UserCog,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { toast } from "@/lib/toast";
import { errorMessage } from "@/lib/errors";
import { BackLink } from "@/components/common/BackLink";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EntityChip } from "@/components/common/EntityChip";
import { KeyStatStrip } from "@/components/common/KeyStatStrip";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { CardSkeleton } from "@/components/common/Skeleton";
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
import type { DriverStatus } from "@/components/ui/status-pill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { daysUntil, formatMoneyCents, formatPhone } from "@/lib/format";
import {
  approveDriver,
  getDriver,
  reinstateDriver,
  suspendDriver,
} from "@/server/functions/drivers";
import { listLoadsAdmin } from "@/server/functions/loads";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/drivers/$driverId")({
  component: DriverDetailPage,
});

function DriverDetailPage() {
  const { driverId } = Route.useParams();
  const queryClient = useQueryClient();
  const [suspendOpen, setSuspendOpen] = React.useState(false);
  const [reinstateOpen, setReinstateOpen] = React.useState(false);

  const driverQuery = useQuery({
    queryKey: ["admin", "driver", driverId],
    queryFn: () => getDriver({ data: { driverId } }),
  });

  const loadsQuery = useQuery({
    queryKey: ["admin", "driver", driverId, "loads"],
    queryFn: () =>
      listLoadsAdmin({ data: { driverId, limit: 100, cursor: null } }),
    enabled: driverQuery.isSuccess,
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      suspendDriver({ data: { driverId: id, reason } }),
    onSuccess: () => {
      toast.success("Driver suspended");
      queryClient.invalidateQueries({ queryKey: ["admin", "driver", driverId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "drivers"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const reinstateMutation = useMutation({
    mutationFn: (id: string) => reinstateDriver({ data: { driverId: id } }),
    onSuccess: () => {
      toast.success("Driver reinstated");
      queryClient.invalidateQueries({ queryKey: ["admin", "driver", driverId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "drivers"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveDriver({ data: { driverId: id } }),
    onSuccess: () => {
      toast.success("Driver approved");
      queryClient.invalidateQueries({ queryKey: ["admin", "driver", driverId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "drivers"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/drivers">Back to drivers</BackLink>

      <QueryBoundary
        query={driverQuery}
        skeleton={<CardSkeleton />}
        errorTitle="Couldn't load driver"
      >
        {(detail) => {
          const driver = detail.driver;
          const userStatus = (detail.driver.userStatus ?? "active") as DriverStatus;
          const fullName =
            [driver.firstName, driver.lastName].filter(Boolean).join(" ") ||
            driver.email;
          const cdlDays = daysUntil(driver.cdlExpiration);
          const medDays = daysUntil(driver.medicalCardExpiration);
          const criticalDays = Math.min(cdlDays, medDays);
          const periodLoads =
            loadsQuery.data?.loads.filter(
              (l) =>
                new Date(l.updatedAt).getTime() >=
                Date.now() - 14 * 86_400_000,
            ) ?? [];
          const paidLoads = periodLoads.filter(
            (l) => l.driverPayCents != null,
          );
          const periodPayCents = paidLoads.reduce(
            (sum, l) => sum + (l.driverPayCents ?? 0),
            0,
          );
          const primary = primaryActionFor(userStatus);

          const onPrimary = () => {
            if (userStatus === "pending_approval")
              approveMutation.mutate(driver.id);
            else if (userStatus === "suspended") setReinstateOpen(true);
            else toast.info(`${primary.label} — coming soon`);
          };

          return (
            <>
              <section className="animate-enter stagger-1 flex flex-col gap-5">
                <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
                  <Avatar
                    first={driver.firstName ?? driver.email}
                    last={driver.lastName ?? ""}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        {fullName}
                      </h1>
                      <StatusPill kind="driver" status={userStatus} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      {driver.phone && (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="size-3" />{" "}
                          {formatPhone(driver.phone)}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 truncate">
                        <Mail className="size-3" /> {driver.email}
                      </span>
                      {driver.city && driver.state && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="size-3" /> {driver.city},{" "}
                          {driver.state}
                        </span>
                      )}
                      {driver.hireDate && (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="size-3" /> Hired{" "}
                          {driver.hireDate}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      variant={primary.variant}
                      size="md"
                      onClick={onPrimary}
                      disabled={
                        approveMutation.isPending ||
                        reinstateMutation.isPending
                      }
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
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Driver actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onSelect={() =>
                            toast.info("Document request — coming soon")
                          }
                        >
                          <FileText /> Request new doc
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {userStatus !== "suspended" ? (
                          <DropdownMenuItem
                            variant="danger"
                            onSelect={() => setSuspendOpen(true)}
                          >
                            <AlertOctagon /> Suspend driver
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onSelect={() => setReinstateOpen(true)}
                          >
                            <UserCog /> Reinstate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>

                <KeyStatStrip
                  stats={[
                    {
                      label: "Loads YTD",
                      value: detail.stats.completedLoadsThisYear.toLocaleString(),
                      sublabel: "delivered this year",
                      mono: true,
                      emphasis: true,
                    },
                    {
                      label: "Pay this period",
                      value:
                        paidLoads.length > 0
                          ? formatMoneyCents(periodPayCents)
                          : "—",
                      sublabel:
                        paidLoads.length > 0
                          ? `${paidLoads.length} load${paidLoads.length === 1 ? "" : "s"} · last 14d`
                          : "no pay recorded yet",
                      mono: true,
                    },
                    {
                      label: "Next expiration",
                      value:
                        criticalDays < 0 ? "Expired" : `${criticalDays}d`,
                      sublabel: cdlDays < medDays ? "CDL" : "Medical card",
                      mono: true,
                    },
                  ]}
                />
              </section>

              <Tabs defaultValue="overview" className="animate-enter stagger-2">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="compliance">Compliance</TabsTrigger>
                  <TabsTrigger value="pay">Pay</TabsTrigger>
                  <TabsTrigger value="loads">Loads</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Panel
                      icon={UserCircle2}
                      title="Contact"
                      className="lg:col-span-2"
                    >
                      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                        <Field label="Email" value={driver.email} />
                        <Field
                          label="Phone"
                          value={driver.phone ? formatPhone(driver.phone) : "—"}
                          mono={!!driver.phone}
                        />
                        <Field
                          label="Home base"
                          value={
                            driver.city && driver.state
                              ? `${driver.city}, ${driver.state}`
                              : "—"
                          }
                        />
                        <Field
                          label="Hire date"
                          value={driver.hireDate ?? "—"}
                          mono={!!driver.hireDate}
                        />
                      </dl>
                    </Panel>

                    <Panel icon={Truck} title="Assignment">
                      {detail.assignedTruck ? (
                        <div className="flex flex-col gap-3">
                          <EntityChip
                            kind="truck"
                            id={detail.assignedTruck.id}
                            label={`Unit ${detail.assignedTruck.unitNumber}`}
                            mono
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Default truck. Auto-suggested when dispatching new
                            loads.
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-3">
                          <p className="text-sm text-muted-foreground">
                            No default truck assigned.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              toast.info("Assign truck — coming soon")
                            }
                          >
                            <Truck className="size-4" /> Assign truck
                          </Button>
                        </div>
                      )}
                    </Panel>

                    <Panel
                      icon={ShieldCheck}
                      title="Compliance at a glance"
                      className="lg:col-span-3"
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <CredentialBlock
                          title="CDL"
                          metaLeft={`Class ${driver.cdlClass} · ${driver.cdlState}`}
                          metaRight={driver.cdlNumber}
                          metaRightMono
                          expiration={driver.cdlExpiration}
                        />
                        <CredentialBlock
                          title="Medical card"
                          metaLeft="DOT-certified exam"
                          expiration={driver.medicalCardExpiration}
                        />
                      </div>
                    </Panel>
                  </div>
                </TabsContent>

                <TabsContent value="compliance" className="mt-4">
                  <Card className="gap-0 p-0">
                    <ul className="divide-y divide-border">
                      <ComplianceRow
                        icon={ShieldCheck}
                        label="CDL"
                        sublabel={`Class ${driver.cdlClass} · ${driver.cdlState} · ${driver.cdlNumber}`}
                        date={driver.cdlExpiration}
                      />
                      <ComplianceRow
                        icon={ShieldCheck}
                        label="Medical card"
                        sublabel="DOT-certified examiner"
                        date={driver.medicalCardExpiration}
                      />
                      <MissingDocRow
                        label="MVR"
                        description="Motor vehicle record"
                      />
                      <MissingDocRow
                        label="Drug test"
                        description="Pre-employment + random"
                      />
                    </ul>
                  </Card>
                </TabsContent>

                <TabsContent value="pay" className="mt-4">
                  {paidLoads.length === 0 ? (
                    <EmptyCard
                      icon={Wallet}
                      title="No pay yet this period"
                      description={`Loads completed by ${driver.firstName ?? "this driver"} over the last 14 days with admin-entered pay will show up here. Per-period settlements roll up to /admin/pay.`}
                    />
                  ) : (
                    <Card className="gap-0 p-0">
                      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                            Pay this period
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Last 14 days · {paidLoads.length} load
                            {paidLoads.length === 1 ? "" : "s"} with pay set
                          </span>
                        </div>
                        <span className="font-mono text-2xl font-bold tabular-nums">
                          {formatMoneyCents(periodPayCents)}
                        </span>
                      </div>
                      <ul className="divide-y divide-border">
                        {paidLoads.map((l) => (
                          <li
                            key={l.id}
                            className="flex items-center justify-between gap-3 px-5 py-3"
                          >
                            <div className="flex min-w-0 flex-col">
                              <span className="font-mono text-sm font-semibold">
                                {l.loadNumber}
                              </span>
                              <span className="truncate text-[11px] text-muted-foreground">
                                {l.pickup
                                  ? `${l.pickup.city}, ${l.pickup.state}`
                                  : "—"}{" "}
                                →{" "}
                                {l.delivery
                                  ? `${l.delivery.city}, ${l.delivery.state}`
                                  : "—"}
                              </span>
                            </div>
                            <span className="font-mono text-sm font-semibold tabular-nums">
                              {formatMoneyCents(l.driverPayCents ?? 0)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="loads" className="mt-4">
                  {loadsQuery.data && loadsQuery.data.loads.length > 0 ? (
                    <Card className="gap-0 p-0">
                      <ul className="divide-y divide-border">
                        {loadsQuery.data.loads.map((l) => (
                          <li
                            key={l.id}
                            className="flex items-center justify-between gap-3 px-5 py-3"
                          >
                            <div className="flex min-w-0 flex-col">
                              <span className="font-mono text-sm font-semibold">
                                {l.loadNumber}
                              </span>
                              <span className="truncate text-[11px] text-muted-foreground">
                                {l.broker.companyName}
                              </span>
                            </div>
                            <StatusPill kind="load" status={l.status} />
                          </li>
                        ))}
                      </ul>
                    </Card>
                  ) : (
                    <EmptyCard
                      icon={Truck}
                      title="No recent loads"
                      description={`Loads delivered by ${driver.firstName ?? "this driver"} appear here — most recent first.`}
                    />
                  )}
                </TabsContent>
              </Tabs>

              <ConfirmDialog
                open={suspendOpen}
                onOpenChange={setSuspendOpen}
                tone="danger"
                title={`Suspend ${fullName}?`}
                description="They'll lose dispatch access immediately and won't appear in driver pickers. You can reinstate them later from this page."
                confirmLabel="Suspend driver"
                input={{
                  label: "Reason",
                  placeholder: "e.g. failed compliance check",
                  required: true,
                }}
                onConfirm={(reason) => {
                  if (!reason) return;
                  suspendMutation.mutate({ id: driver.id, reason });
                  setSuspendOpen(false);
                }}
              />

              <ConfirmDialog
                open={reinstateOpen}
                onOpenChange={setReinstateOpen}
                tone="primary"
                title={`Reinstate ${fullName}?`}
                description="They'll appear in driver pickers again and can be dispatched on new loads."
                confirmLabel="Reinstate driver"
                onConfirm={() => {
                  reinstateMutation.mutate(driver.id);
                  setReinstateOpen(false);
                }}
              />
            </>
          );
        }}
      </QueryBoundary>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Avatar                                                                    */
/* -------------------------------------------------------------------------- */

function Avatar({ first, last }: { first: string; last: string }) {
  const initials = `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex size-16 shrink-0 items-center justify-center rounded-full sm:size-20",
        "bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-[var(--primary)]",
        "ring-2 ring-[var(--primary)]/25",
        "text-xl font-bold tracking-tight sm:text-2xl",
      )}
    >
      {initials}
    </div>
  );
}

function CredentialBlock({
  title,
  metaLeft,
  metaRight,
  metaRightMono,
  expiration,
}: {
  title: string;
  metaLeft?: string;
  metaRight?: string;
  metaRightMono?: boolean;
  expiration: string;
}) {
  const days = daysUntil(expiration);
  const tone =
    days < 0
      ? "border-[var(--danger)]/40 bg-[color-mix(in_oklab,var(--danger)_5%,transparent)]"
      : days <= 14
        ? "border-[var(--warning)]/40 bg-[color-mix(in_oklab,var(--warning)_5%,transparent)]"
        : "border-[var(--border)] bg-[var(--background)]";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-[var(--radius-md)] border p-4",
        tone,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        <ExpirationBadge date={expiration} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {metaLeft && <span>{metaLeft}</span>}
        {metaRight && (
          <span className={metaRightMono ? "font-mono" : undefined}>
            {metaRight}
          </span>
        )}
      </div>
      <div className="text-[11px] text-muted-foreground">
        Expires <span className="font-mono">{expiration}</span>
      </div>
    </div>
  );
}

function ComplianceRow({
  icon: Icon,
  label,
  sublabel,
  date,
}: {
  icon: LucideIcon;
  label: string;
  sublabel: string;
  date: string;
}) {
  const days = daysUntil(date);
  const urgent = days <= 14;
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md",
            urgent
              ? "bg-[color-mix(in_oklab,var(--warning)_15%,transparent)] text-[var(--warning)]"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">{label}</span>
          <span className="truncate text-[11px] text-muted-foreground">
            {sublabel}
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

function MissingDocRow({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-dashed border-[var(--border-strong)] text-[var(--subtle-foreground)]">
          <X className="size-4" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-[11px] text-muted-foreground">
            {description}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="muted" className="text-[10px]">
          Not on file
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.info("Document upload — coming soon")}
        >
          <Upload className="size-3.5" /> Upload
        </Button>
      </div>
    </li>
  );
}

interface PrimaryAction {
  label: string;
  icon: LucideIcon;
  variant: "primary" | "outline";
}

function primaryActionFor(status: DriverStatus): PrimaryAction {
  switch (status) {
    case "pending_approval":
      return { label: "Approve", icon: Check, variant: "primary" };
    case "invited":
      return { label: "Resend invite", icon: Mail, variant: "outline" };
    case "suspended":
      return { label: "Reinstate", icon: UserCog, variant: "primary" };
    case "active":
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
    <Card className={cn("gap-0 p-5", className)}>
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
