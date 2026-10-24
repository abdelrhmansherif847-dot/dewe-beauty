import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="container empty">
      <p className="eyebrow">Not available</p>
      <h1>This product isn&apos;t in the shop right now</h1>
      <p>It may have been retired or is not yet available. Here is everything we have today.</p>
      <Link href="/shop" className="btn">
        Browse the shop
      </Link>
    </div>
  );
}
