import { createFileRoute, notFound } from "@tanstack/react-router";
import * as React from "react";
import {
  Building2,
  Calendar,
  Check,
  Clock,
  DollarSign,
  FileCheck,
  FileText,
  MapPin,
  MoreHorizontal,
  Package,
  Pencil,
  Printer,
  Truck,
  Upload,
  User,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { toast } from "@/lib/toast";
import { BackLink } from "@/components/common/BackLink";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EntityChip } from "@/components/common/EntityChip";
import { KeyStatStrip } from "@/components/common/KeyStatStrip";
import { PageHeader } from "@/components/common/PageHeader";
import {
  LOAD_PROGRESS_STEPS,
  StatusProgressBar,
  loadStatusToProgress,
} from "@/components/common/StatusProgressBar";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { StatusPill } from "@/components/ui/status-pill";
import type { LoadStatus } from "@/components/ui/status-pill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FixtureLoad } from "@/lib/fixtures/loads";
import { FIXTURE_LOADS } from "@/lib/fixtures/loads";
import {
  formatDateShort,
  formatMoneyCents,
  formatRelativeFromNow,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/loads/$loadId")({
  loader: ({ params }) => {
    const load = FIXTURE_LOADS.find((l) => l.id === params.loadId);
    if (!load) throw notFound();
    return { load };
  },
  component: LoadDetailPage,
});

