import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  Loader2,
  MapPin,
  Package,
  Truck,
  UserRound,
} from "lucide-react";

import { BackLink } from "@/components/common/BackLink";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FormField } from "@/components/common/FormField";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/errors";
import { toast } from "@/lib/toast";
import { US_STATES } from "@/lib/onboarding/us-states";
import { listBrokers } from "@/server/functions/brokers";
import { listDrivers } from "@/server/functions/drivers";
import { listTrucks } from "@/server/functions/trucks";
import { assignLoad, createLoad } from "@/server/functions/loads";

export const Route = createFileRoute("/admin/loads/new")({
  component: NewLoadPage,
});

/* -------------------------------------------------------------------------- */
/*  Form shape                                                                */
/* -------------------------------------------------------------------------- */

interface StopDraft {
  companyName: string;
  line1: string;
  city: string;
  state: string;
  zip: string;
  windowStart: string;
  windowEnd: string;
  contactName: string;
  contactPhone: string;
  notes: string;
}

interface LoadDraft {
  brokerId: string;
  referenceNumber: string;
  bolNumber: string;
  commodity: string;
  weight: string;
  pieces: string;
  rateDollars: string;
  miles: string;
  driverPayDollars: string;
  specialInstructions: string;
  assignedDriverId: string;
  assignedTruckId: string;
  pickup: StopDraft;
  delivery: StopDraft;
}

const EMPTY_STOP: StopDraft = {
  companyName: "",
  line1: "",
  city: "",
  state: "",
  zip: "",
  windowStart: "",
  windowEnd: "",
  contactName: "",
  contactPhone: "",
  notes: "",
};

const INITIAL: LoadDraft = {
  brokerId: "",
  referenceNumber: "",
  bolNumber: "",
  commodity: "",
  weight: "",
  pieces: "",
  rateDollars: "",
  miles: "",
  driverPayDollars: "",
  specialInstructions: "",
  assignedDriverId: "",
  assignedTruckId: "",
  pickup: { ...EMPTY_STOP },
  delivery: { ...EMPTY_STOP },
};

type Errors = Partial<
  Record<
    | "brokerId"
    | "commodity"
    | "rateDollars"
    | "miles"
    | "driverPayDollars"
    | "pickup.line1"
    | "pickup.city"
    | "pickup.state"
    | "pickup.zip"
    | "pickup.windowStart"
    | "pickup.windowEnd"
    | "delivery.line1"
    | "delivery.city"
    | "delivery.state"
    | "delivery.zip"
    | "delivery.windowStart"
    | "delivery.windowEnd",
    string
  >
>;

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

interface ServerStop {
  stopType: "pickup" | "delivery";
  sequence: number;
  companyName: string | null;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  windowStart: string;
  windowEnd: string;
  contactName: string | null;
  contactPhone: string | null;
  notes: string | null;
}

function toServerStop(
  kind: "pickup" | "delivery",
  sequence: number,
  s: StopDraft,
): ServerStop {
  return {
    stopType: kind,
    sequence,
    companyName: s.companyName.trim() || null,
    addressLine1: s.line1.trim(),
    city: s.city.trim(),
    state: s.state,
    zip: s.zip.trim(),
    // Lat/lng are not collected by the form yet; default to 0,0. Geocoding
    // is a Phase 2 concern. The DB column is decimal NOT NULL, so we must
    // send a number — zeros are visually meaningless but typecheck-safe.
    lat: 0,
    lng: 0,
    windowStart: new Date(s.windowStart).toISOString(),
    windowEnd: new Date(s.windowEnd).toISOString(),
    contactName: s.contactName.trim() || null,
    contactPhone: s.contactPhone.trim() || null,
    notes: s.notes.trim() || null,
  };
}

