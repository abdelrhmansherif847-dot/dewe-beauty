import type { StoreSettings } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";

export function deliveryFeeFor(subtotalCents: number, settings: StoreSettings): number {
  if (settings.freeDeliveryThresholdCents !== null && subtotalCents >= settings.freeDeliveryThresholdCents) return 0;
  return settings.deliveryFeeCents;
}

export function CartTotals({
  subtotalCents,
  settings,
  currency,
}: {
  subtotalCents: number;
  settings: StoreSettings | null;
  currency: string;
}) {
  const delivery = settings ? deliveryFeeFor(subtotalCents, settings) : null;
  return (
    <dl className="totals">
      <div>
        <dt>Subtotal</dt>
        <dd data-testid="cart-subtotal">{formatMoney(subtotalCents, currency)}</dd>
      </div>
      <div>
        <dt>Delivery</dt>
        <dd>{delivery === null ? "Calculated at checkout" : delivery === 0 ? "No delivery fee" : formatMoney(delivery, currency)}</dd>
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
