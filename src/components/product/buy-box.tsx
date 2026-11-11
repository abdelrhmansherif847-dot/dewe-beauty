"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { m } from "motion/react";
import { useCart } from "@/components/cart/cart-provider";
import { CheckIcon } from "@/components/ui/icons";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import type { ProductDetail, StoreSettings } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { stockLabel, stockLevel } from "@/lib/stock";
import { ProductGallery } from "./product-gallery";

/**
 * Gallery and purchase panel share the selected variant, so choosing a shade
 * re-tints the imagery. Server data is the source of truth; this component
 * only decides what the shopper wants.
 */
export function ProductPurchase({
  product,
  settings,
  children,
}: {
  product: ProductDetail;
  settings: StoreSettings;
  children?: React.ReactNode;
}) {
  const cart = useCart();
  const firstAvailable = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstAvailable.id);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const variant = product.variants.find((v) => v.id === variantId) ?? firstAvailable;
  const level = stockLevel(variant.stock);
  const max = Math.max(1, Math.min(variant.stock, settings.maxQuantityPerItem));
  const qty = Math.min(quantity, max);
  const isShade = product.variants.some((v) => v.swatchHex);
  const single = product.variants.length === 1 ? product.variants[0] : null;
  const singleLabel = single ? factLabel(single.name, single.swatchHex, product.category?.slug ?? null) : null;
  // Display only: the same figures the price row already shows.
  const savingCents =
    variant.compareAtCents !== null && variant.compareAtCents > variant.priceCents
      ? variant.compareAtCents - variant.priceCents
      : 0;
  const onOffer = savingCents > 0 && level !== "out";
  const [titleLead, titleAccent] = splitTitle(product.name);

  useEffect(() => {
    const el = buttonRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const add = () => {
    if (level === "out") return;
    cart.add({
      variantId: variant.id,
      quantity: qty,
      productSlug: product.slug,
      productName: product.name,
      brandName: product.brand.name,
      variantName: variant.name,
      categorySlug: product.category?.slug ?? null,
      swatchHex: variant.swatchHex,
      priceCents: variant.priceCents,
      currency: settings.currency,
      maxQuantity: max,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

  const addLabel = level === "out" ? "Sold out" : justAdded ? "Added to bag" : "Add to bag";

  return (
    <div className="pdp">
      <ProductGallery
        slug={product.slug}
        name={product.name}
        brandName={product.brand.name}
        categorySlug={product.category?.slug ?? null}
        tint={variant.swatchHex}
        images={product.images}
      />

      <div className="buy-box">
        <div className="pdp-identity">
          <div className="pdp-meta">
            <p className="pdp-eyebrow">
              <Link href={`/brands/${product.brand.slug}`} className="pdp-eyebrow__brand">
                {product.brand.name}
              </Link>
              {product.category && (
                <>
                  <span className="pdp-eyebrow__sep" aria-hidden="true">
                    ·
                  </span>
                  <span className="pdp-eyebrow__category">{product.category.name}</span>
                </>
              )}
            </p>
            {/* Same badge rules as the product card, applied to the chosen variant. */}
            <div className="pdp-badges" data-testid="pdp-badges">
              {level === "out" && <span className="badge badge--soldout">Sold out</span>}
              {level === "low" && <span className="badge badge--low">Low stock</span>}
              {onOffer && <span className="badge badge--sale">Offer</span>}
              {product.isSample && <span className="badge badge--sample">Sample product</span>}
            </div>
          </div>
          <h1 className="buy-box__title pdp-title">
            {titleAccent ? (
              <>
                {titleLead} <em>{titleAccent}</em>
              </>
            ) : (
              product.name
            )}
          </h1>
          {product.shortDescription && <p className="pdp-lede">{product.shortDescription}</p>}
        </div>

        <div className="buy-box__price pdp-price" aria-live="polite" aria-atomic="true">
          <span className="pdp-price__now">
            <span className="visually-hidden">{variant.compareAtCents ? "Current price " : "Price "}</span>
            <span data-testid="pdp-price">{formatMoney(variant.priceCents, settings.currency)}</span>
          </span>
          {variant.compareAtCents && (
            <span className="price-compare pdp-price__was">
              <span className="visually-hidden">Original price </span>
              {formatMoney(variant.compareAtCents, settings.currency)}
            </span>
          )}
          {onOffer && (
            <span className="pdp-price__saving" data-testid="pdp-saving">
              Save {formatMoney(savingCents, settings.currency)}
            </span>
          )}
        </div>

        {single && singleLabel && (
          <p className="pdp-fact" data-testid="pdp-variant-fact">
            <span className="pdp-fact__label">{singleLabel}:</span>{" "}
            {single.swatchHex && (
              <span className="swatch-dot pdp-fact__swatch" style={{ background: single.swatchHex }} aria-hidden="true" />
            )}
            <span className="pdp-fact__value">{single.name}</span>
          </p>
        )}

        {product.variants.length > 1 && (
          <fieldset className="filter-group">
            <legend>
              {isShade ? "Shade" : "Size"}: <span style={{ textTransform: "none", letterSpacing: 0 }}>{variant.name}</span>
            </legend>
            <div className="variant-options" role="radiogroup" aria-label={isShade ? "Choose a shade" : "Choose a size"}>
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={v.id === variant.id}
                  data-soldout={v.stock <= 0}
                  className="variant-option"
                  onClick={() => {
                    setVariantId(v.id);
                    setQuantity(1);
                  }}
                  aria-label={`${v.name}${v.stock <= 0 ? ", sold out" : ""}`}
                >
                  {v.swatchHex && <span className="swatch-dot" style={{ background: v.swatchHex }} aria-hidden="true" />}
                  <span className="variant-option__label">{v.name}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <p className="stock-line" data-level={level} data-testid="stock-line">
          <span className="stock-line__dot" aria-hidden="true" />
          {stockLabel(variant.stock)}
        </p>

        <div className="buy-row">
          {level !== "out" && (
            <QuantityStepper value={qty} max={max} onChange={(n) => setQuantity(Math.max(1, Math.min(n, max)))} label="Quantity" />
          )}
          <button
            ref={buttonRef}
            type="button"
            className="btn"
            onClick={add}
            disabled={level === "out"}
            data-testid="add-to-bag"
          >
            <m.span
              key={addLabel}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              {justAdded && <CheckIcon size={18} />}
              {addLabel}
            </m.span>
          </button>
        </div>

        <p className="pdp-reassure">
          <span className="pdp-reassure__mark" aria-hidden="true" />
          <span>Pay in cash when your order arrives. Prices and stock are confirmed again when you place the order.</span>
        </p>

        {children}
      </div>

      {level !== "out" && (
        <div className="sticky-buy" data-visible={showSticky}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.name}</p>
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              {variant.name} · {formatMoney(variant.priceCents, settings.currency)}
            </p>
          </div>
          <button type="button" className="btn btn--sm" onClick={add}>
            {justAdded ? "Added" : "Add to bag"}
          </button>
        </div>
      )}
    </div>
  );
}

const MEASURE = /^\d+(?:[.,]\d+)?\s*(?:ml|l|g|kg|oz|fl\.?\s?oz)$/i;

/**
 * How a lone variant is described. Swatches and shade-led categories read as
 * a shade, measured amounts as a size; anything else gets a neutral label so
 * the page never claims more than the data says.
 */
function factLabel(name: string, swatchHex: string | null, categorySlug: string | null): string {
  if (swatchHex) return "Shade";
  if (MEASURE.test(name.trim())) return "Size";
  if (categorySlug === "lips" || categorySlug === "makeup") return "Shade";
  return "Option";
}

/** The last word takes the editorial italic; the name itself is unchanged. */
function splitTitle(name: string): [string, string | null] {
  const i = name.trim().lastIndexOf(" ");
  if (i <= 0) return [name, null];
  return [name.slice(0, i), name.slice(i + 1)];
}
