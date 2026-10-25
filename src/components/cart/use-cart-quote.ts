"use client";

import { useEffect, useMemo, useState } from "react";
import { quoteCart, type CartQuote, type VariantQuote } from "@/app/actions/cart";
import { useCart } from "./cart-provider";

export type LineIssue = "unavailable" | "sold_out" | "reduced" | "price_changed";

/**
 * Refreshes live price and stock for the bag whenever its contents change and
 * `active` is true, then folds the results back into the cart.
 */
export function useCartQuote(active: boolean) {
  const { lines, sync, hydrated } = useCart();
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const key = useMemo(() => lines.map((l) => l.variantId).sort().join(","), [lines]);

  useEffect(() => {
    if (!active || !hydrated) return;
    let cancelled = false;
    const ids = key ? key.split(",") : [];
    // Defer so the state update is not synchronous within the effect body.
    const start = setTimeout(() => setLoading(true), 0);
    quoteCart(ids)
      .then((result) => {
        if (cancelled) return;
        setQuote(result);
        if (result.ok) {
          sync(
            result.variants.map((v) => ({
              variantId: v.variantId,
              priceCents: v.priceCents,
              maxQuantity: v.available ? Math.min(v.stock, result.settings.maxQuantityPerItem) : 0,
            })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setQuote({ ok: false, reason: "error" });
      })
      .finally(() => {
        clearTimeout(start);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
    // sync is stable enough for our purpose; key captures content changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, hydrated, key]);

  const byVariant = useMemo(() => {
    const map = new Map<string, VariantQuote>();
    if (quote?.ok) for (const v of quote.variants) map.set(v.variantId, v);
    return map;
  }, [quote]);

  const issues = useMemo(() => {
    const map = new Map<string, LineIssue>();
    for (const line of lines) {
      const q = byVariant.get(line.variantId);
      if (!q) continue;
      if (!q.productSlug) map.set(line.variantId, "unavailable");
      else if (q.stock <= 0) map.set(line.variantId, "sold_out");
      else if (line.quantity > q.stock) map.set(line.variantId, "reduced");
    }
    return map;
  }, [lines, byVariant]);

  return { quote, loading, issues, byVariant };
}

export const ISSUE_COPY: Record<LineIssue, string> = {
  unavailable: "This item is no longer available. Please remove it to continue.",
  sold_out: "Sold out since you added it. Please remove it to continue.",
  reduced: "Only a few left, so we lowered the quantity.",
  price_changed: "The price has been updated.",
};
