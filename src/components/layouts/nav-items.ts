import {
  LayoutDashboard,
  MapPinned,
  Truck,
  Users,
  Container,
  Handshake,
  FileText,
  Receipt,
  BarChart3,
  Settings,
  History,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";

export type NavBadgeTone = "default" | "primary" | "warning" | "danger";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Dynamic badge counts — data-wired later. */
  badge?: {
    tone: NavBadgeTone;
    /** Key into the counters object returned by getAdminDashboard. */
    counterKey?:
      | "pendingApprovals"
      | "aiLoadDrafts"
      | "overdueInvoices"
      | "expiringDocs";
  };
};

export type NavGroup = {
  id: string;
  label?: string;
  items: NavItem[];
};

/**
 * Admin sidebar navigation — single source of truth.
 * Order follows the operational priority we discussed with Gary:
 * Dashboard → Live Tracking → Loads → Drivers → Trucks → Brokers →
 * Invoices → Driver Pay → Documents → (divider) → Analytics → Audit → Settings
 */
export const adminNavGroups: NavGroup[] = [
  {
    id: "ops",
    items: [
      { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Live Tracking", to: "/admin/tracking", icon: MapPinned },
      {
        label: "Loads",
        to: "/admin/loads",
        icon: Container,
        badge: { tone: "primary", counterKey: "aiLoadDrafts" },
      },
      {
        label: "Drivers",
        to: "/admin/drivers",
        icon: Users,
        badge: { tone: "warning", counterKey: "pendingApprovals" },
      },
      { label: "Trucks", to: "/admin/trucks", icon: Truck },
      { label: "Brokers", to: "/admin/brokers", icon: Handshake },
    ],
  },
  {
    id: "money",
    label: "Billing",
    items: [
      {
        label: "Invoices",
        to: "/admin/invoices",
        icon: Receipt,
        badge: { tone: "danger", counterKey: "overdueInvoices" },
      },
      {
        label: "Documents",
        to: "/admin/documents",
        icon: FileText,
        badge: { tone: "warning", counterKey: "expiringDocs" },
      },
    ],
  },
  {
    id: "insight",
    label: "Insight",
    items: [
      { label: "Analytics", to: "/admin/analytics", icon: BarChart3 },
      { label: "Audit log", to: "/admin/settings/audit", icon: History },
      { label: "Settings", to: "/admin/settings", icon: Settings },
    ],
  },
  {
    id: "dev",
    label: "Dev",
    items: [{ label: "Onboarding", to: "/onboarding", icon: FlaskConical }],
  },
];
