const formatters = new Map<string, Intl.NumberFormat>();

/** Formats an amount stored in the smallest currency unit (e.g. piastres). */
export function formatMoney(cents: number, currency = "EGP"): string {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-EG", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    formatters.set(currency, formatter);
  }
  return formatter.format(cents / 100);
}

export function formatPriceRange(minCents: number, maxCents: number, currency = "EGP"): string {
  if (minCents === maxCents) return formatMoney(minCents, currency);
  return `From ${formatMoney(minCents, currency)}`;
}
