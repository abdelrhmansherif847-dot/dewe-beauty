import Link from "next/link";
import { Wordmark } from "./wordmark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Wordmark />
            <p className="site-footer__tagline">Your everyday glow</p>
            <p className="arabic" lang="ar" style={{ marginTop: "0.5rem", fontSize: "1.25rem" }}>
              نضارتك. لمعتك. إنتِ.
            </p>
          </div>
          <nav aria-label="Shop">
            <h2>Shop</h2>
            <ul>
              <li><Link href="/shop">Shop all</Link></li>
              <li><Link href="/shop?category=skincare">Skincare</Link></li>
              <li><Link href="/shop?category=makeup">Makeup</Link></li>
              <li><Link href="/shop?category=lips">Lips</Link></li>
              <li><Link href="/brands">Brands</Link></li>
            </ul>
          </nav>
          <nav aria-label="Help">
            <h2>Help</h2>
            <ul>
              <li><Link href="/help/delivery">Delivery and cash on delivery</Link></li>
              <li><Link href="/help/delivery#returns">Returns</Link></li>
              <li><Link href="/help/delivery#contact">Contact us</Link></li>
            </ul>
          </nav>
          <nav aria-label="Account">
            <h2>Account</h2>
            <ul>
              <li><Link href="/account">Your orders</Link></li>
              <li><Link href="/account/sign-in">Sign in</Link></li>
              <li><Link href="/cart">Your bag</Link></li>
            </ul>
          </nav>
        </div>
        <div className="site-footer__bottom">
          <span>© DEWÉ BEAUTY. All rights reserved.</span>
          <span>Payment: cash on delivery only.</span>
        </div>
      </div>
    </footer>
  );
}
