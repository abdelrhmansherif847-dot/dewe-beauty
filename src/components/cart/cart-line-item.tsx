"use client";

import Link from "next/link";
import { m } from "motion/react";
import { ProductArt } from "@/components/art/product-art";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import type { CartLine } from "@/lib/cart/cart";
import { formatMoney } from "@/lib/money";
import { ISSUE_COPY, type LineIssue } from "./use-cart-quote";

export function CartLineItem({
  line,
  issue,
  onQuantity,
  onRemove,
  onNavigate,
}: {
  line: CartLine;
  issue?: LineIssue;
  onQuantity: (q: number) => void;
  onRemove: () => void;
  onNavigate?: () => void;
}) {
  const blocked = issue === "unavailable" || issue === "sold_out";
  return (
    <m.li
      className="cart-line"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }}
      data-testid="cart-line"
    >
      <div className="cart-line__media">
        <ProductArt
          slug={line.productSlug}
          name={line.productName}
          brandName={line.brandName}
          categorySlug={line.categorySlug}
          tint={line.swatchHex}
          instance={`cart-${line.variantId}`}
          decorative
        />
      </div>
      <div>
        <div className="cart-line__top">
          <div>
            <p className="product-card__brand">{line.brandName}</p>
            <p className="cart-line__name">
              <Link href={`/products/${line.productSlug}`} onClick={onNavigate}>
                {line.productName}
              </Link>
            </p>
            <p className="cart-line__meta">{line.variantName}</p>
          </div>
          <p className="product-card__price">{formatMoney(line.priceCents * line.quantity, line.currency)}</p>
        </div>
        <div className="cart-line__bottom">
          {blocked ? (
            <span className="cart-line__meta">Unavailable</span>
          ) : (
            <QuantityStepper
              size="sm"
              value={line.quantity}
              max={Math.max(line.maxQuantity, 1)}
              onChange={onQuantity}
              label={`Quantity for ${line.productName}, ${line.variantName}`}
            />
          )}
          <button type="button" className="cart-line__remove" onClick={onRemove}>
            Remove
          </button>
        </div>
        {issue && <p className="cart-line__issue">{ISSUE_COPY[issue]}</p>}
      </div>
    </m.li>
  );
}
