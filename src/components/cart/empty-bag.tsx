import Link from "next/link";

/** Empty state with the brand's dew motif: three drops settle once. */
export function EmptyBag({ onNavigate, title = "Your bag is waiting for its first glow" }: { onNavigate?: () => void; title?: string }) {
  return (
    <div className="empty" data-testid="empty-bag">
      <div className="empty__art" aria-hidden="true">
        <span className="dew" style={{ width: 54, height: 54, left: 30, top: 34, animationDelay: "80ms" }} />
        <span className="dew" style={{ width: 26, height: 26, left: 82, top: 16, animationDelay: "260ms" }} />
        <span className="dew" style={{ width: 16, height: 16, left: 14, top: 86, animationDelay: "420ms" }} />
      </div>
      <h2>{title}</h2>
      <p>Explore skincare, colour and fragrance from the brands we carry. Everything is paid in cash when it arrives.</p>
      <Link href="/shop" className="btn" onClick={onNavigate}>
        Start shopping
      </Link>
    </div>
  );
}
