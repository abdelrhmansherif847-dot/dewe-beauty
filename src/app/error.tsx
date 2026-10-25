"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container empty" style={{ minHeight: "50vh" }} role="alert">
      <p className="eyebrow">Something went wrong</p>
      <h1>We couldn&apos;t load this page</h1>
      <p>Your bag is saved on this device. Please try again in a moment.</p>
      <div className="cluster" style={{ justifyContent: "center" }}>
        <button type="button" className="btn" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn btn--ghost">
          Home
        </Link>
      </div>
      {error.digest && <p className="muted" style={{ fontSize: "0.8rem" }}>Reference: {error.digest}</p>}
    </div>
  );
}
