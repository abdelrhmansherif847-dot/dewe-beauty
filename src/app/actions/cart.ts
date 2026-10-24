"use server";

import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";
import { getStoreSettings, searchProducts, type ProductSummary, type StoreSettings } from "@/lib/catalog";

export type VariantQuote = {
  variantId: string;
  available: boolean;
  priceCents: number;
  stock: number;
  productSlug: string;
  productName: string;
  brandName: string;
  variantName: string;
  categorySlug: string | null;
  swatchHex: string | null;
};

export type CartQuote =
  | { ok: true; settings: StoreSettings; variants: VariantQuote[] }
  | { ok: false; reason: "not_configured" | "error" };

const idsSchema = z.array(z.uuid()).max(50);

/** Live prices and stock for the variants in a cart. Never cached. */
export async function quoteCart(variantIds: string[]): Promise<CartQuote> {
  const parsed = idsSchema.safeParse(variantIds);
  if (!parsed.success) return { ok: false, reason: "error" };

  const supabase = createPublicClient();
  if (!supabase) return { ok: false, reason: "not_configured" };
  const settings = await getStoreSettings();
  if (parsed.data.length === 0) return { ok: true, settings, variants: [] };

  const { data, error } = await supabase
    .from("product_variants")
    .select(
      "id, name, price_cents, stock, swatch_hex, product:products!inner(slug, name, brand:brands!inner(name), category:categories(slug))",
    )
    .in("id", parsed.data);
  if (error) return { ok: false, reason: "error" };

  const found = new Map(data.map((v) => [v.id, v]));
  const variants = parsed.data.map((id): VariantQuote => {
    const v = found.get(id);
    if (!v) {
      return {
        variantId: id,
        available: false,
        priceCents: 0,
        stock: 0,
        productSlug: "",
        productName: "",
        brandName: "",
        variantName: "",
        categorySlug: null,
        swatchHex: null,
      };
    }
    return {
      variantId: id,
      available: v.stock > 0,
      priceCents: v.price_cents,
      stock: v.stock,
      productSlug: v.product.slug,
      productName: v.product.name,
      brandName: v.product.brand.name,
      variantName: v.name,
      categorySlug: v.product.category?.slug ?? null,
      swatchHex: v.swatch_hex,
    };
  });
  return { ok: true, settings, variants };
}

/** Instant search suggestions for the header search panel. */
export async function suggestProducts(query: string): Promise<ProductSummary[]> {
  const q = String(query ?? "").trim().slice(0, 80);
  if (q.length < 2) return [];
  const result = await searchProducts({ q, limit: 6 });
  return result.ok ? result.data : [];
}
