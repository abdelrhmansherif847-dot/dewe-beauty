"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { placeOrder, type CheckoutState } from "@/app/checkout/actions";
import { CartTotals } from "@/components/cart/cart-summary";
import { useCart } from "@/components/cart/cart-provider";
import { EmptyBag } from "@/components/cart/empty-bag";
import { ISSUE_COPY, useCartQuote } from "@/components/cart/use-cart-quote";
import type { DeliveryZone } from "@/lib/catalog";
import { createGuestToken } from "@/lib/guest-orders";
import { formatMoney } from "@/lib/money";
import { PHONE_HINT } from "@/lib/phone";
import { keepFieldsOnSubmit } from "@/components/ui/use-keep-fields";

type Defaults = { customer_name: string; phone: string; email: string };

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

export function CheckoutForm({
  mode,
  zones,
  defaults,
}: {
  mode: "account" | "guest";
  zones: DeliveryZone[];
  defaults: Defaults;
}) {
  const cart = useCart();
  const router = useRouter();
  const { quote, issues } = useCartQuote(true);
  // Both stay fixed for this form, so a retried or double submission maps to
  // the same order. The token is the guest's private key to their order.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [accessToken] = useState(() => (mode === "guest" ? createGuestToken() : ""));
  const [zoneCode, setZoneCode] = useState("");
  const zone = zones.find((z) => z.code === zoneCode);
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
    <form onSubmit={keepFieldsOnSubmit(formAction)} className="checkout" noValidate data-testid="checkout-form">
      <input type="hidden" name="items" value={items} />
      <input type="hidden" name="idempotency_key" value={idempotencyKey} />
      <input type="hidden" name="mode" value={mode} />
      {mode === "guest" && <input type="hidden" name="access_token" value={accessToken} />}

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
          <p className="muted">
            {mode === "guest"
              ? "No account needed. We'll call this number to confirm your order and when the courier is on the way."
              : "We'll call this number to confirm your order and when the courier is on the way."}
          </p>
          <div className="form-grid">
            <Field name="customer_name" label="Full name" autoComplete="name" defaultValue={defaults.customer_name} error={fieldErrors.customer_name} span />
            <Field name="phone" label="Mobile number" type="tel" autoComplete="tel" defaultValue={defaults.phone} error={fieldErrors.phone} span hint={PHONE_HINT} />
            <Field
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              defaultValue={defaults.email}
              error={fieldErrors.email}
              required={false}
              span
              hint="Not required. We don't send order emails yet."
            />
            <div className="field span-2">
              <label htmlFor="f-zone">Governorate</label>
              <select
                id="f-zone"
                name="zone"
                className="select"
                required
                value={zoneCode}
                onChange={(e) => setZoneCode(e.target.value)}
                aria-invalid={fieldErrors.zone || (state.status === "error" && state.code === "unsupported_location") ? true : undefined}
                aria-describedby={fieldErrors.zone ? "f-zone-error" : undefined}
              >
                <option value="" disabled>
                  Choose your governorate
                </option>
                {zones.map((z) => (
                  <option key={z.code} value={z.code}>
                    {z.name} · {z.nameAr}
                  </option>
                ))}
              </select>
              {zones.length === 0 && <span className="field__error">Delivery areas are not available right now.</span>}
              {fieldErrors.zone && (
                <span id="f-zone-error" className="field__error">
                  {fieldErrors.zone}
                </span>
              )}
            </div>
            <Field name="city" label="City or area" autoComplete="address-level2" error={fieldErrors.city} span />
            <Field name="address_line1" label="Street address" autoComplete="address-line1" error={fieldErrors.address_line1} span />
            <Field name="address_line2" label="Apartment, floor, landmark" autoComplete="address-line2" required={false} span />
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
        <CartTotals
          subtotalCents={cart.subtotalCents}
          settings={quote?.ok ? quote.settings : null}
          currency={currency}
          zone={zone ? { feeCents: zone.deliveryFeeCents } : "none"}
        />
        <button type="submit" className="btn btn--block" disabled={pending || blocked || zones.length === 0} data-testid="place-order">
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
