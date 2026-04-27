/**
 * Driver-facing dispatch contact + deep-link helpers.
 *
 * The dispatch phone is opt-in: there's no separate dispatcher role yet
 * (Gary IS dispatch + admin + owner). Until a real number is wired in
 * Phase 2 (likely on `company_settings` so it's editable without a
 * redeploy), `DISPATCH_PHONE` stays null and the topbar button is hidden.
 */

/** Real dispatch number in E.164, or `null` if no dispatch role exists. */
export const DISPATCH_PHONE: string | null = null;

/** True if a real dispatch number is configured. UI gates the call button on this. */
export function hasDispatch(): boolean {
  return DISPATCH_PHONE !== null && DISPATCH_PHONE.length > 0;
}

/**
 * Pretty-print an E.164 number for display ("+15555550100" → "(555) 555-0100").
 * Falls back to the raw input on anything non-US.
 */
export function formatPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return e164;
}

export function dialUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/**
 * Build a Google Maps URL that resolves to the stop address. Works on iOS
 * (opens Apple Maps via universal link), Android (opens Google Maps app),
 * and desktop (opens maps.google.com). Tested with `?api=1` per the
 * Google Maps URL spec — search by `query`.
 */
export function mapsUrl(parts: {
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
}): string {
  const q = `${parts.addressLine1}, ${parts.city}, ${parts.state} ${parts.zip}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
