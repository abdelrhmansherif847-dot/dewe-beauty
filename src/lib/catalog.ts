import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "./supabase/public";
import type { Tables } from "./supabase/database.types";

/*
 * Catalog reads. Everything here runs as the anonymous role, so results are
 * cached and shared between visitors. Stock shown from these reads can be up
 * to a minute old; checkout re-checks stock inside the database transaction,
 * and the cart refreshes live prices and stock before checkout.
 */

export const CATALOG_TAG = "catalog";

export type StoreSettings = {
  currency: string;
  deliveryFeeCents: number;
  freeDeliveryThresholdCents: number | null;
  codEnabled: boolean;
  maxQuantityPerItem: number;
};

export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  brandSlug: string;
  brandName: string;
  categorySlug: string | null;
  categoryName: string | null;
  minPriceCents: number;
  maxPriceCents: number;
  compareAtCents: number | null;
  totalStock: number;
  variantCount: number;
  defaultVariantId: string | null;
  defaultVariantName: string | null;
  defaultVariantSwatch: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  imageIsPlaceholder: boolean;
  isSample: boolean;
  isFeatured: boolean;
  tags: string[];
};

export type Variant = {
  id: string;
  sku: string;
  name: string;
  swatchHex: string | null;
  priceCents: number;
  compareAtCents: number | null;
  stock: number;
};

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  howToUse: string | null;
  ingredients: string | null;
  tags: string[];
  isSample: boolean;
  brand: { slug: string; name: string; tagline: string | null; isSample: boolean };
  category: { slug: string; name: string } | null;
  variants: Variant[];
  images: { id: string; url: string; alt: string; isPlaceholder: boolean }[];
};

export type Brand = {
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  isSample: boolean;
};

export type Category = { slug: string; name: string; description: string | null };

export type Collection = {
  slug: string;
  name: string;
  description: string | null;
  products: ProductSummary[];
};

export type CatalogResult<T> = { ok: true; data: T } | { ok: false; reason: "not_configured" | "error" };

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc" | "name";
export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name A–Z" },
];

export type ProductQuery = {
  q?: string;
  brand?: string;
  category?: string;
  inStock?: boolean;
  sort?: SortKey;
  limit?: number;
};

type ListingRow = Tables<"product_listing">;

function toSummary(row: ListingRow): ProductSummary | null {
  if (!row.id || !row.slug || !row.name || !row.brand_slug || !row.brand_name) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description,
    brandSlug: row.brand_slug,
    brandName: row.brand_name,
    categorySlug: row.category_slug,
    categoryName: row.category_name,
    minPriceCents: row.min_price_cents ?? 0,
    maxPriceCents: row.max_price_cents ?? row.min_price_cents ?? 0,
    compareAtCents: row.compare_at_cents,
    totalStock: row.total_stock ?? 0,
    variantCount: row.variant_count ?? 0,
    defaultVariantId: row.default_variant_id,
    defaultVariantName: row.default_variant_name,
    defaultVariantSwatch: row.default_variant_swatch,
    imageUrl: row.image_url,
    imageAlt: row.image_alt,
    imageIsPlaceholder: row.image_is_placeholder ?? true,
    isSample: row.is_sample ?? false,
    isFeatured: row.is_featured ?? false,
    tags: row.tags ?? [],
  };
}

function summaries(rows: ListingRow[] | null): ProductSummary[] {
  return (rows ?? []).map(toSummary).filter((p): p is ProductSummary => p !== null);
}

const DEFAULT_SETTINGS: StoreSettings = {
  currency: "EGP",
  deliveryFeeCents: 0,
  freeDeliveryThresholdCents: null,
  codEnabled: true,
  maxQuantityPerItem: 10,
};

export async function getStoreSettings(): Promise<StoreSettings> {
  "use cache";
  cacheTag(CATALOG_TAG, "settings");
  cacheLife("minutes");

  const supabase = createPublicClient();
  if (!supabase) return DEFAULT_SETTINGS;
  const { data, error } = await supabase.from("store_settings").select("*").maybeSingle();
  if (error || !data) return DEFAULT_SETTINGS;
  return {
    currency: data.currency,
    deliveryFeeCents: data.delivery_fee_cents,
    freeDeliveryThresholdCents: data.free_delivery_threshold_cents,
    codEnabled: data.cod_enabled,
    maxQuantityPerItem: data.max_quantity_per_item,
  };
}

export async function searchProducts(query: ProductQuery = {}): Promise<CatalogResult<ProductSummary[]>> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");

  const supabase = createPublicClient();
  if (!supabase) return { ok: false, reason: "not_configured" };
  const { data, error } = await supabase.rpc("search_products", {
    p_query: query.q?.slice(0, 80) || undefined,
    p_brand: query.brand || undefined,
    p_category: query.category || undefined,
    p_in_stock: query.inStock ?? false,
    p_sort: query.sort ?? "featured",
    p_limit: query.limit ?? 48,
  });
  if (error) {
    console.error("searchProducts failed", error.message);
    return { ok: false, reason: "error" };
  }
  return { ok: true, data: summaries(data) };
}

