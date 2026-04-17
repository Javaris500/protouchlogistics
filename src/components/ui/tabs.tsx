import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

/**
 * Tabs — underline variant.
 *
 * Active state:
 *   - Label steps up from `muted-foreground` → `foreground` (stronger weight)
 *   - Copper underline (2px, rounded ends) animates in under the active tab
 *   - Subtle lift on hover for inactive tabs so they feel reachable
 *
 * The underline sits on the TabsList's shared bottom border, so tabs read as
 * anchored to the content below — not floating in a pill track.
 */

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        // The baseline — a thin hairline the underlines rest on
        "relative flex h-10 items-stretch gap-5 sm:gap-6",
        "border-b border-[var(--border)]",
        // Narrow viewports: scroll horizontally, scrollbar hidden
        "w-full max-w-full overflow-x-auto scrollbar-none",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // Layout
        "group relative inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap",
        "px-0.5 text-sm font-medium -outline-offset-2",
        // Baseline color (inactive)
        "text-[var(--muted-foreground)]",
        // Motion
        "transition-colors duration-150",
        // Hover pulls toward foreground color — stronger than subtle
        "hover:text-[var(--foreground)]",
        // Focus ring (keyboard nav)
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] rounded-sm",
        "disabled:pointer-events-none disabled:opacity-50",
        // Active — foreground color + semibold
        "data-[state=active]:text-[var(--foreground)]",
        "data-[state=active]:font-semibold",
        // Icons
        "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        "data-[state=active]:[&_svg]:text-[var(--primary)]",
        // The underline — pseudo-element anchored to the list's baseline.
        // Inactive: invisible. Active: copper, 2px, rounded, full-width minus
        // a tiny inset. Animates with a scale transform so it "draws" in.
        "after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:h-[2px]",
        "after:rounded-full after:bg-[var(--primary)]",
        "after:origin-center after:scale-x-0 after:opacity-0",
        "after:transition-[transform,opacity] after:duration-200 after:ease-out",
        "data-[state=active]:after:scale-x-100 data-[state=active]:after:opacity-100",
        // Hover hint — under inactive tabs, fade a muted underline in for
        // affordance. Active state overrides this via the rules above.
        "hover:after:scale-x-100 hover:after:opacity-40 hover:after:bg-[var(--border-strong)]",
        "data-[state=active]:hover:after:bg-[var(--primary)] data-[state=active]:hover:after:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 outline-none",
        "data-[state=inactive]:hidden",
        "data-[state=active]:animate-in data-[state=active]:fade-in-0",
        "data-[state=active]:duration-200",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
