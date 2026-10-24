"use client";

import Link from "next/link";
import { AnimatePresence } from "motion/react";
import { Drawer } from "@/components/ui/drawer";
import { CloseIcon } from "@/components/ui/icons";
import { useCart } from "./cart-provider";
import { CartLineItem } from "./cart-line-item";
import { CartTotals } from "./cart-summary";
import { EmptyBag } from "./empty-bag";
import { useCartQuote } from "./use-cart-quote";

export function CartDrawer() {
  const cart = useCart();
  const { quote, issues, loading } = useCartQuote(cart.isOpen);
  const currency = cart.lines[0]?.currency ?? (quote?.ok ? quote.settings.currency : "EGP");
  const blocked = [...issues.values()].some((i) => i === "unavailable" || i === "sold_out");

  return (
    <Drawer open={cart.isOpen} onClose={cart.close} label="Shopping bag">
      <div className="drawer__head">
        <h2 className="title-md">
          Your bag{" "}
          <span className="muted" style={{ fontSize: "1rem" }}>
            ({cart.count})
          </span>
        </h2>
        <button type="button" className="icon-btn" onClick={cart.close} aria-label="Close bag" data-autofocus>
          <CloseIcon />
        </button>
      </div>

      {cart.lines.length === 0 ? (
        <div className="drawer__body">
          <EmptyBag onNavigate={cart.close} />
        </div>
      ) : (
        <>
          <div className="drawer__body">
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }} aria-busy={loading}>
              <AnimatePresence initial={false}>
                {cart.lines.map((line) => (
                  <CartLineItem
                    key={line.variantId}
                    line={line}
                    issue={issues.get(line.variantId)}
                    onQuantity={(q) => cart.setQuantity(line.variantId, q)}
                    onRemove={() => cart.remove(line.variantId)}
                    onNavigate={cart.close}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </div>
          <div className="drawer__foot stack">
            <CartTotals
              subtotalCents={cart.subtotalCents}
              settings={quote?.ok ? quote.settings : null}
              currency={currency}
            />
            {blocked ? (
              <span className="btn btn--block" aria-disabled="true">
                Remove unavailable items to continue
              </span>
            ) : (
              <Link href="/checkout" className="btn btn--block" onClick={cart.close}>
                Checkout · pay on delivery
              </Link>
            )}
            <Link href="/cart" className="btn btn--ghost btn--block" onClick={cart.close}>
              View bag
            </Link>
          </div>
        </>
      )}
    </Drawer>
  );
}
