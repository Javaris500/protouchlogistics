import { Moon, Search, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { NotificationsPopover } from "./NotificationsPopover";

type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  document.cookie = `theme=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function AdminTopbar() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => setTheme(readTheme()), []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-3",
        "px-3 sm:px-5",
        // Respect iPhone notch / Dynamic Island when installed as a PWA.
        "pt-[env(safe-area-inset-top)]",
        "bg-[var(--background)]/80 backdrop-blur-xl",
        "border-b border-[var(--border)]",
      )}
    >
      {/* Mobile brand mark — only on phone viewports (< md). Tablet/desktop
          get the brand from the sidebar header, so it'd be redundant there. */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--foreground)]">
          <span className="font-mono text-[10px] font-bold tracking-wider text-[var(--background)]">
            PTL
          </span>
        </div>
      </div>

      {/* Global search — tablet + desktop (md+). Rounded-full pill matches
          the SearchInput component used across list pages. Copper focus
          glow ties it into the brand. ⌘K hint sits on the right until
          we wire the command palette. */}
      <div className="hidden min-w-0 flex-1 md:flex">
        <label className="group relative flex w-full max-w-sm items-center">
          <Search
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute left-3.5 h-4 w-4",
              "text-[var(--muted-foreground)] transition-colors duration-150",
              "group-focus-within:text-[var(--primary)]",
            )}
          />
          <input
            type="search"
            placeholder="Search loads, drivers, brokers…"
            className={cn(
              "h-9 w-full rounded-full border bg-[var(--background)]",
              "pl-10 pr-14 text-[13px] text-[var(--foreground)]",
              "placeholder:text-[var(--subtle-foreground)]",
              "border-[var(--border)]",
              "hover:border-[var(--border-strong)]",
              "focus:outline-none focus:border-[var(--primary)]",
              "focus:shadow-[0_0_0_4px_rgb(242_122_26_/_0.12)]",
              "dark:focus:shadow-[0_0_0_4px_rgb(251_168_92_/_0.16)]",
              "transition-[border-color,box-shadow] duration-150 ease-out",
              "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
            )}
          />
          <kbd
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute right-2 inline-flex h-[22px] items-center gap-0.5",
              "rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5",
              "text-[10px] font-semibold text-[var(--muted-foreground)]",
              "transition-opacity duration-150",
              "group-focus-within:opacity-0",
            )}
          >
            <span className="text-[11px] leading-none">⌘</span>
            <span className="leading-none">K</span>
          </kbd>
        </label>
      </div>

      {/* Mobile search trigger (icon only, < md) */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Search"
        className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] md:hidden"
      >
        <Search className="h-[18px] w-[18px]" />
      </Button>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Notifications */}
        <NotificationsPopover />

        {/* Theme toggle */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          {theme === "dark" ? (
            <Sun className="h-[18px] w-[18px]" />
          ) : (
            <Moon className="h-[18px] w-[18px]" />
          )}
        </Button>
      </div>
    </header>
  );
}
