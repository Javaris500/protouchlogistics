import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
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
import { errorMessage } from "@/lib/errors";
import { BackLink } from "@/components/common/BackLink";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EntityChip } from "@/components/common/EntityChip";
import { KeyStatStrip } from "@/components/common/KeyStatStrip";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { CardSkeleton } from "@/components/common/Skeleton";
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
import {
  formatDateShort,
  formatMoneyCents,
  formatRelativeFromNow,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  assignLoad,
  cancelLoad as cancelLoadFn,
  getLoadAdmin,
  updateLoad,
  updateLoadDriverPay,
  updateLoadStatus,
} from "@/server/functions/loads";
import { listDrivers } from "@/server/functions/drivers";
import { createDocument } from "@/server/functions/documents";
import { UploadDocumentDialog } from "@/components/forms/UploadDocumentDialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type LoadDetail = Awaited<ReturnType<typeof getLoadAdmin>>;
type LoadStop = LoadDetail["stops"][number];
type LoadDocument = LoadDetail["documents"][number];
type LoadHistoryEntry = LoadDetail["history"][number];

export const Route = createFileRoute("/admin/loads/$loadId")({
  component: LoadDetailPage,
});

function LoadDetailPage() {
  const { loadId } = Route.useParams();
  const queryClient = useQueryClient();

  const loadQuery = useQuery({
    queryKey: ["admin", "load", loadId],
    queryFn: () => getLoadAdmin({ data: { loadId } }),
  });

  const updatePayMutation = useMutation({
    mutationFn: (driverPayCents: number | null) =>
      updateLoadDriverPay({ data: { loadId, driverPayCents } }),
    onSuccess: () => {
      toast.success("Driver pay updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "load", loadId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "loads"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (toStatus: LoadStatus) =>
      updateLoadStatus({ data: { loadId, toStatus } }),
    onSuccess: ({ toStatus }) => {
      toast.success(`Load marked ${toStatus.replace(/_/g, " ")}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "load", loadId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "loads"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) =>
      cancelLoadFn({ data: { loadId, reason } }),
    onSuccess: () => {
      toast.success("Load cancelled");
      queryClient.invalidateQueries({ queryKey: ["admin", "load", loadId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "loads"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploadDefaultType, setUploadDefaultType] = React.useState<string>("");
  const [editOpen, setEditOpen] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickedDriverId, setPickedDriverId] = React.useState<string>("");

  const driversQuery = useQuery({
    queryKey: ["admin", "drivers", "for-assignment"],
    queryFn: () => listDrivers({ data: { status: "active" } }),
    enabled: pickerOpen,
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => createDocument({ data: formData }),
    onSuccess: () => {
      toast.success("Document uploaded");
      queryClient.invalidateQueries({ queryKey: ["admin", "load", loadId] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const updateLoadMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      updateLoad({ data: { loadId, patch: patch as never } }),
    onSuccess: () => {
      toast.success("Load updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "load", loadId] });
      setEditOpen(false);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const assignDriverMutation = useMutation({
    mutationFn: (driverProfileId: string) =>
      assignLoad({ data: { loadId, driverProfileId } }),
    onSuccess: () => {
      toast.success("Driver assigned");
      queryClient.invalidateQueries({ queryKey: ["admin", "load", loadId] });
      setPickerOpen(false);
      setPickedDriverId("");
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const openUpload = (defaultType: string) => {
    setUploadDefaultType(defaultType);
    setUploadOpen(true);
  };

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/loads">Back to loads</BackLink>

      <QueryBoundary
        query={loadQuery}
        skeleton={<CardSkeleton />}
        errorTitle="Couldn't load this load"
      >
        {(detail) => (
          <LoadDetailBody
            detail={detail}
            onPaySave={(cents) => updatePayMutation.mutate(cents)}
            onMarkComplete={() => updateStatusMutation.mutate("completed")}
            onCancel={(reason) => cancelMutation.mutate(reason)}
            onOpenUpload={openUpload}
            onOpenEdit={() => setEditOpen(true)}
            onOpenAssignDriver={() => setPickerOpen(true)}
            payIsPending={updatePayMutation.isPending}
            statusIsPending={updateStatusMutation.isPending}
          />
        )}
      </QueryBoundary>

      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        ownerKind="load"
        ownerId={loadId}
        defaultType={uploadDefaultType}
        onSubmit={async (fd) => {
          await uploadMutation.mutateAsync(fd);
        }}
      />

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign driver to load</DialogTitle>
            <DialogDescription>
              Pick an active driver. They'll see this load on their portal.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-2">
            <Select
              value={pickedDriverId}
              onValueChange={setPickedDriverId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a driver…" />
              </SelectTrigger>
              <SelectContent>
                {(driversQuery.data?.drivers ?? [])
                  .filter((d): d is typeof d & { id: string } =>
                    Boolean(d.id),
                  )
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.firstName ?? "—"} {d.lastName ?? ""} — {d.email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              variant="primary"
              disabled={!pickedDriverId || assignDriverMutation.isPending}
              onClick={() => assignDriverMutation.mutate(pickedDriverId)}
            >
              {assignDriverMutation.isPending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loadQuery.data && (
        <EditLoadDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          load={loadQuery.data.load}
          onSubmit={async (patch) => {
            await updateLoadMutation.mutateAsync(patch);
          }}
          onPaySubmit={async (cents) => {
            await updatePayMutation.mutateAsync(cents);
          }}
          isSubmitting={
            updateLoadMutation.isPending || updatePayMutation.isPending
          }
        />
      )}
    </div>
  );
}

interface EditLoadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  load: {
    rateCents: number;
    driverPayCents: number | null;
    miles: number | null;
    specialInstructions: string | null;
    status: string;
  };
  onSubmit: (patch: Record<string, unknown>) => Promise<void>;
  onPaySubmit: (cents: number) => Promise<void>;
  isSubmitting: boolean;
}

function EditLoadDialog({
  open,
  onOpenChange,
  load,
  onSubmit,
  onPaySubmit,
  isSubmitting,
}: EditLoadDialogProps) {
  const [rate, setRate] = React.useState("");
  const [pay, setPay] = React.useState("");
  const [miles, setMiles] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setRate(load.rateCents != null ? String(load.rateCents / 100) : "");
      setPay(
        load.driverPayCents != null ? String(load.driverPayCents / 100) : "",
      );
      setMiles(load.miles != null ? String(load.miles) : "");
      setNotes(load.specialInstructions ?? "");
    }
  }, [open, load]);

  const completed = load.status === "completed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit load details</DialogTitle>
          <DialogDescription>
            Update rate, driver pay, miles, or special instructions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-2">
          <div>
            <label className="text-[12.5px] font-medium">Rate (USD)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[12.5px] font-medium">
              Driver pay (USD)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={pay}
              onChange={(e) => setPay(e.target.value)}
              disabled={completed}
            />
            {completed && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Pay is locked after the load completes.
              </p>
            )}
          </div>
          <div>
            <label className="text-[12.5px] font-medium">Miles</label>
            <Input
              type="number"
              min="0"
              value={miles}
              onChange={(e) => setMiles(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[12.5px] font-medium">
              Special instructions
            </label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            variant="primary"
            disabled={isSubmitting}
            onClick={async () => {
              const patch: Record<string, unknown> = {};
              const r = parseFloat(rate);
              if (!Number.isNaN(r)) patch.rateCents = Math.round(r * 100);
              if (miles === "") patch.miles = null;
              else {
                const m = parseInt(miles, 10);
                if (!Number.isNaN(m)) patch.miles = m;
              }
              patch.specialInstructions = notes.trim() || null;

              if (Object.keys(patch).length > 0) {
                await onSubmit(patch);
              }
              if (!completed) {
                const p = parseFloat(pay);
                if (!Number.isNaN(p)) {
                  await onPaySubmit(Math.round(p * 100));
                }
              }
            }}
          >
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface LoadDetailBodyProps {
  detail: LoadDetail;
  onPaySave: (cents: number | null) => void;
  onMarkComplete: () => void;
  onCancel: (reason: string) => void;
  onOpenUpload: (defaultType: string) => void;
  onOpenEdit: () => void;
  onOpenAssignDriver: () => void;
  payIsPending: boolean;
  statusIsPending: boolean;
}

function LoadDetailBody({
  detail,
  onPaySave,
  onMarkComplete,
  onCancel,
  onOpenUpload,
  onOpenEdit,
  onOpenAssignDriver,
  payIsPending,
  statusIsPending,
}: LoadDetailBodyProps) {
  const load = detail.load;
  const broker = detail.broker;
  const driver = detail.driver;
  const truck = detail.truck;
  const stops = detail.stops;
  const pickup = stops.find((s) => s.stopType === "pickup") ?? null;
  const delivery =
    [...stops].reverse().find((s) => s.stopType === "delivery") ?? null;

  const status = load.status;
  const driverPayCents = load.driverPayCents;
  const driverPayUpdatedAt = load.driverPayUpdatedAt;
  const isCompleted = status === "completed";

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

  const focusPayInput = () => {
    payBlockRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    window.setTimeout(() => payInputRef.current?.focus(), 200);
  };

  const handlePrimary = () => {
    if (primary.label === "Mark completed") {
      if (driverPayCents === null) {
        toast.error("Enter driver pay before closing this load");
        focusPayInput();
        return;
      }
      onMarkComplete();
      return;
    }
    if (primary.label === "Assign driver") {
      if (driverPayCents === null) {
        setConfirmAssignOpen(true);
        return;
      }
      onOpenAssignDriver();
      return;
    }
    onOpenAssignDriver();
  };

  return (
    <>
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
              {broker && (
                <EntityChip
                  kind="broker"
                  id={broker.id}
                  label={broker.companyName}
                  size="sm"
                />
              )}
            </span>
          }
          actions={
            <>
              <Button
                variant={primary.variant}
                size="md"
                onClick={handlePrimary}
                disabled={statusIsPending}
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
                    onSelect={onOpenEdit}
                  >
                    <Pencil /> Edit details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => onOpenUpload("load_pod")}
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

        <RouteBand pickup={pickup} delivery={delivery} miles={load.miles} />

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
          isSaving={payIsPending}
          onSave={onPaySave}
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
              {pickup && <StopCard kind="pickup" stop={pickup} />}
              {delivery && <StopCard kind="delivery" stop={delivery} />}
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
                  {broker && (
                    <div className="flex flex-col gap-1">
                      <Label>Broker</Label>
                      <div>
                        <EntityChip
                          kind="broker"
                          id={broker.id}
                          label={broker.companyName}
                        />
                      </div>
                    </div>
                  )}
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
                    {driver ? (
                      <div>
                        <EntityChip
                          kind="driver"
                          id={driver.id}
                          label={`${driver.firstName} ${driver.lastName}`}
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
                    {truck ? (
                      <div>
                        <EntityChip
                          kind="truck"
                          id={truck.id}
                          label={`Unit ${truck.unitNumber}`}
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
          <LoadDocumentsPanel
            loadStatus={status}
            documents={detail.documents}
            onUpload={onOpenUpload}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryTimeline history={detail.history} />
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
          onOpenAssignDriver();
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
          if (!reason) return;
          onCancel(reason);
          setCancelLoadOpen(false);
        }}
      />
    </>
  );
}

interface DriverPayBlockProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  payCents: number | null;
  payUpdatedAt: string | null;
  createdAt: string;
  readOnly: boolean;
  isSaving: boolean;
  onSave: (nextCents: number | null) => void;
}

const DriverPayBlock = React.forwardRef<HTMLDivElement, DriverPayBlockProps>(
  function DriverPayBlock(
    { inputRef, payCents, payUpdatedAt, createdAt, readOnly, isSaving, onSave },
    ref,
  ) {
    const [editing, setEditing] = React.useState(false);
    const [draft, setDraft] = React.useState(() =>
      payCents === null ? "" : (payCents / 100).toFixed(2),
    );

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
                      disabled={isSaving}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={commit}
                    disabled={isSaving}
                  >
                    <Check className="size-3.5" />
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cancel}
                    disabled={isSaving}
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

function RouteBand({
  pickup,
  delivery,
  miles,
}: {
  pickup: LoadStop | null;
  delivery: LoadStop | null;
  miles: number | null;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
        <RouteEndpoint
          icon={MapPin}
          label="Pickup"
          city={pickup?.city ?? "—"}
          state={pickup?.state ?? ""}
          date={pickup?.windowStart ?? null}
          tone="neutral"
        />
        <div className="flex flex-col items-center justify-center gap-1 border-x border-border bg-[var(--surface)] px-3 py-4 sm:px-5">
          <ArrowBand miles={miles} />
        </div>
        <RouteEndpoint
          icon={MapPin}
          label="Delivery"
          city={delivery?.city ?? "—"}
          state={delivery?.state ?? ""}
          date={delivery?.windowEnd ?? null}
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
  date: string | null;
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
        {state && <span className="ml-1 text-muted-foreground">{state}</span>}
      </div>
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Calendar className="size-3" />
        {date ? formatDateShort(date) : "—"}
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

function StopCard({
  kind,
  stop,
}: {
  kind: "pickup" | "delivery";
  stop: LoadStop;
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
          {stop.city}, <span className="text-muted-foreground">{stop.state}</span>
        </span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="size-3" />
          {formatDateShort(stop.windowStart)} →{" "}
          {formatDateShort(stop.windowEnd)}
        </div>
      </div>
    </Panel>
  );
}

function LoadDocumentsPanel({
  loadStatus,
  documents,
  onUpload,
}: {
  loadStatus: LoadStatus;
  documents: LoadDocument[];
  onUpload: (defaultType: string) => void;
}) {
  // Build a quick-lookup of which spec types have been uploaded.
  const byType = new Map<string, LoadDocument[]>();
  for (const d of documents) {
    const existing = byType.get(d.type) ?? [];
    existing.push(d);
    byType.set(d.type, existing);
  }

  return (
    <Card className="gap-0 p-0">
      <ul className="divide-y divide-border">
        {LOAD_DOC_SPECS.map((spec) => {
          const expected = isExpectedNow(loadStatus, spec);
          const uploaded = byType.get(spec.dbType) ?? [];
          return (
            <li
              key={spec.dbType}
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
                    {uploaded.length > 0
                      ? `${uploaded.length} uploaded · ${formatRelativeFromNow(uploaded[0]!.createdAt)}`
                      : expected
                        ? "Expected"
                        : "Not yet expected"}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="muted" className="text-[10px]">
                  {uploaded.length > 0 ? "Uploaded" : "Not uploaded"}
                </Badge>
                {expected && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpload(spec.dbType)}
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

function HistoryTimeline({ history }: { history: LoadHistoryEntry[] }) {
  if (history.length === 0) {
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
        {history.map((e, i) => (
          <li
            key={e.id}
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
              {i < history.length - 1 && (
                <span className="absolute left-1/2 top-2 h-[calc(100%+1rem)] w-px -translate-x-1/2 bg-[var(--border)]" />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <StatusPill kind="load" status={e.toStatus} />
              </div>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="size-3" />
                  {e.changedByUserId}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatRelativeFromNow(e.changedAt)}
                </span>
                {e.reason && (
                  <span className="italic text-muted-foreground">
                    {e.reason}
                  </span>
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

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

interface LoadDocSpec {
  dbType: string;
  label: string;
  required: boolean;
  expectedAtOrAfter: LoadStatus;
}

const LOAD_DOC_SPECS: LoadDocSpec[] = [
  {
    dbType: "load_rate_confirmation",
    label: "Rate confirmation",
    required: true,
    expectedAtOrAfter: "assigned",
  },
  {
    dbType: "load_bol",
    label: "Bill of lading",
    required: true,
    expectedAtOrAfter: "at_pickup",
  },
  {
    dbType: "load_pod",
    label: "Proof of delivery",
    required: true,
    expectedAtOrAfter: "delivered",
  },
  {
    dbType: "load_lumper_receipt",
    label: "Lumper receipt",
    required: false,
    expectedAtOrAfter: "delivered",
  },
  {
    dbType: "load_scale_ticket",
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

function isExpectedNow(currentStatus: LoadStatus, spec: LoadDocSpec): boolean {
  const cur = STATUS_ORDER.indexOf(currentStatus);
  const exp = STATUS_ORDER.indexOf(spec.expectedAtOrAfter);
  return cur >= exp;
}

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
