import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProductGrid, ProductGridSkeleton } from "@/components/product/product-card";
import { CollectionIntro } from "@/components/shop/collection-intro";
import { ShopShell, ShopShellSkeleton, type ShopFilterData } from "@/components/shop/shop-shell";
import { StoreNotice } from "@/components/ui/store-notice";
import {
  SORT_OPTIONS,
  getBrands,
  getCategories,
  getStoreSettings,
  searchProducts,
  type SortKey,
} from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse skincare, makeup, lips, fragrance and body care by brand and category.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="collection-page">
      <CollectionIntro />
      <div className="container">
        <Suspense
          fallback={
            <ShopShellSkeleton>
              <ProductGridSkeleton count={6} variant="collection" />
            </ShopShellSkeleton>
          }
        >
          <ShopResults searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function ShopResults({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const sortParam = first(sp.sort) as SortKey;
  const sort = SORT_OPTIONS.some((s) => s.value === sortParam) ? sortParam : "featured";
  const query = {
    q: first(sp.q).slice(0, 80),
    brand: first(sp.brand),
    category: first(sp.category),
    inStock: first(sp.in_stock) === "1",
    sort,
  };

  const [results, brands, categories, settings] = await Promise.all([
    searchProducts(query),
    getBrands(),
    getCategories(),
    getStoreSettings(),
  ]);

  const data: ShopFilterData = {
    brands: brands.ok ? brands.data.map((b) => ({ value: b.slug, label: b.name })) : [],
    categories: categories.ok ? categories.data.map((c) => ({ value: c.slug, label: c.name })) : [],
    sorts: SORT_OPTIONS,
  };

  const products = results.ok ? results.data : [];
  const illustrative = products.some((p) => p.isSample || !p.imageUrl || p.imageIsPlaceholder);

  return (
    <ShopShell data={data} count={products.length}>
      {!results.ok ? (
        <StoreNotice reason={results.reason} />
      ) : products.length === 0 ? (
        <div className="empty collection-empty" data-testid="shop-empty">
          <EmptyArt />
          <h2>No matches yet</h2>
          <p>Try a different search, or clear a filter to see more of the shop.</p>
          <Link href="/shop" className="btn btn--ghost">
            See the whole shop
          </Link>
        </div>
      ) : (
        <>
          <ProductGrid products={products} currency={settings.currency} instance="shop" variant="collection" />
          {illustrative && (
            <p className="collection-note">
              Items marked <strong>Sample product</strong> are sample listings, and <strong>Placeholder image</strong>{" "}
              marks illustrative artwork. Product photography to follow.
            </p>
          )}
        </>
      )}
    </ShopShell>
  );
}

function EmptyArt() {
  return (
    <div className="empty__art" aria-hidden="true">
      <span className="dew" style={{ width: 54, height: 54, left: 30, top: 34 }} />
      <span className="dew" style={{ width: 22, height: 22, left: 86, top: 20, animationDelay: "200ms" }} />
    </div>
  );
}
