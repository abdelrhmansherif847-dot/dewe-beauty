import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { PlaceholderTag, ProductArt } from "@/components/art/product-art";
import type { ProductSummary } from "@/lib/catalog";
import { formatMoney, formatPriceRange } from "@/lib/money";
import { stockLevel } from "@/lib/stock";
import { QuickAdd } from "./quick-add";

const CARD_BACKGROUNDS = ["#F9E1E3", "#FBE9E1", "#F7DCCF", "#F6E6D6"];

export function ProductCard({
  product,
  currency = "EGP",
  index = 0,
  instance,
}: {
  product: ProductSummary;
  currency?: string;
  index?: number;
  instance?: string;
}) {
  const level = stockLevel(product.totalStock);
  const onSale = product.compareAtCents !== null && product.variantCount === 1;
  const bg = CARD_BACKGROUNDS[product.slug.length % CARD_BACKGROUNDS.length];

  return (
    <article
      className="product-card"
      data-reveal
      style={{ "--reveal-index": index % 4, "--card-bg": bg } as CSSProperties}
      data-testid="product-card"
    >
      <div className="product-card__media">
        <div className="product-card__badges">
          {level === "out" && <span className="badge badge--soldout">Sold out</span>}
          {level === "low" && <span className="badge badge--low">Low stock</span>}
          {onSale && level !== "out" && <span className="badge badge--sale">Offer</span>}
          {product.isSample && <span className="badge badge--sample">Sample product</span>}
        </div>
        {product.imageUrl && !product.imageIsPlaceholder ? (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            fill
            sizes="(max-width: 560px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <>
            <ProductArt
              slug={product.slug}
              name={product.name}
              brandName={product.brandName}
              categorySlug={product.categorySlug}
              instance={instance}
            />
            <PlaceholderTag />
          </>
        )}
        <div className="product-card__quick">
          <QuickAdd
            product={product}
            variantName={product.defaultVariantName}
            variantPriceCents={product.minPriceCents}
            swatchHex={product.defaultVariantSwatch}
            currency={currency}
          />
        </div>
      </div>
      <div className="product-card__body">
        <p className="product-card__brand">{product.brandName}</p>
        <h3 className="product-card__name">
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        <p className="product-card__price">
          <span>{formatPriceRange(product.minPriceCents, product.maxPriceCents, currency)}</span>
          {onSale && <span className="price-compare">{formatMoney(product.compareAtCents!, currency)}</span>}
        </p>
        {product.variantCount > 1 && (
          <p className="muted" style={{ fontSize: "0.8rem" }}>
            {product.variantCount} {product.categorySlug === "lips" || product.categorySlug === "makeup" ? "shades" : "sizes"}
          </p>
        )}
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  currency,
  instance,
}: {
  products: ProductSummary[];
  currency?: string;
  instance?: string;
}) {
  return (
    <div className="product-grid">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} currency={currency} index={i} instance={instance} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="product-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton" />
          <div className="skeleton" style={{ height: 12, width: "40%" }} />
          <div className="skeleton" style={{ height: 18, width: "80%" }} />
          <div className="skeleton" style={{ height: 14, width: "30%" }} />
        </div>
      ))}
    </div>
  );
}
