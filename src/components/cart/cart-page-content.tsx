"use client";

import Link from "next/link";
import { AnimatePresence } from "motion/react";
import { useCart } from "./cart-provider";
import { CartLineItem } from "./cart-line-item";
import { CartTotals } from "./cart-summary";
import { EmptyBag } from "./empty-bag";
import { useCartQuote } from "./use-cart-quote";

export function CartPageContent() {
  const cart = useCart();
  const { quote, issues, loading } = useCartQuote(true);
  const blocked = [...issues.values()].some((i) => i === "unavailable" || i === "sold_out");
  const currency = cart.lines[0]?.currency ?? "EGP";

  if (!cart.hydrated) {
    return <div className="skeleton" style={{ height: 240 }} aria-label="Loading your bag" />;
  }

  if (cart.lines.length === 0) return <EmptyBag />;

  return (
    <div className="cart-page">
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }} aria-busy={loading}>
        <AnimatePresence initial={false}>
          {cart.lines.map((line) => (
            <CartLineItem
              key={line.variantId}
              line={line}
              issue={issues.get(line.variantId)}
              onQuantity={(q) => cart.setQuantity(line.variantId, q)}
              onRemove={() => cart.remove(line.variantId)}
            />
          ))}
        </AnimatePresence>
      </ul>
      <aside className="summary-card" aria-label="Order summary">
        <h2 className="title-md">Summary</h2>
        {quote && !quote.ok && (
          <p className="alert" role="alert">
            We couldn&apos;t refresh prices just now. Final prices are confirmed when you place your order.
          </p>
        )}
        <CartTotals subtotalCents={cart.subtotalCents} settings={quote?.ok ? quote.settings : null} currency={currency} />
        {blocked ? (
          <span className="btn btn--block" aria-disabled="true">
            Remove unavailable items to continue
          </span>
        ) : (
          <Link href="/checkout" className="btn btn--block" data-testid="go-to-checkout">
            Checkout · pay on delivery
          </Link>
        )}
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          You&apos;ll pay in cash when your order arrives. No card details are ever requested.
        </p>
      </aside>
    </div>
  );
}
