import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { CheckIcon } from "@/components/ui/icons";
import { siteUrl } from "@/lib/env";
import { guestCookieName, guestTokenSchema } from "@/lib/guest-orders";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABEL, formatOrderDate, type OrderView } from "@/lib/orders";
import { formatEgMobile } from "@/lib/phone";
import { connection } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import { z } from "zod";

// Guest links carry their access key in the URL: never leak it as a referrer.
export const metadata: Metadata = { title: "Your order", robots: { index: false }, referrer: "no-referrer" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrderPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  // Per-visitor page: render at request time only (the session check reads the clock).
  await connection();
  const supabase = await createSessionClient();
  if (!supabase) notFound();
  const { data: auth } = await supabase.auth.getUser();

  // A customer's own order (RLS returns nothing for anyone else's).
  let order: OrderView | null = null;
  if (auth.user) {
    const { data } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
    order = data;
  }

  // A guest order needs its access key, from this browser's cookie or the
  // private link. The order id alone is never enough.
  let guestKey: string | null = null;
  if (!order) {
    const fromLink = typeof sp.key === "string" ? sp.key : undefined;
    const fromCookie = (await cookies()).get(guestCookieName(id))?.value;
    const candidate = guestTokenSchema.safeParse(fromLink ?? fromCookie);
    if (candidate.success) {
      const { data } = await supabase.rpc("get_guest_order", { p_order_id: id, p_access_token: candidate.data });
      if (data) {
        order = data as unknown as OrderView;
        guestKey = candidate.data;
      }
    }
  }

  if (!order) {
    if (!auth.user) redirect(`/account/sign-in?next=/orders/${id}`);
    notFound();
  }

  const justPlaced = sp.placed === "1";

  return (
    <div className="container section" style={{ paddingTop: "3rem" }}>
      <div className="stack" style={{ "--stack-gap": "2rem", maxWidth: 760, marginInline: "auto" } as React.CSSProperties}>
        <div className="stack" style={{ "--stack-gap": "1rem", alignItems: "center", textAlign: "center" } as React.CSSProperties}>
          {justPlaced && (
            <div className="success-mark" aria-hidden="true">
              <CheckIcon size={40} />
              <span className="dew" style={{ width: 18, height: 18, right: -4, top: 6 }} />
              <span className="dew" style={{ width: 10, height: 10, left: 4, bottom: 10, animationDelay: "200ms" }} />
            </div>
          )}
          <p className="eyebrow">Order #{order.order_number}</p>
          <h1 className="title-lg" data-testid="order-heading">
            {justPlaced ? "Thank you, your order is in" : `Order ${ORDER_STATUS_LABEL[order.status].toLowerCase()}`}
          </h1>
          <p className="muted" style={{ maxWidth: "52ch" }}>
            {justPlaced
              ? `Please have ${formatMoney(order.total_cents, order.currency)} ready in cash for the courier. We'll call ${formatEgMobile(order.phone)} to confirm.`
              : `Placed ${formatOrderDate(order.created_at)}. Payment: cash on delivery.`}
          </p>
          <span className="status-pill">{ORDER_STATUS_LABEL[order.status]}</span>
        </div>

        <section className="panel" aria-labelledby="items-h">
          <h2 id="items-h" className="title-md" style={{ marginBottom: "1rem" }}>
            Items
          </h2>
          <table className="order-table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Qty</th>
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.order_items.map((i) => (
                <tr key={i.id}>
                  <td>
                    <span className="product-card__brand" style={{ display: "block" }}>
                      {i.brand_name}
                    </span>
                    {i.product_name}
                    <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
                      {i.variant_name} · {formatMoney(i.unit_price_cents, order.currency)} each
                    </span>
                  </td>
                  <td>{i.quantity}</td>
                  <td>{formatMoney(i.line_total_cents, order.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="totals" style={{ marginTop: "1.5rem" }}>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatMoney(order.subtotal_cents, order.currency)}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{order.delivery_fee_cents === 0 ? "No delivery fee" : formatMoney(order.delivery_fee_cents, order.currency)}</dd>
            </div>
            <div className="totals__grand">
              <dt>Total due on delivery</dt>
              <dd data-testid="order-total">{formatMoney(order.total_cents, order.currency)}</dd>
            </div>
          </dl>
        </section>

        <section className="panel stack" aria-labelledby="ship-h">
          <h2 id="ship-h" className="title-md">
            Delivering to
          </h2>
          <address style={{ fontStyle: "normal" }} className="muted">
            {order.customer_name}
            <br />
            {order.address_line1}
            {order.address_line2 && (
              <>
                <br />
                {order.address_line2}
              </>
            )}
            <br />
            {[order.city, order.region].filter(Boolean).join(", ")}
            <br />
            <span dir="ltr">{formatEgMobile(order.phone)}</span>
          </address>
        </section>

        {guestKey && (
          <section className="panel stack" aria-labelledby="link-h" data-testid="guest-order-link">
            <h2 id="link-h" className="title-md">
              Your private order link
            </h2>
            <p className="muted">
              You checked out as a guest. This browser remembers the order; to check it from another device, save this
              link. Anyone with the link can see this order, so keep it to yourself.
            </p>
            <input
              className="input"
              readOnly
              aria-label="Private order link"
              value={`${siteUrl}/orders/${order.id}?key=${guestKey}`}
              dir="ltr"
            />
          </section>
        )}

        <div className="cluster" style={{ justifyContent: "center" }}>
          {!guestKey && (
            <Link href="/account" className="btn btn--ghost">
              All orders
            </Link>
          )}
          <Link href="/shop" className="btn">
            Keep shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
