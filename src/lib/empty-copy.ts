import type { EmptyStateVariant } from "@/components/common/EmptyState";

export interface EmptyCopy {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  variant: EmptyStateVariant;
}

export type SurfaceKey =
  | "dashboard.activeLoads"
  | "dashboard.expiringDocs"
  | "dashboard.activity"
  | "dashboard.onboardingQueue"
  | "dashboard.liveFleet"
  | "drivers.filter"
  | "drivers.pending"
  | "trucks.firstTime"
  | "trucks.filter"
  | "brokers.firstTime"
  | "brokers.filter"
  | "loads.firstTime"
  | "loads.filter"
  | "load.breadcrumbs"
  | "invoices.firstTime"
  | "invoiceNew.noUnbilled"
  | "pay.firstTime"
  | "documents.firstTime"
  | "analytics.needsData"
  | "tracking.firstTime"
  | "notifications.firstTime"
  | "settings.audit.firstTime"
  | "settings.integrations.none";

export const EMPTY_COPY: Record<SurfaceKey, EmptyCopy> = {
  "dashboard.activeLoads": {
    title: "No loads in flight",
    description:
      "Loads you've dispatched will show up here so you can track pickup, transit, and delivery at a glance. Create a load to get started.",
    ctaLabel: "New load",
    ctaHref: "/admin/loads/new",
    variant: "first-time",
  },
  "dashboard.expiringDocs": {
    title: "Nothing expiring soon",
    description:
      "CDLs, medical cards, insurance, and registrations with upcoming expiration dates will surface here. You're all caught up.",
    variant: "caught-up",
  },
  "dashboard.activity": {
    title: "Activity will land here",
    description:
      "As drivers accept loads, upload documents, and deliveries complete, the day's timeline shows up in this feed.",
    variant: "first-time",
  },
  "dashboard.onboardingQueue": {
    title: "No drivers waiting on review",
    description:
      "When an invited driver finishes their application, they'll appear here for approval. Invite a driver to begin.",
    ctaLabel: "Invite driver",
    ctaHref: "/admin/drivers",
    variant: "caught-up",
  },
  "dashboard.liveFleet": {
    title: "No drivers on the road",
    description:
      "Once a driver starts a run, their live location appears on this map. Assign a load to see the fleet move.",
    variant: "first-time",
  },
  "drivers.filter": {
    title: "No drivers match these filters",
    description:
      "Try widening your filters or clearing the search to see the rest of your roster.",
    ctaLabel: "Clear filters",
    variant: "filter",
  },
  "drivers.pending": {
    title: "No drivers awaiting approval",
    description:
      "Applications from invited drivers land here for you to review. You're all caught up.",
    variant: "caught-up",
  },
  "trucks.firstTime": {
    title: "No trucks in the yard",
    description:
      "Add your tractors and trailers to track VIN, plates, inspections, and which driver is in each unit.",
    ctaLabel: "Add truck",
    ctaHref: "/admin/trucks",
    variant: "first-time",
  },
  "trucks.filter": {
    title: "No trucks match these filters",
    description:
      "Try a different status or clear the search to see the rest of your fleet.",
    ctaLabel: "Clear filters",
    variant: "filter",
  },
  "brokers.firstTime": {
    title: "No brokers yet",
    description:
      "Add the brokers you haul for so their MC/DOT, contacts, and payment terms are one click away when you book a load.",
    ctaLabel: "Add broker",
    ctaHref: "/admin/brokers",
    variant: "first-time",
  },
  "brokers.filter": {
    title: "No brokers match these filters",
    description:
      "Adjust your filters or clear the search to see your full broker list.",
    ctaLabel: "Clear filters",
    variant: "filter",
  },
  "loads.firstTime": {
    title: "No loads booked",
    description:
      "Every load you dispatch lives here with status, driver, broker, and pay. Book your first load to start moving freight.",
    ctaLabel: "New load",
    ctaHref: "/admin/loads/new",
    variant: "first-time",
  },
  "loads.filter": {
    title: "No loads match these filters",
    description:
      "Try widening the status or date range, or clear the search to see every load.",
    ctaLabel: "Clear filters",
    variant: "filter",
  },
  "load.breadcrumbs": {
    title: "No stops on this load yet",
    description:
      "Pickup and delivery stops will appear here as the load progresses. Add stops from the load detail to build the route.",
    variant: "first-time",
  },
  "invoices.firstTime": {
    title: "No invoices yet",
    description:
      "Invoices you cut for completed loads show up here with status, aging, and broker. Create your first invoice when a load delivers.",
    ctaLabel: "New invoice",
    ctaHref: "/admin/invoices/new",
    variant: "first-time",
  },
  "invoiceNew.noUnbilled": {
    title: "No unbilled loads",
    description:
      "Every completed load has already been invoiced. New invoices become available as soon as another delivery closes.",
    variant: "caught-up",
  },
  "pay.firstTime": {
    title: "No pay periods yet",
    description:
      "Once loads start completing, pay periods roll up here with driver totals, deductions, and payout status.",
    variant: "first-time",
  },
  "documents.firstTime": {
    title: "No documents on file",
    description:
      "Rate confs, BOLs, POD photos, and driver paperwork land in this library. Upload a document or complete a load to populate it.",
    ctaLabel: "Upload document",
    ctaHref: "/admin/documents",
    variant: "first-time",
  },
  "analytics.needsData": {
    title: "Analytics need a few loads to get started",
    description:
      "Revenue, utilization, and margin charts populate automatically after you complete a handful of loads. Check back once the first week of runs is in the books.",
    variant: "first-time",
  },
  "tracking.firstTime": {
    title: "No drivers on the road",
    description:
      "Live GPS pings appear here the moment a driver starts a run. Dispatch a load to watch the fleet move in real time.",
    ctaLabel: "New load",
    ctaHref: "/admin/loads/new",
    variant: "first-time",
  },
  "notifications.firstTime": {
    title: "You're all caught up",
    description:
      "Alerts for expiring docs, load updates, and driver activity show up here. Nothing needs your attention right now.",
    variant: "caught-up",
  },
  "settings.audit.firstTime": {
    title: "Audit log is empty",
    description:
      "Every admin action — driver invites, pay edits, status changes — gets recorded here for compliance once the team starts working.",
    variant: "first-time",
  },
  "settings.integrations.none": {
    title: "No integrations connected",
    description:
      "Connect Neon, R2, Resend, Mapbox, and the rest to unlock live data, email delivery, and maps. Pick an integration below to get started.",
    variant: "first-time",
  },
};
