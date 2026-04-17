import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, LogOut } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

import { adminNavGroups, type NavBadgeTone } from "./nav-items";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Paths already surfaced in the bottom tab bar — skipped here to avoid dupes. */
  tabPaths: Set<string>;
}

/**
 * Bottom-sheet "More" drawer for mobile/tablet. Shows everything NOT in the
 * bottom tab bar, grouped exactly the way the sidebar does, plus a sign-out
 * action pinned to the bottom. Tapping a link closes the sheet — same pattern
 * as the existing mobile sidebar sheet.
 */
export function MoreMenuSheet({ open, onOpenChange, tabPaths }: Props) {
  const { location } = useRouterState({
    select: (s) => ({ location: s.location }),
  });
  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          // Rounded top corners for a proper "bottom sheet" feel (not a slab)
          "rounded-t-[var(--radius-xl)] p-0",
          "max-h-[85vh]",
          // Honor the home indicator on iPhone
          "pb-[env(safe-area-inset-bottom)]",
          // Soft top divider line to separate from the content behind
          "border-t-0 border border-[var(--border)]",
        )}
      >
        {/* Drag grabber — purely decorative but signals "I pull down" */}
        <div className="flex justify-center pt-2">
          <span
            aria-hidden
            className="h-1 w-9 rounded-full bg-[var(--border-strong)]"
          />
        </div>

        <SheetHeader className="px-5 pt-2 pb-3">
          <SheetTitle className="text-left text-[15px]">
            Everything else
          </SheetTitle>
        </SheetHeader>

        <div className="scrollbar-thin max-h-[calc(85vh-120px)] overflow-y-auto px-3 pb-4">
          {adminNavGroups.map((group, gi) => {
            const items = group.items.filter((i) => !tabPaths.has(i.to));
            if (items.length === 0) return null;
            return (
              <div
                key={group.id}
                className={cn(gi > 0 && "mt-4 border-t border-border pt-4")}
              >
                {group.label && (
                  <h3 className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {group.label}
                  </h3>
                )}
                <ul className="flex flex-col gap-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.to);
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          onClick={() => {
                            haptic.tap();
                            onOpenChange(false);
                          }}
                          className={cn(
                            "flex items-center gap-3.5 rounded-[var(--radius-md)] px-3 py-3",
                            "min-h-[48px] transition-colors",
                            "active:bg-muted",
                            active
                              ? "bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] text-[var(--primary)]"
                              : "text-foreground hover:bg-muted",
                          )}
                        >
                          <Icon
                            className="size-5 shrink-0"
                            strokeWidth={active ? 2.25 : 1.75}
                            aria-hidden
                          />
                          <span
                            className={cn(
                              "flex-1 text-[15px]",
                              active && "font-semibold",
                            )}
                          >
                            {item.label}
                          </span>
                          {item.badge && <BadgeDot tone={item.badge.tone} />}
                          <ChevronRight
                            className="size-4 text-[var(--subtle-foreground)]"
                            aria-hidden
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {/* Sign out pinned at the bottom, visually separated */}
          <div className="mt-4 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => {
                haptic.tap();
                // Phase 1: no auth wired. When Better Auth lands, call signOut().
                onOpenChange(false);
              }}
              className={cn(
                "flex w-full items-center gap-3.5 rounded-[var(--radius-md)] px-3 py-3",
                "min-h-[48px] text-[15px] text-[var(--danger)]",
                "active:bg-[var(--danger)]/10",
              )}
            >
              <LogOut
                className="size-5 shrink-0"
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="flex-1 text-left">Sign out</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BadgeDot({ tone }: { tone: NavBadgeTone }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-2 shrink-0 rounded-full",
        tone === "primary" && "bg-[var(--primary)]",
        tone === "warning" && "bg-[var(--warning)]",
        tone === "danger" && "bg-[var(--danger)]",
        tone === "default" && "bg-[var(--muted-foreground)]",
      )}
    />
  );
}
