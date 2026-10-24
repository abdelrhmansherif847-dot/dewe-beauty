"use client";

import Link from "next/link";
import { useState } from "react";
import { m } from "motion/react";
import { useCart } from "@/components/cart/cart-provider";
import { DEFAULT_MAX_QUANTITY } from "@/lib/cart/cart";
import type { ProductSummary } from "@/lib/catalog";

/**
 * Quick add on product cards. Single-variant products go straight to the bag;
 * products with shades or sizes send shoppers to choose one first.
 */
export function QuickAdd({
  product,
  variantName,
  variantPriceCents,
  swatchHex,
  currency,
}: {
  product: ProductSummary;
  variantName: string | null;
  variantPriceCents: number;
  swatchHex: string | null;
  currency: string;
}) {
  const cart = useCart();
  const [added, setAdded] = useState(false);

  if (product.totalStock <= 0) {
    return (
      <span className="btn btn--light btn--sm btn--block" aria-disabled="true">
        Sold out
      </span>
    );
  }

  if (product.variantCount > 1 || !product.defaultVariantId) {
    return (
      <Link href={`/products/${product.slug}`} className="btn btn--light btn--sm btn--block" tabIndex={-1} aria-hidden="true">
        Choose {product.categorySlug === "lips" || product.categorySlug === "makeup" ? "shade" : "size"}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="btn btn--light btn--sm btn--block"
      style={{ position: "relative", zIndex: 3 }}
      onClick={() => {
        cart.add({
          variantId: product.defaultVariantId!,
          quantity: 1,
          productSlug: product.slug,
          productName: product.name,
          brandName: product.brandName,
          variantName: variantName ?? "Standard",
          categorySlug: product.categorySlug,
          swatchHex,
          priceCents: variantPriceCents,
          currency,
          maxQuantity: Math.min(product.totalStock, DEFAULT_MAX_QUANTITY),
        });
        setAdded(true);
        setTimeout(() => setAdded(false), 1600);
      }}
      aria-label={`Add ${product.name} to bag`}
    >
      <m.span key={added ? "added" : "add"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        {added ? "Added ✓" : "Quick add"}
      </m.span>
    </button>
  );
}
