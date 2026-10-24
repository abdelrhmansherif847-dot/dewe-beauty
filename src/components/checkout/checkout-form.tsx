"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { placeOrder, type CheckoutState } from "@/app/checkout/actions";
import { CartTotals } from "@/components/cart/cart-summary";
import { useCart } from "@/components/cart/cart-provider";
import { EmptyBag } from "@/components/cart/empty-bag";
import { ISSUE_COPY, useCartQuote } from "@/components/cart/use-cart-quote";
import { formatMoney } from "@/lib/money";

type Defaults = { customer_name: string; phone: string };

function Field({
  name,
  label,
  error,
  defaultValue,
  autoComplete,
  type = "text",
  required = true,
  span = false,
  hint,
}: {
  name: string;
  label: string;
  error?: string;
  defaultValue?: string;
  autoComplete?: string;
  type?: string;
  required?: boolean;
  span?: boolean;
  hint?: string;
}) {
  const id = `f-${name}`;
  return (
    <div className={`field${span ? " span-2" : ""}`}>
      <label htmlFor={id}>
        {label}
        {!required && <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}> (optional)</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        className="input"
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
      {hint && !error && (
        <span id={`${id}-hint`} className="field__hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="field__error">
          {error}
        </span>
      )}
    </div>
  );
}

export function CheckoutForm({ defaults, email }: { defaults: Defaults; email: string }) {
  const cart = useCart();
  const router = useRouter();
  const { quote, issues } = useCartQuote(true);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(placeOrder, { status: "idle" });

  useEffect(() => {
    if (state.status === "success") {
      cart.clear();
      router.replace(`/orders/${state.orderId}?placed=1`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!cart.hydrated) return <div className="skeleton" style={{ height: 320 }} aria-label="Loading checkout" />;
  if (cart.lines.length === 0 && state.status !== "success") {
    return <EmptyBag title="Your bag is empty" />;
  }

  const blocked = [...issues.values()].some((i) => i === "unavailable" || i === "sold_out");
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const currency = cart.lines[0]?.currency ?? "EGP";
  const items = JSON.stringify(cart.lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity })));

  return (
    <form action={formAction} className="checkout" noValidate data-testid="checkout-form">
      <input type="hidden" name="items" value={items} />
      <input type="hidden" name="idempotency_key" value={idempotencyKey} />

      <div className="stack" style={{ "--stack-gap": "2rem" } as React.CSSProperties}>
        {state.status === "error" && (
          <div className="alert" role="alert" data-testid="checkout-error">
            {state.message}
          </div>
        )}

        <section className="panel stack" aria-labelledby="contact-h">
          <h2 id="contact-h" className="title-md">
            Delivery details
          </h2>
          <p className="muted">Signed in as {email}. We&apos;ll call this number when your courier is on the way.</p>
          <div className="form-grid">
            <Field name="customer_name" label="Full name" autoComplete="name" defaultValue={defaults.customer_name} error={fieldErrors.customer_name} span />
            <Field name="phone" label="Mobile number" type="tel" autoComplete="tel" defaultValue={defaults.phone} error={fieldErrors.phone} span hint="Digits, spaces and a leading + only." />
            <Field name="address_line1" label="Street address" autoComplete="address-line1" error={fieldErrors.address_line1} span />
            <Field name="address_line2" label="Apartment, floor, landmark" autoComplete="address-line2" required={false} span />
            <Field name="city" label="City" autoComplete="address-level2" error={fieldErrors.city} />
            <Field name="region" label="Area or governorate" autoComplete="address-level1" required={false} />
            <div className="field span-2">
              <label htmlFor="f-notes">
                Delivery notes <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea id="f-notes" name="notes" className="textarea" maxLength={500} />
            </div>
          </div>
        </section>

        <section className="panel stack" aria-labelledby="pay-h">
          <h2 id="pay-h" className="title-md">
            Payment
          </h2>
          <div className="pay-method">
            <span className="pay-method__radio" aria-hidden="true" />
            <div>
              <p style={{ fontWeight: 700 }}>Cash on delivery</p>
              <p className="muted" style={{ fontSize: "0.9rem" }}>
                Pay the courier in cash when your order arrives. This is the only payment method for now.
              </p>
            </div>
          </div>
        </section>
      </div>

      <aside className="summary-card" aria-label="Order summary">
        <h2 className="title-md">Your order</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }} className="stack">
          {cart.lines.map((l) => (
            <li key={l.variantId} style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
              <span>
                {l.productName}
                <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
                  {l.variantName} × {l.quantity}
                </span>
                {issues.get(l.variantId) && (
                  <span className="field__error" style={{ display: "block" }}>
                    {ISSUE_COPY[issues.get(l.variantId)!]}
                  </span>
                )}
                {state.status === "error" && state.variantId === l.variantId && (
                  <span className="field__error" style={{ display: "block" }}>
                    Not enough stock for this quantity.
                  </span>
                )}
              </span>
              <span className="product-card__price">{formatMoney(l.priceCents * l.quantity, l.currency)}</span>
            </li>
          ))}
        </ul>
        <CartTotals subtotalCents={cart.subtotalCents} settings={quote?.ok ? quote.settings : null} currency={currency} />
        <button type="submit" className="btn btn--block" disabled={pending || blocked} data-testid="place-order">
          {pending ? (
            <>
              <span className="spinner" aria-hidden="true" /> Placing your order…
            </>
          ) : (
            "Place order · pay on delivery"
          )}
        </button>
        {blocked && (
          <p className="field__error">Some items are no longer available. Update your bag to continue.</p>
        )}
        <p className="muted" style={{ fontSize: "0.82rem" }}>
          The final total is calculated by our system from current prices when you place the order.
        </p>
      </aside>
    </form>
  );
}
