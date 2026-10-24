import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container empty" style={{ minHeight: "50vh" }}>
      <div className="empty__art" aria-hidden="true">
        <span className="dew" style={{ width: 54, height: 54, left: 30, top: 34 }} />
        <span className="dew" style={{ width: 20, height: 20, left: 88, top: 22, animationDelay: "200ms" }} />
      </div>
      <p className="eyebrow">404</p>
      <h1>This page has evaporated</h1>
      <p>The link may be old, or the page has moved. Let&apos;s get you back to the glow.</p>
      <div className="cluster" style={{ justifyContent: "center" }}>
        <Link href="/" className="btn">
          Home
        </Link>
        <Link href="/shop" className="btn btn--ghost">
          Shop all
        </Link>
      </div>
    </div>
  );
}