export async function getFeaturedProducts(limit = 8): Promise<CatalogResult<ProductSummary[]>> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");

  const supabase = createPublicClient();
  if (!supabase) return { ok: false, reason: "not_configured" };
  const { data, error } = await supabase
    .from("product_listing")
    .select("*")
    .eq("is_featured", true)
    .order("name")
    .limit(limit);
  if (error) {
    console.error("getFeaturedProducts failed", error.message);
    return { ok: false, reason: "error" };
  }
  return { ok: true, data: summaries(data) };
}

export async function getBrands(): Promise<CatalogResult<Brand[]>> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  const supabase = createPublicClient();
  if (!supabase) return { ok: false, reason: "not_configured" };
  const { data, error } = await supabase
    .from("brands")
    .select("slug, name, tagline, description, is_sample")
    .order("sort_order")
    .order("name");
  if (error) return { ok: false, reason: "error" };
  return {
    ok: true,
    data: data.map((b) => ({
      slug: b.slug,
      name: b.name,
      tagline: b.tagline,
      description: b.description,
      isSample: b.is_sample,
    })),
  };
}

export async function getBrand(slug: string): Promise<Brand | null> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("brands")
    .select("slug, name, tagline, description, is_sample")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  return {
    slug: data.slug,
    name: data.name,
    tagline: data.tagline,
    description: data.description,
    isSample: data.is_sample,
  };
}

export async function getCategories(): Promise<CatalogResult<Category[]>> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  const supabase = createPublicClient();
  if (!supabase) return { ok: false, reason: "not_configured" };
  const { data, error } = await supabase
    .from("categories")
    .select("slug, name, description")
    .order("sort_order")
    .order("name");
  if (error) return { ok: false, reason: "error" };
  return { ok: true, data };
}

export async function getCollection(slug: string): Promise<Collection | null> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");

  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data: collection } = await supabase
    .from("collections")
    .select("id, slug, name, description, collection_products(product_id, sort_order)")
    .eq("slug", slug)
    .maybeSingle();
  if (!collection) return null;

  const order = [...collection.collection_products].sort((a, b) => a.sort_order - b.sort_order);
  const ids = order.map((cp) => cp.product_id);
  const { data: rows } = ids.length
    ? await supabase.from("product_listing").select("*").in("id", ids)
    : { data: [] as ListingRow[] };
  const byId = new Map(summaries(rows).map((p) => [p.id, p]));

  return {
    slug: collection.slug,
    name: collection.name,
    description: collection.description,
    products: ids.map((id) => byId.get(id)).filter((p): p is ProductSummary => Boolean(p)),
  };
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheTag(CATALOG_TAG, `product:${slug}`);
  cacheLife("minutes");

  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("products")
    .select(
      `id, slug, name, short_description, description, how_to_use, ingredients, tags, is_sample,
       brand:brands!inner(slug, name, tagline, is_sample),
       category:categories(slug, name),
       variants:product_variants(id, sku, name, swatch_hex, price_cents, compare_at_cents, stock, sort_order),
       images:product_images(id, url, alt, is_placeholder, sort_order)`,
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!data || data.variants.length === 0) return null;

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    shortDescription: data.short_description,
    description: data.description,
    howToUse: data.how_to_use,
    ingredients: data.ingredients,
    tags: data.tags,
    isSample: data.is_sample,
    brand: {
      slug: data.brand.slug,
      name: data.brand.name,
      tagline: data.brand.tagline,
      isSample: data.brand.is_sample,
    },
    category: data.category ? { slug: data.category.slug, name: data.category.name } : null,
    variants: [...data.variants]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        swatchHex: v.swatch_hex,
        priceCents: v.price_cents,
        compareAtCents: v.compare_at_cents,
        stock: v.stock,
      })),
    images: [...data.images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({ id: i.id, url: i.url, alt: i.alt, isPlaceholder: i.is_placeholder })),
  };
}

export async function getRelatedProducts(brandSlug: string, excludeSlug: string): Promise<ProductSummary[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");

  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("product_listing")
    .select("*")
    .eq("brand_slug", brandSlug)
    .neq("slug", excludeSlug)
    .limit(4);
  return summaries(data);
}

export type DeliveryZone = {
  code: string;
  name: string;
  nameAr: string;
  /** null means the store's default delivery fee applies. */
  deliveryFeeCents: number | null;
};

/** Governorates we currently deliver to. The database re-checks at checkout. */
export async function getDeliveryZones(): Promise<DeliveryZone[]> {
  "use cache";
  cacheTag(CATALOG_TAG, "delivery-zones");
  cacheLife("minutes");

  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("delivery_zones")
    .select("code, name, name_ar, delivery_fee_cents")
    .order("sort_order")
    .order("name");
  if (error || !data) return [];
  return data.map((z) => ({ code: z.code, name: z.name, nameAr: z.name_ar, deliveryFeeCents: z.delivery_fee_cents }));
}
