import { LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { signOutFn } from "@/server/auth/functions";
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

interface Props {
  driverFirstName: string;
}

export function DriverTopbar({ driverFirstName }: Props) {
  const [theme, setTheme] = useState<Theme>("light");
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  useEffect(() => setTheme(readTheme()), []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOutFn();
      await router.navigate({ to: "/login" });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-3",
        "px-3 sm:px-5",
        "pt-[env(safe-area-inset-top)]",
        "bg-[var(--background)]/80 backdrop-blur-xl",
        "border-b border-[var(--border)]",
      )}
    >
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--foreground)]">
          <span className="font-mono text-[10px] font-bold tracking-wider text-[var(--background)]">
            PTL
          </span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <span className="hidden text-[13px] font-medium text-[var(--muted-foreground)] sm:inline">
          Hey, <span className="text-[var(--foreground)]">{driverFirstName}</span>
        </span>

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

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          disabled={signingOut}
          aria-label="Sign out"
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </Button>
      </div>
    </header>
  );
}
