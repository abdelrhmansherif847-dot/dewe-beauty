import Link from "next/link";

export function AnnouncementBar() {
  return (
    <div className="announcement" role="region" aria-label="Store announcement">
      <div className="announcement__inner">
        <span>Cash on delivery on every order</span>
        <span className="announcement__sep" aria-hidden="true" />
        <span className="hide-mobile">Your everyday glow</span>
        <span className="announcement__sep hide-mobile" aria-hidden="true" />
        <Link href="/help/delivery" className="hide-mobile">
          Delivery details
        </Link>
      </div>
    </div>
  );
}
