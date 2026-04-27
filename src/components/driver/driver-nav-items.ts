import {
  Home,
  Package,
  FileText,
  CircleDollarSign,
  type LucideIcon,
} from "lucide-react";

export type DriverNavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
};

/**
 * Driver portal nav — flat 4-item list. No groups, no badges.
 * Drivers operate single-task: pick the destination and go. Anything more
 * elaborate would be cosplay of Gary's admin sidebar.
 */
export const driverNavItems: DriverNavItem[] = [
  { label: "Home", to: "/driver", icon: Home },
  { label: "Loads", to: "/driver/loads", icon: Package },
  { label: "Documents", to: "/driver/documents", icon: FileText },
  { label: "Pay", to: "/driver/pay", icon: CircleDollarSign },
];
