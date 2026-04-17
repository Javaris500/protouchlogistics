import { Bell, Moon, Search, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

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
        "bg-[var(--background)]/80 backdrop-blur-xl",
        "border-b border-[var(--border)]",
      )}
    >
      {/* Mobile-only sidebar trigger. Desktop uses the inline collapse
          toggle inside the sidebar header, plus Ctrl/Cmd+B shortcut. */}
      <SidebarTrigger className="h-9 w-9 shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)] lg:hidden" />

      {/* Breadcrumb-style page context could go here */}
      <div className="hidden min-w-0 flex-1 md:flex">
        <label className="relative flex w-full max-w-sm items-center">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 h-4 w-4 text-[var(--muted-foreground)]"
          />
          <input
            type="search"
            placeholder="Search loads, drivers, brokers…"
            className={cn(
              "h-9 w-full rounded-[var(--radius-md)]",
              "border border-[var(--border)] bg-[var(--surface)]",
              "pl-9 pr-3 text-sm text-[var(--foreground)]",
              "placeholder:text-[var(--subtle-foreground)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:border-transparent",
              "transition-shadow",
            )}
          />
        </label>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Notifications */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span
            aria-hidden="true"
            className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--primary)] ring-2 ring-[var(--background)]"
          />
        </Button>

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