function NewLoadPage() {
  const navigate = useNavigate();
  const [form, setForm] = React.useState<LoadDraft>(INITIAL);
  const [errors, setErrors] = React.useState<Errors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmPayOpen, setConfirmPayOpen] = React.useState(false);
  const payInputRef = React.useRef<HTMLInputElement>(null);

  const brokersQuery = useQuery({
    queryKey: ["admin", "brokers", "picker"],
    queryFn: () => listBrokers({ data: { limit: 200, cursor: null } }),
  });
  const driversQuery = useQuery({
    queryKey: ["admin", "drivers", "picker"],
    queryFn: () =>
      listDrivers({
        data: { status: "active", limit: 200, cursor: null },
      }),
  });
  const trucksQuery = useQuery({
    queryKey: ["admin", "trucks", "picker"],
    queryFn: () =>
      listTrucks({ data: { status: "active", limit: 200, cursor: null } }),
  });

  const brokers = brokersQuery.data?.brokers ?? [];
  const activeDrivers = (driversQuery.data?.drivers ?? []).filter(
    (d): d is typeof d & { id: string } => d.id !== null,
  );
  const activeTrucks = trucksQuery.data?.trucks ?? [];

  const selectedDriver = activeDrivers.find(
    (d) => d.id === form.assignedDriverId,
  );

  React.useEffect(() => {
    if (!selectedDriver) return;
    if (selectedDriver.assignedTruck && !form.assignedTruckId) {
      setForm((f) => ({
        ...f,
        assignedTruckId: selectedDriver.assignedTruck!.id,
      }));
    }
  }, [form.assignedDriverId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----- helpers ----- */

  const set = <K extends keyof LoadDraft>(key: K, value: LoadDraft[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setStop = (which: "pickup" | "delivery", patch: Partial<StopDraft>) =>
    setForm((f) => ({ ...f, [which]: { ...f[which], ...patch } }));

  const validate = (): Errors => {
    const e: Errors = {};

    if (!form.brokerId) e.brokerId = "Pick a broker";
    if (!form.commodity.trim()) e.commodity = "Required";

    const rate = Number(form.rateDollars);
    if (!form.rateDollars || Number.isNaN(rate) || rate <= 0)
      e.rateDollars = "Enter the rate in dollars";

    if (form.driverPayDollars.trim() !== "") {
      const pay = Number(form.driverPayDollars);
      if (Number.isNaN(pay) || pay < 0)
        e.driverPayDollars = "Enter a non-negative dollar amount";
    }

    for (const which of ["pickup", "delivery"] as const) {
      const s = form[which];
      if (!s.line1.trim()) e[`${which}.line1`] = "Required";
      if (!s.city.trim()) e[`${which}.city`] = "Required";
      if (!s.state) e[`${which}.state`] = "Required";
      if (!/^\d{5}(-\d{4})?$/.test(s.zip)) e[`${which}.zip`] = "Invalid ZIP";
      if (!s.windowStart) e[`${which}.windowStart`] = "Required";
      if (!s.windowEnd) e[`${which}.windowEnd`] = "Required";
      if (
        s.windowStart &&
        s.windowEnd &&
        new Date(s.windowEnd) < new Date(s.windowStart)
      )
        e[`${which}.windowEnd`] = "End must be after start";
    }

    // Delivery window cannot start before pickup window.
    if (
      form.pickup.windowStart &&
      form.delivery.windowStart &&
      new Date(form.delivery.windowStart) < new Date(form.pickup.windowStart)
    ) {
      e["delivery.windowStart"] = "Delivery can't be before pickup";
    }

    return e;
  };

  const driverAssignedWithoutPay =
    !!form.assignedDriverId && form.driverPayDollars.trim() === "";

  type CreateLoadInput = {
    loadNumber: string;
    brokerId: string;
    status: "draft";
    rateCents: number;
    miles: number | null;
    commodity: string;
    weight: number | null;
    pieces: number | null;
    specialInstructions: string | null;
    referenceNumber: string | null;
    bolNumber: string | null;
    driverPayCents: number | null;
    stops: ServerStop[];
    assignedTruckId?: string | null;
  };
  const createMutation = useMutation({
    mutationFn: (input: CreateLoadInput) => createLoad({ data: input }),
  });
  const assignMutation = useMutation({
    mutationFn: ({
      loadId,
      driverId,
      truckId,
    }: {
      loadId: string;
      driverId: string;
      truckId: string | null;
    }) => assignLoad({ data: { loadId, driverId, truckId } }),
  });

  const finalizeSubmit = async () => {
    setSubmitting(true);
    try {
      const payCents =
        form.driverPayDollars.trim() === ""
          ? null
          : Math.round(Number(form.driverPayDollars) * 100);
      const rateCents = Math.round(Number(form.rateDollars) * 100);
      const miles = form.miles ? Number(form.miles) : null;
      const weight = form.weight ? Number(form.weight) : null;
      const pieces = form.pieces ? Number(form.pieces) : null;

      const loadNumber = `PTL-${new Date().getFullYear()}-${Math.random()
        .toString(36)
        .slice(2, 7)
        .toUpperCase()}`;

      const stops = [
        toServerStop("pickup", 0, form.pickup),
        toServerStop("delivery", 1, form.delivery),
      ];

      const { load: created } = await createMutation.mutateAsync({
        loadNumber,
        brokerId: form.brokerId,
        status: "draft",
        rateCents,
        miles,
        commodity: form.commodity.trim(),
        weight,
        pieces,
        specialInstructions: form.specialInstructions.trim() || null,
        referenceNumber: form.referenceNumber.trim() || null,
        bolNumber: form.bolNumber.trim() || null,
        driverPayCents: payCents,
        stops,
        // Persist a truck-only assignment up-front. When a driver is also
        // picked, assignLoad below sets both atomically with status=assigned;
        // here we just attach the truck so it survives even without a driver.
        assignedTruckId: form.assignedDriverId
          ? null
          : form.assignedTruckId || null,
      });

      if (form.assignedDriverId) {
        await assignMutation.mutateAsync({
          loadId: created.id,
          driverId: form.assignedDriverId,
          truckId: form.assignedTruckId || null,
        });
      }

      toast.success(`Load ${created.loadNumber} created`);
      navigate({ to: "/admin/loads/$loadId", params: { loadId: created.id } });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) {
      // Scroll the first error into view for long forms.
      const firstKey = Object.keys(v)[0];
      document
        .querySelector(`[data-field="${firstKey}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Soft warning: driver assigned but pay still blank. Give admin a chance
    // to fill it in now rather than having to come back later.
    if (driverAssignedWithoutPay) {
      setConfirmPayOpen(true);
      return;
    }

    finalizeSubmit();
  };

  const canAssign = !!form.assignedDriverId;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-24"
      noValidate
    >
      <BackLink to="/admin/loads">Back to loads</BackLink>
      <PageHeader
        eyebrow="Dispatch"
        title="New load"
        description="Create a load manually. For broker-emailed rate confirmations, use AI intake (Phase 1.5)."
      />

      {/* Broker + reference */}
      <Section
        title="Broker & reference"
        description="Who's paying for this load and what's the broker's reference number?"
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_minmax(180px,240px)]">
          <FormField label="Broker" required error={errors.brokerId}>
            <Select
              value={form.brokerId}
              onValueChange={(v) => set("brokerId", v)}
            >
              <SelectTrigger data-field="brokerId">
                <SelectValue placeholder="Select broker" />
              </SelectTrigger>
              <SelectContent>
                {brokers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <span className="inline-flex items-center gap-2">
                      <Building2 className="size-3.5 text-muted-foreground" />
                      {b.companyName}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Broker reference #"
            hint="Their load number — appears on the rate con."
          >
            <Input
              placeholder="e.g. CFS-88214"
              value={form.referenceNumber}
              onChange={(e) => set("referenceNumber", e.target.value)}
            />
          </FormField>
        </div>
      </Section>

      {/* Pickup + Delivery side by side on desktop */}
      <div className="grid gap-5 lg:grid-cols-2">
        <StopSection
          title="Pickup"
          iconTone="success"
          stop={form.pickup}
          errors={errors}
          namespace="pickup"
          onChange={(patch) => setStop("pickup", patch)}
        />
        <StopSection
          title="Delivery"
          iconTone="primary"
          stop={form.delivery}
          errors={errors}
          namespace="delivery"
          onChange={(patch) => setStop("delivery", patch)}
        />
      </div>

      {/* Load details */}
      <Section
        title="Load details"
        description="Commodity, rate, and what Gary needs to invoice the broker."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField
            label="Commodity"
            required
            error={errors.commodity}
            className="sm:col-span-2"
          >
            <Input
              data-field="commodity"
              placeholder="e.g. Palletized auto parts"
              value={form.commodity}
              onChange={(e) => set("commodity", e.target.value)}
            />
          </FormField>
          <FormField label="BOL #" hint="If known at dispatch">
            <Input
              placeholder="Optional"
              value={form.bolNumber}
              onChange={(e) => set("bolNumber", e.target.value)}
            />
          </FormField>
          <FormField label="Pieces" hint="Pallets, skids, or units">
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Optional"
              value={form.pieces}
              onChange={(e) => set("pieces", e.target.value)}
            />
          </FormField>
          <FormField label="Weight (lbs)">
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Optional"
              value={form.weight}
              onChange={(e) => set("weight", e.target.value)}
            />
          </FormField>
          <FormField
            label="Rate"
            required
            error={errors.rateDollars}
            hint="Dollars — broker pays this"
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                $
              </span>
              <Input
                data-field="rateDollars"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="2,850"
                className="pl-7 font-mono tabular-nums"
                value={form.rateDollars}
                onChange={(e) => set("rateDollars", e.target.value)}
              />
            </div>
          </FormField>
          <FormField
            label="Miles"
            error={errors.miles}
            hint="Optional — used to compute rate per mile"
          >
            <Input
              data-field="miles"
              type="number"
              inputMode="numeric"
              placeholder="612"
              value={form.miles}
              onChange={(e) => set("miles", e.target.value)}
            />
          </FormField>
          <FormField
            label="Driver pay"
            error={errors.driverPayDollars}
            hint="Optional. Required before load can be marked completed."
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                $
              </span>
              <Input
                ref={payInputRef}
                data-field="driverPayDollars"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="650"
                className="pl-7 font-mono tabular-nums"
                value={form.driverPayDollars}
                onChange={(e) => set("driverPayDollars", e.target.value)}
              />
            </div>
          </FormField>
        </div>
      </Section>

      {/* Assignment */}
      <Section
        title="Assignment"
        description="Leave blank to save as draft. Assigning notifies the driver and sets status to assigned."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Driver"
            meta={
              selectedDriver?.cdlClass && selectedDriver.cdlState ? (
                <span className="font-mono text-[11px]">
                  {selectedDriver.cdlClass} · {selectedDriver.cdlState}
                </span>
              ) : undefined
            }
            hint={
              selectedDriver?.city && selectedDriver?.state
                ? `${selectedDriver.city}, ${selectedDriver.state}`
                : "Only active drivers listed"
            }
          >
            <Select
              value={form.assignedDriverId}
              onValueChange={(v) =>
                set("assignedDriverId", v === "__none__" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a driver (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground">
                    No driver — save as draft
                  </span>
                </SelectItem>
                {activeDrivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    <span className="inline-flex items-center gap-2">
                      <UserRound className="size-3.5 text-muted-foreground" />
                      {[d.firstName, d.lastName].filter(Boolean).join(" ") ||
                        d.email}
                      {d.assignedTruck && (
                        <span className="text-[11px] text-muted-foreground">
                          · #{d.assignedTruck.unitNumber}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Truck"
            hint={
              selectedDriver?.assignedTruck &&
              form.assignedTruckId === selectedDriver.assignedTruck.id
                ? `Auto-suggested from driver's default truck`
                : activeTrucks.length === 0
                  ? "No active trucks — add one in /admin/trucks"
                  : "Optional — pick a truck for this load"
            }
          >
            <Select
              value={form.assignedTruckId}
              onValueChange={(v) =>
                set("assignedTruckId", v === "__none__" ? "" : v)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick a truck (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground">No truck</span>
                </SelectItem>
                {activeTrucks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="inline-flex items-center gap-2">
                      <Truck className="size-3.5 text-muted-foreground" />#
                      {t.unitNumber} — {t.year} {t.make} {t.model}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </Section>

      {/* Special instructions */}
      <Section
        title="Special instructions"
        description="Anything the driver needs at pickup or delivery. Shown on the load detail page."
      >
        <Textarea
          rows={4}
          placeholder="e.g. Rear door delivery only. Call receiver 30 min before arrival."
          value={form.specialInstructions}
          onChange={(e) => set("specialInstructions", e.target.value)}
        />
      </Section>

      {/* Sticky action bar.
          - Mobile (< md): sits above BottomTabBar (~64px) + safe-area inset
          - Tablet + desktop (md+): flush to viewport bottom, offset left by
            the sidebar width so it doesn't slide under the sidebar */}
      <div
        className={cn(
          "fixed inset-x-0 z-20 border-t border-border bg-[var(--background)]/90 backdrop-blur",
          "bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0",
          "md:left-[var(--sidebar-width,16rem)]",
        )}
      >
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Package className="size-3.5" />
            <span>
              {canAssign ? (
                <>
                  Status will be{" "}
                  <strong className="text-foreground">assigned</strong>
                </>
              ) : (
                <>
                  Status will be{" "}
                  <strong className="text-foreground">draft</strong>
                </>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => navigate({ to: "/admin/loads" })}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  {canAssign ? "Create & assign" : "Save as draft"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmPayOpen}
        onOpenChange={setConfirmPayOpen}
        tone="warning"
        title="Driver pay isn't set yet"
        description="You're assigning this load to a driver but haven't entered their pay. You can continue and set it later — but the load can't be marked completed until pay is recorded."
        body="Tip: enter pay now while the rate con details are fresh."
        confirmLabel="Continue anyway"
        confirmVariant="primary"
        cancelLabel="Set pay first"
        isSubmitting={submitting}
        onCancel={() => {
          // Return focus to pay input so the admin can fill it in.
          window.setTimeout(() => {
            payInputRef.current?.focus();
            payInputRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }, 50);
        }}
        onConfirm={() => {
          setConfirmPayOpen(false);
          finalizeSubmit();
        }}
      />
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stop section (pickup / delivery share this)                               */
/* -------------------------------------------------------------------------- */

function StopSection({
  title,
  iconTone,
  stop,
  errors,
  namespace,
  onChange,
}: {
  title: string;
  iconTone: "success" | "primary";
  stop: StopDraft;
  errors: Errors;
  namespace: "pickup" | "delivery";
  onChange: (patch: Partial<StopDraft>) => void;
}) {
  return (
    <Section
      title={title}
      actions={
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            iconTone === "success" &&
              "bg-[var(--success)]/12 text-[var(--success)]",
            iconTone === "primary" &&
              "bg-[var(--primary)]/12 text-[var(--primary)]",
          )}
        >
          <MapPin className="size-3" />
          {namespace === "pickup" ? "Origin" : "Destination"}
        </span>
      }
    >
      <div className="grid gap-4">
        <FormField label="Shipper / consignee" hint="Company name at the stop">
          <Input
            placeholder="e.g. Acme Manufacturing"
            value={stop.companyName}
            onChange={(e) => onChange({ companyName: e.target.value })}
          />
        </FormField>

        <FormField
          label="Street address"
          required
          error={errors[`${namespace}.line1`]}
        >
          <Input
            data-field={`${namespace}.line1`}
            placeholder="1420 Industrial Blvd"
            value={stop.line1}
            onChange={(e) => onChange({ line1: e.target.value })}
          />
        </FormField>

        <div className="grid grid-cols-[1fr_7rem_7rem] gap-3">
          <FormField label="City" required error={errors[`${namespace}.city`]}>
            <Input
              data-field={`${namespace}.city`}
              placeholder="Kansas City"
              value={stop.city}
              onChange={(e) => onChange({ city: e.target.value })}
            />
          </FormField>
          <FormField
            label="State"
            required
            error={errors[`${namespace}.state`]}
          >
            <Select
              value={stop.state}
              onValueChange={(v) => onChange({ state: v })}
            >
              <SelectTrigger data-field={`${namespace}.state`}>
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="ZIP" required error={errors[`${namespace}.zip`]}>
            <Input
              data-field={`${namespace}.zip`}
              inputMode="numeric"
              maxLength={10}
              placeholder="64120"
              value={stop.zip}
              onChange={(e) => onChange({ zip: e.target.value })}
            />
          </FormField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            label="Window start"
            required
            error={errors[`${namespace}.windowStart`]}
          >
            <Input
              data-field={`${namespace}.windowStart`}
              type="datetime-local"
              value={stop.windowStart}
              onChange={(e) => onChange({ windowStart: e.target.value })}
            />
          </FormField>
          <FormField
            label="Window end"
            required
            error={errors[`${namespace}.windowEnd`]}
          >
            <Input
              data-field={`${namespace}.windowEnd`}
              type="datetime-local"
              value={stop.windowEnd}
              onChange={(e) => onChange({ windowEnd: e.target.value })}
            />
          </FormField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Contact name">
            <Input
              placeholder="Site contact"
              value={stop.contactName}
              onChange={(e) => onChange({ contactName: e.target.value })}
            />
          </FormField>
          <FormField label="Contact phone">
            <Input
              type="tel"
              inputMode="tel"
              placeholder="(555) 555-0123"
              value={stop.contactPhone}
              onChange={(e) => onChange({ contactPhone: e.target.value })}
            />
          </FormField>
        </div>

        <FormField label="Stop notes" hint="Gate codes, dock info, etc.">
          <Textarea
            rows={2}
            placeholder="Optional"
            value={stop.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        </FormField>
      </div>
    </Section>
  );
}
