/**
 * Lightweight haptic feedback helper.
 *
 * iOS Safari silently ignores `navigator.vibrate` — it returns false and no
 * vibration fires. Android Chrome triggers a real buzz. We accept the asymmetry
 * for now; the browser boundary exists to stop abuse (ads buzzing your phone),
 * not to be worked around. When Gary installs the PWA we get the same rules.
 *
 * Use sparingly — one tap per action, never on hover. Otherwise it reads as
 * noise, not confirmation.
 */
export const haptic = {
  /** Light tap — use on nav-bar taps, primary button clicks, step advance. */
  tap(): void {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // Permission denied or API unavailable — silent failure is correct.
      }
    }
  },

  /** Heavier double-pulse — use for errors, important confirmations. */
  impact(): void {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([20, 30, 20]);
      } catch {
        // noop
      }
    }
  },
};
