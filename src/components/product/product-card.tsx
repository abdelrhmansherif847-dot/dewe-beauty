import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { PlaceholderTag, ProductArt } from "@/components/art/product-art";
import type { ProductSummary } from "@/lib/catalog";
import { formatMoney, formatPriceRange } from "@/lib/money";
import { stockLevel } from "@/lib/stock";
import { QuickAdd } from "./quick-add";

const CARD_BACKGROUNDS = ["#F9E1E3", "#FBE9E1", "#F7DCCF", "#F6E6D6"];

/** "default" everywhere; "collection" is the Shop All presentation. */
export type ProductCardVariant = "default" | "collection";

const IMAGE_SIZES: Record<ProductCardVariant, string> = {
  default: "(max-width: 560px) 50vw, (max-width: 1200px) 33vw, 25vw",
  collection: "(max-width: 599px) 50vw, (max-width: 1199px) 33vw, 360px",
};

export function ProductCard({
  product,
  currency = "EGP",
  index = 0,
  instance,
  variant = "default",
}: {
  product: ProductSummary;
  currency?: string;
  index?: number;
  instance?: string;
  variant?: ProductCardVariant;
}) {
  const level = stockLevel(product.totalStock);
  const onSale = product.compareAtCents !== null && product.variantCount === 1;
  const bg = CARD_BACKGROUNDS[product.slug.length % CARD_BACKGROUNDS.length];
  const collection = variant === "collection";
  const quickAdd = (
    <QuickAdd
      product={product}
      variantName={product.defaultVariantName}
      variantPriceCents={product.minPriceCents}
      swatchHex={product.defaultVariantSwatch}
      currency={currency}
      labelIncludesText={collection}
    />
  );
  const options =
    product.variantCount > 1
      ? `${product.variantCount} ${product.categorySlug === "lips" || product.categorySlug === "makeup" ? "shades" : "sizes"}`
      : null;

  return (
    <article
      className={collection ? "product-card product-card--collection" : "product-card"}
      data-reveal
      style={{ "--reveal-index": index % (collection ? 3 : 4), "--card-bg": bg } as CSSProperties}
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
            sizes={IMAGE_SIZES[variant]}
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
        {!collection && <div className="product-card__quick">{quickAdd}</div>}
      </div>
      {collection ? (
        <div className="product-card__body">
          <p className="product-card__brand">{product.brandName}</p>
          <h3 className="product-card__name">
            <Link href={`/products/${product.slug}`}>{product.name}</Link>
          </h3>
          <div className="product-card__meta">
            <p className="product-card__price">
              <span>{formatPriceRange(product.minPriceCents, product.maxPriceCents, currency)}</span>
              {onSale && <span className="price-compare">{formatMoney(product.compareAtCents!, currency)}</span>}
            </p>
            {(product.categoryName || options) && (
              <p className="product-card__detail">{[product.categoryName, options].filter(Boolean).join(" · ")}</p>
            )}
          </div>
          {/* Below the details rather than over the image, so it is visible on
              touch screens too (over the image it was clipped there). */}
          <div className="product-card__add">{quickAdd}</div>
        </div>
      ) : (
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
      )}
    </article>
  );
}

export function ProductGrid({
  products,
  currency,
  instance,
  variant = "default",
}: {
  products: ProductSummary[];
  currency?: string;
  instance?: string;
  variant?: ProductCardVariant;
}) {
  return (
    <div className={variant === "collection" ? "product-grid collection-grid" : "product-grid"}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} currency={currency} index={i} instance={instance} variant={variant} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8, variant = "default" }: { count?: number; variant?: ProductCardVariant }) {
  return (
    <div className={variant === "collection" ? "product-grid collection-grid" : "product-grid"} aria-hidden="true">
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
