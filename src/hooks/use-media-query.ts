import { useEffect, useState } from "react";

/**
 * SSR-safe media query hook.
 * Returns `false` during server render, hydrates to true state on mount.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/** Tailwind breakpoints. Stay in sync with Tailwind defaults. */
export const breakpoints = {
  sm: "(min-width: 640px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
  xl: "(min-width: 1280px)",
  "2xl": "(min-width: 1536px)",
} as const;

export function useIsDesktop(): boolean {
  return useMediaQuery(breakpoints.lg);
}

export function useIsTablet(): boolean {
  return useMediaQuery(breakpoints.md);
}
