import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product/product-card";
import { getCollection, getStoreSettings } from "@/lib/catalog";
import { createPublicClient } from "@/lib/supabase/public";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const supabase = createPublicClient();
  const { data } = supabase ? await supabase.from("collections").select("slug") : { data: null };
  return data?.length ? data.map((c) => ({ slug: c.slug })) : [{ slug: "not-yet-available" }];
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollection(slug);
  return collection
    ? { title: collection.name, description: collection.description ?? undefined }
    : { title: "Collection not found" };
}

export default async function CollectionPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [collection, settings] = await Promise.all([getCollection(slug), getStoreSettings()]);
  if (!collection) notFound();

  return (
    <div className="container">
      <header className="page-head stack" style={{ "--stack-gap": "1rem" } as React.CSSProperties}>
        <p className="eyebrow">Collection</p>
        <h1 className="page-head__title">{collection.name}</h1>
        {collection.description && <p className="lede">{collection.description}</p>}
      </header>
      <hr className="hairline" style={{ marginBottom: "3rem" }} />
      {collection.products.length ? (
        <ProductGrid products={collection.products} currency={settings.currency} instance="collection" />
      ) : (
        <p className="muted">This collection is being restocked.</p>
      )}
    </div>
  );
}
