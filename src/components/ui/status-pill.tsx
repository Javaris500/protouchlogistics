import { Badge } from "./badge";

export type LoadStatus =
  | "draft"
  | "assigned"
  | "accepted"
  | "en_route_pickup"
  | "at_pickup"
  | "loaded"
  | "en_route_delivery"
  | "at_delivery"
  | "delivered"
  | "pod_uploaded"
  | "completed"
  | "cancelled";

export type TruckStatus = "active" | "in_shop" | "out_of_service";

export type DriverStatus =
  | "invited"
  | "pending_approval"
  | "active"
  | "suspended";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";

type Variant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "primary"
  | "muted";

const LOAD_META: Record<LoadStatus, { label: string; variant: Variant }> = {
  draft: { label: "Draft", variant: "muted" },
  assigned: { label: "Assigned", variant: "info" },
  accepted: { label: "Accepted", variant: "info" },
  en_route_pickup: { label: "En route to pickup", variant: "primary" },
  at_pickup: { label: "At pickup", variant: "primary" },
  loaded: { label: "Loaded", variant: "primary" },
  en_route_delivery: { label: "En route to delivery", variant: "primary" },
  at_delivery: { label: "At delivery", variant: "primary" },
  delivered: { label: "Delivered", variant: "success" },
  pod_uploaded: { label: "POD uploaded", variant: "success" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

const TRUCK_META: Record<TruckStatus, { label: string; variant: Variant }> = {
  active: { label: "Active", variant: "success" },
  in_shop: { label: "In shop", variant: "warning" },
  out_of_service: { label: "Out of service", variant: "danger" },
};

const DRIVER_META: Record<DriverStatus, { label: string; variant: Variant }> = {
  invited: { label: "Invited", variant: "muted" },
  pending_approval: { label: "Pending approval", variant: "warning" },
  active: { label: "Active", variant: "success" },
  suspended: { label: "Suspended", variant: "danger" },
};

const INVOICE_META: Record<InvoiceStatus, { label: string; variant: Variant }> =
  {
    draft: { label: "Draft", variant: "muted" },
    sent: { label: "Sent", variant: "info" },
    paid: { label: "Paid", variant: "success" },
    overdue: { label: "Overdue", variant: "danger" },
    void: { label: "Void", variant: "muted" },
  };

type StatusPillProps =
  | { kind: "load"; status: LoadStatus; className?: string }
  | { kind: "truck"; status: TruckStatus; className?: string }
  | { kind: "driver"; status: DriverStatus; className?: string }
  | { kind: "invoice"; status: InvoiceStatus; className?: string };

export function StatusPill(props: StatusPillProps) {
  const meta =
    props.kind === "load"
      ? LOAD_META[props.status]
      : props.kind === "truck"
        ? TRUCK_META[props.status]
        : props.kind === "driver"
          ? DRIVER_META[props.status]
          : INVOICE_META[props.status];

  return (
    <Badge variant={meta.variant} className={props.className}>
      <span
        aria-hidden="true"
        className="inline-block size-1.5 shrink-0 rounded-full bg-current"
      />
      {meta.label}
    </Badge>
  );
}
