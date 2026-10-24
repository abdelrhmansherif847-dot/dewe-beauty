import type { Metadata } from "next";
import { CartPageContent } from "@/components/cart/cart-page-content";

export const metadata: Metadata = { title: "Your bag" };

export default function CartPage() {
  return (
    <div className="container">
      <header className="page-head">
        <p className="eyebrow">Your bag</p>
        <h1 className="page-head__title">Ready when you are</h1>
      </header>
      <CartPageContent />
    </div>
  );
}
