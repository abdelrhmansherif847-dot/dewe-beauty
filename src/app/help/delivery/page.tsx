import type { Metadata } from "next";
import { formatMoney } from "@/lib/money";
import { getStoreSettings } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Delivery and cash on delivery",
  description: "How delivery and cash-on-delivery payment work at DEWÉ BEAUTY.",
};

export default async function DeliveryHelpPage() {
  const settings = await getStoreSettings();
  const fee =
    settings.deliveryFeeCents === 0 ? "currently no delivery fee" : `a delivery fee of ${formatMoney(settings.deliveryFeeCents, settings.currency)}`;

  return (
    <div className="container">
      <header className="page-head">
        <p className="eyebrow">Help</p>
        <h1 className="page-head__title">Delivery and payment</h1>
      </header>
      <div className="prose">
        <p className="lede">Every DEWÉ order is paid in cash when it is delivered. You never enter card details on this site.</p>

        <h2>How cash on delivery works</h2>
        <p>
          Place your order with your delivery address and a mobile number. When the courier hands over your parcel, you
          pay the total shown on your order confirmation in cash.
        </p>
        <p>
          Prices and stock are checked by our system at the moment you place the order, so the total on your
          confirmation is the amount due.
        </p>

        <h2>Delivery fees</h2>
        <p>
          There is {fee}
          {settings.freeDeliveryThresholdCents !== null
            ? `, and delivery is free on orders of ${formatMoney(settings.freeDeliveryThresholdCents, settings.currency)} or more`
            : ""}
          . The fee always appears in your bag and at checkout before you confirm.
        </p>

        <div className="note" style={{ marginTop: "2rem" }}>
          <span aria-hidden="true">●</span>
          <span>
            Placeholder: delivery areas, timings, the returns policy and contact channels will be published here by
            DEWÉ BEAUTY before launch.
          </span>
        </div>

        <h2 id="returns">Returns</h2>
        <p>Our returns policy will be published here before launch.</p>

        <h2 id="contact">Contact us</h2>
        <p>Customer support contact details will be published here before launch.</p>
      </div>
    </div>
  );
}
