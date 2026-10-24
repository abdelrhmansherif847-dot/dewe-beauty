/**
 * Egyptian mobile numbers. Mirrors private.normalize_eg_mobile() in the
 * database, which stays the authority; this copy only gives instant feedback.
 *
 * Accepts 01XXXXXXXXX, 201XXXXXXXXX, +201XXXXXXXXX or 00201XXXXXXXXX with any
 * spaces, dashes, dots or brackets, for the 010, 011, 012 and 015 networks.
 */
export function normalizeEgMobile(value: string | null | undefined): string | null {
  const digits = String(value ?? "").replace(/[\s().-]/g, "");
  if (!/^(0020|\+20|20)?0?1[0125][0-9]{8}$/.test(digits)) return null;
  return `+20${digits.slice(-10)}`;
}

/** +201012345678 → +20 101 234 5678, for display. */
export function formatEgMobile(e164: string | null | undefined): string {
  const n = normalizeEgMobile(e164);
  if (!n) return String(e164 ?? "");
  return `+20 ${n.slice(3, 6)} ${n.slice(6, 9)} ${n.slice(9)}`;
}

export const PHONE_HINT = "An Egyptian mobile number, such as 010 1234 5678.";
export const PHONE_ERROR = "Please enter an Egyptian mobile number, such as 010 1234 5678.";
