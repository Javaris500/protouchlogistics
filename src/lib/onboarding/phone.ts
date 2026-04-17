/**
 * Light-weight phone helpers for onboarding forms.
 * Wire format is E.164 (+1XXXXXXXXXX); display format is (XXX) XXX-XXXX.
 * Full validation lives in the server Zod schemas — this is UX formatting.
 */

export function formatUsPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function toE164(displayValue: string): string {
  const digits = displayValue.replace(/\D/g, "");
  if (digits.length !== 10) return "";
  return `+1${digits}`;
}

export function isValidUsPhone(displayValue: string): boolean {
  const digits = displayValue.replace(/\D/g, "");
  // US phones: 10 digits, first area-code digit 2-9, first exchange digit 2-9
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(digits);
}
