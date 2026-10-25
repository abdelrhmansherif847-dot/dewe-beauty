import type { StoreSettings } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";

/** Display copy of the database's fee rule; the database decides at checkout. */
export function deliveryFeeFor(subtotalCents: number, settings: StoreSettings, zoneFeeCents: number | null = null): number {
  if (settings.freeDeliveryThresholdCents !== null && subtotalCents >= settings.freeDeliveryThresholdCents) return 0;
  return zoneFeeCents ?? settings.deliveryFeeCents;
}

export function CartTotals({
  subtotalCents,
  settings,
  currency,
  zone,
}: {
  subtotalCents: number;
  settings: StoreSettings | null;
  currency: string;
  /** At checkout: the chosen zone's fee override, or "none" before a choice. */
  zone?: { feeCents: number | null } | "none";
}) {
  const delivery = settings && zone !== "none" ? deliveryFeeFor(subtotalCents, settings, zone?.feeCents ?? null) : null;
  return (
    <dl className="totals">
      <div>
        <dt>Subtotal</dt>
        <dd data-testid="cart-subtotal">{formatMoney(subtotalCents, currency)}</dd>
      </div>
      <div>
        <dt>Delivery</dt>
        <dd>{delivery === null ? (zone === "none" ? "Choose your governorate" : "Calculated at checkout") : delivery === 0 ? "No delivery fee" : formatMoney(delivery, currency)}</dd>
      </div>
      <div>
        <dt>Payment</dt>
        <dd>Cash on delivery</dd>
      </div>
      <div className="totals__grand">
        <dt>Estimated total</dt>
        <dd>{formatMoney(subtotalCents + (delivery ?? 0), currency)}</dd>
      </div>
    </dl>
  );
}