function LoadDetailPage() {
  const { load } = Route.useLoaderData();
  // Pay is editable until the load is marked completed. We hold it in local
  // state so the inline editor can optimistically reflect updates without a
  // server round-trip (stubbed until backend lands).
  const [status, setStatus] = React.useState<LoadStatus>(load.status);
  const [driverPayCents, setDriverPayCents] = React.useState<number | null>(
    load.driverPayCents,
  );
  const [driverPayUpdatedAt, setDriverPayUpdatedAt] = React.useState<
    string | null
  >(load.driverPayUpdatedAt);
  const [confirmAssignOpen, setConfirmAssignOpen] = React.useState(false);
  const [cancelLoadOpen, setCancelLoadOpen] = React.useState(false);
  const payInputRef = React.useRef<HTMLInputElement>(null);
  const payBlockRef = React.useRef<HTMLDivElement>(null);

  const progress = loadStatusToProgress(status);
  const primary = primaryActionFor(status);
  const ratePerMileCents =
    load.miles && load.miles > 0
      ? Math.round(load.rateCents / load.miles)
      : null;

  const isCompleted = status === "completed";

  const focusPayInput = () => {
    payBlockRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    window.setTimeout(() => payInputRef.current?.focus(), 200);
  };

  const finalizeAssign = () => {
    // Stubbed — real assignment flow lands with the driver picker dialog.
    toast.success(`Assigned — load ${load.loadNumber}`);
  };

  const handlePrimary = () => {
    // Mark-complete is blocked if pay isn't recorded. Surface the pay editor
    // with a toast + scroll so the admin knows what to fix.
    if (primary.label === "Mark completed") {
      if (driverPayCents === null) {
        toast.error("Enter driver pay before closing this load");
        focusPayInput();
        return;
      }
      setStatus("completed");
      toast.success(`Load ${load.loadNumber} marked completed`);
      return;
    }
    // Assigning a driver while pay is blank: soft-warn, same as LoadNew flow.
    if (primary.label === "Assign driver" && driverPayCents === null) {
      setConfirmAssignOpen(true);
      return;
    }
    toast.success(`${primary.label} — load ${load.loadNumber}`);
  };

  const handlePaySave = (nextCents: number | null) => {
    setDriverPayCents(nextCents);
    setDriverPayUpdatedAt(new Date().toISOString());
  };

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/loads">Back to loads</BackLink>

      {/* Hero — identity + route */}
      <section className="animate-enter stagger-1 flex flex-col gap-5">
        <PageHeader
          eyebrow="Load"
          title={
            <span className="inline-flex flex-wrap items-center gap-3">
              <span className="font-mono">{load.loadNumber}</span>
              <StatusPill kind="load" status={status} />
            </span>
          }
          description={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {load.referenceNumber && (
                <span>
                  Ref{" "}
                  <span className="font-mono font-medium text-foreground">
                    {load.referenceNumber}
                  </span>
                </span>
              )}
              <EntityChip
                kind="broker"
                id={load.broker.id}
                label={load.broker.companyName}
                size="sm"
              />
            </span>
          }
          actions={
            <>
              <Button
                variant={primary.variant}
                size="md"
                onClick={handlePrimary}
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
                  <DropdownMenuLabel>Load actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onSelect={() => toast.info("Edit load — coming soon")}
                  >
                    <Pencil /> Edit details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => toast.info("POD upload — coming soon")}
                  >
                    <Upload /> Upload POD
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => window.print()}>
                    <Printer /> Print rate con
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="danger"
                    onSelect={() => setCancelLoadOpen(true)}
                  >
                    <XCircle /> Cancel load
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />

        <RouteBand load={load} />

        <KeyStatStrip
          stats={[
            {
              label: "Rate",
              value: formatMoneyCents(load.rateCents),
              mono: true,
            },
            {
              label: "Miles",
              value: load.miles ? load.miles.toLocaleString() : "—",
              mono: true,
              sublabel: load.miles ? "loaded" : "not set",
            },
            {
              label: "Rate / mi",
              value: ratePerMileCents
                ? formatMoneyCents(ratePerMileCents, true)
                : "—",
              mono: true,
              emphasis: ratePerMileCents !== null,
              sublabel: ratePerMileCents ? undefined : "miles required",
            },
          ]}
        />

        <DriverPayBlock
          ref={payBlockRef}
          inputRef={payInputRef}
          payCents={driverPayCents}
          payUpdatedAt={driverPayUpdatedAt}
          createdAt={load.createdAt}
          readOnly={isCompleted}
          onSave={handlePaySave}
        />

        <Card className="p-4 sm:p-5">
          <StatusProgressBar
            steps={LOAD_PROGRESS_STEPS}
            currentStepIndex={progress.index}
            cancelled={progress.cancelled}
            ariaLabel="Load lifecycle"
          />
        </Card>
      </section>

      <Tabs defaultValue="overview" className="animate-enter stagger-2">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">Status history</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <StopCard
                kind="pickup"
                city={load.pickup.city}
                state={load.pickup.state}
                windowStart={load.pickup.windowStart}
                windowEnd={load.pickup.windowEnd}
              />
              <StopCard
                kind="delivery"
                city={load.delivery.city}
                state={load.delivery.state}
                windowStart={load.delivery.windowStart}
                windowEnd={load.delivery.windowEnd}
              />
              <Panel icon={Package} title="Cargo">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                  <Field label="Commodity" value={load.commodity} />
                  <Field
                    label="Weight"
                    value={
                      load.weight ? `${load.weight.toLocaleString()} lbs` : "—"
                    }
                    mono={!!load.weight}
                  />
                  <Field
                    label="Pieces"
                    value={load.pieces ? String(load.pieces) : "—"}
                    mono={!!load.pieces}
                  />
                </dl>
              </Panel>
            </div>

            <div className="flex flex-col gap-4">
              <Panel icon={Building2} title="Broker & rate">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <Label>Broker</Label>
                    <div>
                      <EntityChip
                        kind="broker"
                        id={load.broker.id}
                        label={load.broker.companyName}
                      />
                    </div>
                  </div>
                  <Field
                    label="Line-haul"
                    value={formatMoneyCents(load.rateCents)}
                    mono
                  />
                  {ratePerMileCents && (
                    <Field
                      label="Rate / mi"
                      value={formatMoneyCents(ratePerMileCents, true)}
                      mono
                    />
                  )}
                </div>
              </Panel>

              <Panel icon={Truck} title="Assignment">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <Label>Driver</Label>
                    {load.driver ? (
                      <div>
                        <EntityChip
                          kind="driver"
                          id={load.driver.id}
                          label={`${load.driver.firstName} ${load.driver.lastName}`}
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Unassigned
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Truck</Label>
                    {load.truck ? (
                      <div>
                        <EntityChip
                          kind="truck"
                          id={load.truck.id}
                          label={`Unit ${load.truck.unitNumber}`}
                          mono
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <LoadDocumentsPanel load={load} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryTimeline load={load} />
        </TabsContent>

        <TabsContent value="tracking" className="mt-4">
          <Card className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="flex size-10 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--primary)_12%,transparent)]">
              <MapPin className="size-5 text-[var(--primary)]" />
            </div>
            <p className="text-sm font-medium">Breadcrumb map</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              {status === "draft" || status === "assigned"
                ? "Tracking starts once the driver goes en route to pickup."
                : "Full breadcrumb trail for this load appears once GPS data is recorded. Wires to Mapbox."}
            </p>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmAssignOpen}
        onOpenChange={setConfirmAssignOpen}
        tone="warning"
        title="Driver pay isn't set yet"
        description="You can continue assigning — but the load won't be markable completed until driver pay is recorded."
        body="Enter pay now while the rate con details are fresh."
        confirmLabel="Continue anyway"
        confirmVariant="primary"
        cancelLabel="Set pay first"
        onCancel={focusPayInput}
        onConfirm={() => {
          setConfirmAssignOpen(false);
          finalizeAssign();
        }}
      />

      <ConfirmDialog
        open={cancelLoadOpen}
        onOpenChange={setCancelLoadOpen}
        tone="danger"
        title={`Cancel load ${load.loadNumber}?`}
        description="The broker sees this reason. The load is removed from the driver's board and status is set to cancelled."
        confirmLabel="Cancel load"
        input={{
          label: "Reason for cancellation",
          placeholder: "e.g. Broker double-booked, equipment mismatch…",
          multiline: true,
          rows: 3,
          required: true,
        }}
        onConfirm={(reason) => {
          toast.success(`Load ${load.loadNumber} cancelled`);
          setCancelLoadOpen(false);
          // reason is captured for the server function call when backend is wired
          void reason;
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Driver pay block — prominent display + inline edit                        */
/* -------------------------------------------------------------------------- */

interface DriverPayBlockProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  payCents: number | null;
  payUpdatedAt: string | null;
  createdAt: string;
  readOnly: boolean;
  onSave: (nextCents: number | null) => void;
}

const DriverPayBlock = React.forwardRef<HTMLDivElement, DriverPayBlockProps>(
  function DriverPayBlock(
    { inputRef, payCents, payUpdatedAt, createdAt, readOnly, onSave },
    ref,
  ) {
    const [editing, setEditing] = React.useState(false);
    const [draft, setDraft] = React.useState(() =>
      payCents === null ? "" : (payCents / 100).toFixed(2),
    );

    // Keep draft in sync when external pay changes (e.g. after save).
    React.useEffect(() => {
      setDraft(payCents === null ? "" : (payCents / 100).toFixed(2));
    }, [payCents]);

    const startEdit = () => {
      if (readOnly) return;
      setEditing(true);
      window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 20);
    };

    const commit = () => {
      const trimmed = draft.trim();
      const next =
        trimmed === ""
          ? null
          : Math.round(Number.parseFloat(trimmed) * 100);
      if (next !== null && (Number.isNaN(next) || next < 0)) {
        toast.error("Enter a non-negative dollar amount");
        return;
      }
      onSave(next);
      setEditing(false);
      toast.success("Driver pay updated");
    };

    const cancel = () => {
      setDraft(payCents === null ? "" : (payCents / 100).toFixed(2));
      setEditing(false);
    };

    const showUpdatedMeta =
      payUpdatedAt !== null && payUpdatedAt !== createdAt;

    return (
      <Card
        ref={ref}
        className={cn(
          "flex flex-col gap-3 p-5 sm:p-6",
          payCents === null &&
            !readOnly &&
            "border-[var(--warning)]/40 bg-[color-mix(in_oklab,var(--warning)_4%,var(--background))]",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)] ring-1 ring-[var(--primary)]/15">
              <DollarSign className="size-[18px]" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Driver pay
              </span>
              {editing && !readOnly ? (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                      $
                    </span>
                    <Input
                      ref={inputRef}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="w-36 pl-7 font-mono tabular-nums"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commit();
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          cancel();
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={commit}
                  >
                    <Check className="size-3.5" />
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cancel}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : payCents === null ? (
                <span className="font-mono text-2xl font-bold text-muted-foreground">
                  Not set
                </span>
              ) : (
                <span className="font-mono text-2xl font-bold tabular-nums">
                  {formatMoneyCents(payCents, true)}
                </span>
              )}
              {showUpdatedMeta && !editing && (
                <span className="text-[11px] text-muted-foreground">
                  Updated {formatRelativeFromNow(payUpdatedAt)}
                </span>
              )}
            </div>
          </div>
          {!editing && !readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startEdit}
            >
              <Pencil className="size-3.5" />
              {payCents === null ? "Add pay" : "Edit"}
            </Button>
          )}
          {readOnly && (
            <Badge variant="muted" className="text-[10px]">
              Locked — load completed
            </Badge>
          )}
        </div>
        {payCents === null && !readOnly && !editing && (
          <p className="text-xs text-muted-foreground">
            Required before this load can be marked completed.
          </p>
        )}
      </Card>
    );
  },
);

/* -------------------------------------------------------------------------- */
/*  Route band — cities + arrow + miles                                       */
/* -------------------------------------------------------------------------- */

function RouteBand({ load }: { load: FixtureLoad }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
        <RouteEndpoint
          icon={MapPin}
          label="Pickup"
          city={load.pickup.city}
          state={load.pickup.state}
          date={load.pickup.windowStart}
          tone="neutral"
        />
        <div className="flex flex-col items-center justify-center gap-1 border-x border-border bg-[var(--surface)] px-3 py-4 sm:px-5">
          <ArrowBand miles={load.miles} />
        </div>
        <RouteEndpoint
          icon={MapPin}
          label="Delivery"
          city={load.delivery.city}
          state={load.delivery.state}
          date={load.delivery.windowEnd}
          tone="primary"
        />
      </div>
    </Card>
  );
}

