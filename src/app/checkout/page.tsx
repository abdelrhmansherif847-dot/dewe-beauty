import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { StoreNotice } from "@/components/ui/store-notice";
import { connection } from "next/server";
import { getDeliveryZones } from "@/lib/catalog";
import { createSessionClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CheckoutPage({ searchParams }: { searchParams: SearchParams }) {
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
  const [{ data }, sp, zones] = await Promise.all([supabase.auth.getUser(), searchParams, getDeliveryZones()]);
  const user = data.user;

  if (!user && sp.as !== "guest") return <CheckoutChoice />;

  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name, phone, email").eq("id", user.id).maybeSingle()
    : { data: null };

  return (
    <div className="container">
      <header className="page-head">
        <p className="eyebrow">{user ? "Checkout" : "Guest checkout"}</p>
        <h1 className="page-head__title">Almost glowing</h1>
      </header>
      <CheckoutForm
        mode={user ? "account" : "guest"}
        zones={zones}
        defaults={{
          customer_name: profile?.full_name ?? "",
          phone: profile?.phone ?? (user?.phone ? `+${user.phone}` : ""),
          email: profile?.email ?? "",
        }}
      />
    </div>
  );
}

function CheckoutChoice() {
  return (
    <div className="container section">
      <div className="auth-card stack" style={{ "--stack-gap": "1.5rem" } as React.CSSProperties}>
        <div className="stack" style={{ "--stack-gap": "0.5rem", textAlign: "center" } as React.CSSProperties}>
          <p className="eyebrow">Checkout</p>
          <h1 className="title-lg">How would you like to check out?</h1>
        </div>
        <div className="panel stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
          <h2 className="title-md">Continue as guest</h2>
          <p className="muted">No account and no email needed. Just your mobile number and delivery address.</p>
          <Link href="/checkout?as=guest" className="btn btn--block" data-testid="continue-as-guest">
            Continue as guest
          </Link>
        </div>
        <div className="panel stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
          <h2 className="title-md">Use your account</h2>
          <p className="muted">Sign in with your mobile number to see all your orders in one place.</p>
          <div className="cluster">
            <Link href="/account/sign-in?next=/checkout" className="btn btn--ghost">
              Sign in
            </Link>
            <Link href="/account/sign-in?mode=sign-up&next=/checkout" className="btn btn--ghost">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
