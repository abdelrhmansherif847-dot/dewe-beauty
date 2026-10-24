import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StoreNotice } from "@/components/ui/store-notice";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABEL, formatOrderDate } from "@/lib/orders";
import { connection } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function AccountPage() {
  // Per-visitor page: render at request time only (the session check reads the clock).
  await connection();
  const supabase = await createSessionClient();
  if (!supabase) {
    return (
      <div className="container section">
        <StoreNotice reason="not_configured" />
      </div>
    );
  }
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/account/sign-in?next=/account");

  const [{ data: profile }, { data: orders }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle(),
    supabase
      .from("orders")
      .select("id, order_number, status, total_cents, currency, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="container">
      <header className="page-head cluster" style={{ justifyContent: "space-between" }}>
        <div className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
          <p className="eyebrow">Your account</p>
          <h1 className="page-head__title">Hello{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
          <p className="muted">{data.user.email}</p>
        </div>
        <form action={signOut}>
          <button type="submit" className="btn btn--ghost">
            Sign out
          </button>
        </form>
      </header>

      <section className="panel" aria-labelledby="orders-h">
        <h2 id="orders-h" className="title-md" style={{ marginBottom: "1rem" }}>
          Your orders
        </h2>
        {orders && orders.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table className="order-table">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Placed</th>
                  <th scope="col">Status</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/orders/${o.id}`}>#{o.order_number}</Link>
                    </td>
                    <td>{formatOrderDate(o.created_at)}</td>
                    <td>
                      <span className="status-pill">{ORDER_STATUS_LABEL[o.status]}</span>
                    </td>
                    <td>{formatMoney(o.total_cents, o.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty" style={{ padding: "2rem 0" }}>
            <p>You haven&apos;t placed an order yet.</p>
            <Link href="/shop" className="btn">
              Start shopping
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
