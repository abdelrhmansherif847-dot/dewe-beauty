import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { StoreNotice } from "@/components/ui/store-notice";
import { connection } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
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
  if (!data.user) redirect("/account/sign-in?next=/checkout");

  const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("id", data.user.id).maybeSingle();

  return (
    <div className="container">
      <header className="page-head">
        <p className="eyebrow">Checkout</p>
        <h1 className="page-head__title">Almost glowing</h1>
      </header>
      <CheckoutForm
        email={data.user.email ?? ""}
        defaults={{ customer_name: profile?.full_name ?? "", phone: profile?.phone ?? "" }}
      />
    </div>
  );
}
