import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { StoreNotice } from "@/components/ui/store-notice";
import { getBrands } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Brands",
  description: "The beauty brands available at DEWÉ BEAUTY.",
};

export default async function BrandsPage() {
  const brands = await getBrands();
  return (
    <div className="container">
      <header className="page-head">
        <p className="eyebrow">Brands</p>
        <h1 className="page-head__title">
          Houses we <em className="italic-accent">carry</em>
        </h1>
      </header>
      {brands.ok ? (
        <div className="brand-grid">
          {brands.data.map((b, i) => (
            <Link
              key={b.slug}
              href={`/brands/${b.slug}`}
              className="brand-cell"
              data-reveal
              style={{ "--reveal-index": i } as CSSProperties}
            >
              {b.isSample && (
                <span className="badge badge--sample" style={{ alignSelf: "flex-start" }}>
                  Sample brand
                </span>
              )}
              <span className="brand-cell__name">{b.name}</span>
              {b.tagline && <span className="muted">{b.tagline}</span>}
              <span className="brand-cell__arrow">Discover →</span>
            </Link>
          ))}
        </div>
      ) : (
        <StoreNotice reason={brands.reason} />
      )}
    </div>
  );
}
