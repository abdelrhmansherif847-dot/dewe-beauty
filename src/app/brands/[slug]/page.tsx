import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product/product-card";
import { StoreNotice } from "@/components/ui/store-notice";
import { getBrand, getBrands, getStoreSettings, searchProducts } from "@/lib/catalog";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const brands = await getBrands();
  return brands.ok && brands.data.length ? brands.data.map((b) => ({ slug: b.slug })) : [{ slug: "not-yet-available" }];
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrand(slug);
  return brand ? { title: brand.name, description: brand.tagline ?? undefined } : { title: "Brand not found" };
}

export default async function BrandPage({ params }: { params: Params }) {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) notFound();
  const [products, settings] = await Promise.all([searchProducts({ brand: slug }), getStoreSettings()]);

  return (
    <div className="container">
      <header className="page-head stack" style={{ "--stack-gap": "1rem" } as React.CSSProperties}>
        <div className="cluster">
          <p className="eyebrow">Brand</p>
          {brand.isSample && <span className="badge badge--sample">Sample brand</span>}
        </div>
        <h1 className="page-head__title">{brand.name}</h1>
        {brand.tagline && <p className="lede">{brand.tagline}</p>}
        {brand.description && <p className="muted" style={{ maxWidth: "60ch" }}>{brand.description}</p>}
      </header>
      <hr className="hairline" style={{ marginBottom: "3rem" }} />
      {products.ok ? (
        products.data.length ? (
          <ProductGrid products={products.data} currency={settings.currency} instance="brand" />
        ) : (
          <p className="muted">New products from {brand.name} are coming soon.</p>
        )
      ) : (
        <StoreNotice reason={products.reason} />
      )}
    </div>
  );
}