function RouteEndpoint({
  icon: Icon,
  label,
  city,
  state,
  date,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  city: string;
  state: string;
  date: string;
  tone: "neutral" | "primary";
}) {
  return (
    <div className="flex flex-col gap-1 p-4 sm:p-5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon
          className={
            tone === "primary" ? "size-3 text-[var(--primary)]" : "size-3"
          }
        />
        {label}
      </div>
      <div className="text-base font-semibold tracking-tight sm:text-lg">
        {city}
        <span className="ml-1 text-muted-foreground">{state}</span>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Calendar className="size-3" />
        {formatDateShort(date)}
      </div>
    </div>
  );
}

function ArrowBand({ miles }: { miles: number | null }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex w-10 items-center sm:w-14">
        <span className="h-px flex-1 bg-[var(--border-strong)]" />
        <span className="absolute right-0 top-1/2 size-1.5 -translate-y-1/2 rotate-45 border-r-2 border-t-2 border-[var(--primary)]" />
      </div>
      {miles ? (
        <span className="font-mono text-[11px] font-semibold tabular-nums text-[var(--foreground)]">
          {miles.toLocaleString()} mi
        </span>
      ) : (
        <span className="text-[10px] italic text-muted-foreground">
          miles not set
        </span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stop card                                                                 */
/* -------------------------------------------------------------------------- */

function StopCard({
  kind,
  city,
  state,
  windowStart,
  windowEnd,
}: {
  kind: "pickup" | "delivery";
  city: string;
  state: string;
  windowStart: string;
  windowEnd: string;
}) {
  const isPickup = kind === "pickup";
  return (
    <Panel
      icon={MapPin}
      title={isPickup ? "Pickup" : "Delivery"}
      trailing={
        <Badge variant={isPickup ? "muted" : "primary"}>
          {isPickup ? "Origin" : "Destination"}
        </Badge>
      }
    >
      <div className="flex flex-col gap-2">
        <span className="text-base font-semibold">
          {city}, <span className="text-muted-foreground">{state}</span>
        </span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="size-3" />
          {formatDateShort(windowStart)} → {formatDateShort(windowEnd)}
        </div>
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*  Documents — real rows with expected/uploaded states                       */
/* -------------------------------------------------------------------------- */

interface LoadDocSpec {
  type: string;
  label: string;
  required: boolean;
  /** When the load reaches this status, the doc should be expected. */
  expectedAtOrAfter: LoadStatus;
}

const LOAD_DOC_SPECS: LoadDocSpec[] = [
  {
    type: "rate_confirmation",
    label: "Rate confirmation",
    required: true,
    expectedAtOrAfter: "assigned",
  },
  {
    type: "bol",
    label: "Bill of lading",
    required: true,
    expectedAtOrAfter: "at_pickup",
  },
  {
    type: "pod",
    label: "Proof of delivery",
    required: true,
    expectedAtOrAfter: "delivered",
  },
  {
    type: "lumper",
    label: "Lumper receipt",
    required: false,
    expectedAtOrAfter: "delivered",
  },
  {
    type: "scale_ticket",
    label: "Scale ticket",
    required: false,
    expectedAtOrAfter: "at_pickup",
  },
];

const STATUS_ORDER: LoadStatus[] = [
  "draft",
  "assigned",
  "accepted",
  "en_route_pickup",
  "at_pickup",
  "loaded",
  "en_route_delivery",
  "at_delivery",
  "delivered",
  "pod_uploaded",
  "completed",
];

function isExpectedNow(load: FixtureLoad, spec: LoadDocSpec): boolean {
  const loadIdx = STATUS_ORDER.indexOf(load.status);
  const expIdx = STATUS_ORDER.indexOf(spec.expectedAtOrAfter);
  return loadIdx >= expIdx;
}

function LoadDocumentsPanel({ load }: { load: FixtureLoad }) {
  return (
    <Card className="gap-0 p-0">
      <ul className="divide-y divide-border">
        {LOAD_DOC_SPECS.map((spec) => {
          const expected = isExpectedNow(load, spec);
          return (
            <li
              key={spec.type}
              className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={
                    "flex size-9 shrink-0 items-center justify-center rounded-md " +
                    (expected
                      ? "bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] text-[var(--primary)]"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  <FileText className="size-4" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{spec.label}</span>
                    {spec.required && (
                      <Badge variant="muted" className="text-[10px]">
                        Required
                      </Badge>
                    )}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {expected ? "Expected" : "Not yet expected"}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="muted" className="text-[10px]">
                  Not uploaded
                </Badge>
                {expected && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info("Document upload — coming soon")}
                  >
                    <Upload className="size-3.5" /> Upload
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  History timeline — derived from current status                            */
/* -------------------------------------------------------------------------- */

function HistoryTimeline({ load }: { load: FixtureLoad }) {
  const loadIdx = STATUS_ORDER.indexOf(load.status);
  // Build fictional prior transitions based on current status. Real data comes
  // from load_status_history once server-wired.
  const entries = STATUS_ORDER.slice(0, loadIdx + 1)
    .map((s, i) => ({
      status: s,
      at: relativeStub(i, loadIdx),
      who:
        s === "accepted" || s.startsWith("en_route") ? "Driver" : "Gary Tavel",
    }))
    .reverse();

  if (entries.length === 0) {
    return (
      <EmptyCard
        icon={Clock}
        title="No transitions yet"
        description="Status changes appear here the moment they're recorded."
      />
    );
  }

  return (
    <Card className="gap-0 p-0">
      <ul className="relative flex flex-col gap-0">
        {entries.map((e, i) => (
          <li
            key={i}
            className="relative flex items-start gap-4 px-4 py-4 sm:px-5"
          >
            <div className="relative flex flex-col items-center">
              <span
                className={
                  "relative z-10 size-2 rounded-full " +
                  (i === 0
                    ? "bg-[var(--primary)] ring-4 ring-[var(--primary)]/20"
                    : "bg-[var(--border-strong)]")
                }
              />
              {i < entries.length - 1 && (
                <span className="absolute left-1/2 top-2 h-[calc(100%+1rem)] w-px -translate-x-1/2 bg-[var(--border)]" />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <StatusPill kind="load" status={e.status} />
              </div>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="size-3" /> {e.who}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" /> {e.at}
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function relativeStub(i: number, total: number): string {
  if (i === total) return "Just now";
  const deltas = [
    "Just now",
    "15m ago",
    "1h ago",
    "3h ago",
    "5h ago",
    "Yesterday",
    "2 days ago",
    "3 days ago",
    "4 days ago",
    "5 days ago",
    "6 days ago",
  ];
  const dist = total - i;
  return deltas[Math.min(dist, deltas.length - 1)] ?? "Earlier";
}

/* -------------------------------------------------------------------------- */
/*  Primitives                                                                */
/* -------------------------------------------------------------------------- */

function Panel({
  icon: Icon,
  title,
  trailing,
  children,
}: {
  icon: LucideIcon;
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0 p-5">
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
      <Label>{label}</Label>
      <dd className={mono ? "font-mono text-sm tabular-nums" : "text-sm"}>
        {value}
      </dd>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </dt>
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

/* -------------------------------------------------------------------------- */
/*  Contextual primary action                                                 */
/* -------------------------------------------------------------------------- */

interface PrimaryAction {
  label: string;
  icon: LucideIcon;
  variant: "primary" | "outline";
}

function primaryActionFor(status: LoadStatus): PrimaryAction {
  switch (status) {
    case "draft":
      return { label: "Assign driver", icon: UserPlus, variant: "primary" };
    case "assigned":
    case "accepted":
      return { label: "Edit", icon: Pencil, variant: "outline" };
    case "en_route_pickup":
    case "at_pickup":
    case "loaded":
    case "en_route_delivery":
    case "at_delivery":
      return { label: "Add note", icon: Pencil, variant: "outline" };
    case "delivered":
      return { label: "Upload POD", icon: Upload, variant: "primary" };
    case "pod_uploaded":
      return { label: "Mark completed", icon: Check, variant: "primary" };
    case "completed":
      return { label: "Duplicate load", icon: FileCheck, variant: "outline" };
    case "cancelled":
      return { label: "Reinstate", icon: Pencil, variant: "outline" };
    default:
      return { label: "Edit", icon: Pencil, variant: "outline" };
  }
}
