import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductPurchase } from "@/components/product/buy-box";
import { ProductGrid } from "@/components/product/product-card";
import { SectionHead } from "@/components/ui/section-head";
import { createPublicClient } from "@/lib/supabase/public";
import { getProduct, getRelatedProducts, getStoreSettings } from "@/lib/catalog";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const supabase = createPublicClient();
  const { data } = supabase ? await supabase.from("products").select("slug").limit(200) : { data: null };
  // Cache Components needs at least one param to validate the route shell.
  return data?.length ? data.map((p) => ({ slug: p.slug })) : [{ slug: "not-yet-available" }];
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: `${product.name} by ${product.brand.name}`,
    description: product.shortDescription ?? undefined,
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProduct(slug), getStoreSettings()]);
  if (!product) notFound();
  const related = await getRelatedProducts(product.brand.slug, product.slug);

  return (
    <>
      <div className="container">
        <nav aria-label="Breadcrumb">
          <ol className="breadcrumbs">
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/shop">Shop</Link>
            </li>
            {product.category && (
              <li>
                <Link href={`/shop?category=${product.category.slug}`}>{product.category.name}</Link>
              </li>
            )}
            <li aria-current="page">{product.name}</li>
          </ol>
        </nav>

        <ProductPurchase product={product} settings={settings}>
          <div className="accordion">
            {product.description && (
              <details open>
                <summary>Details</summary>
                <div className="accordion__content">
                  <p>{product.description}</p>
                </div>
              </details>
            )}
            {product.howToUse && (
              <details>
                <summary>How to use</summary>
                <div className="accordion__content">
                  <p>{product.howToUse}</p>
                </div>
              </details>
            )}
            {product.ingredients && (
              <details>
                <summary>Ingredients</summary>
                <div className="accordion__content">
                  <p>{product.ingredients}</p>
                </div>
              </details>
            )}
            <details>
              <summary>Delivery and payment</summary>
              <div className="accordion__content stack">
                <p>Payment is cash on delivery only. Have the exact amount ready if you can.</p>
                <p>
                  Delivery fees are shown in your bag before you check out.{" "}
                  <Link href="/help/delivery">Read delivery details</Link>.
                </p>
              </div>
            </details>
          </div>
        </ProductPurchase>
      </div>

      {related.length > 0 && (
        <section className="section" aria-labelledby="related">
          <div className="container">
            <SectionHead
              eyebrow={`More from ${product.brand.name}`}
              title={<span id="related">You may also like</span>}
              action={{ href: `/brands/${product.brand.slug}`, label: "Shop the brand" }}
            />
            <ProductGrid products={related} currency={settings.currency} instance="related" />
          </div>
        </section>
      )}
    </>
  );
}
