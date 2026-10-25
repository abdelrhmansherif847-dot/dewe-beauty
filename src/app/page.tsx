import Link from "next/link";
import type { CSSProperties } from "react";
import { ProductArt } from "@/components/art/product-art";
import { CategoryRail } from "@/components/home/category-rail";
import { Hero } from "@/components/home/hero";
import { ProductGrid } from "@/components/product/product-card";
import { CashIcon, ChatIcon, ShieldIcon, TruckIcon } from "@/components/ui/icons";
import { SectionHead } from "@/components/ui/section-head";
import { StoreNotice } from "@/components/ui/store-notice";
import { getBrands, getCategories, getCollection, getFeaturedProducts, getStoreSettings } from "@/lib/catalog";

export default async function HomePage() {
  const [featured, categories, brands, edit, lips, settings] = await Promise.all([
    getFeaturedProducts(8),
    getCategories(),
    getBrands(),
    getCollection("everyday-glow-edit"),
    getCollection("soft-rose-lips"),
    getStoreSettings(),
  ]);

  const spotlight = featured.ok ? (featured.data.find((p) => p.slug === "dew-drop-hydrating-serum") ?? featured.data[0] ?? null) : null;

  return (
    <>
      <Hero spotlight={spotlight} />

      <section className="section" aria-labelledby="discover">
        <div className="container">
          <SectionHead index="01" eyebrow="Discover" title={<span id="discover">Find your ritual</span>} action={{ href: "/shop", label: "Shop all" }} />
          {categories.ok ? <CategoryRail categories={categories.data} /> : <StoreNotice reason={categories.reason} />}
        </div>
      </section>

      <section className="section section--wash" aria-labelledby="shortlist">
        <div className="container">
          <SectionHead
            index="02"
            eyebrow="Featured"
            title={
              <span id="shortlist">
                The glow <em className="italic-accent">shortlist</em>
              </span>
            }
            action={{ href: "/shop", label: "View everything" }}
          />
          {featured.ok ? (
            featured.data.length ? (
              <ProductGrid products={featured.data} currency={settings.currency} instance="featured" />
            ) : (
              <p className="muted">New arrivals are on their way.</p>
            )
          ) : (
            <StoreNotice reason={featured.reason} />
          )}
        </div>
      </section>

      {edit && edit.products.length > 0 && (
        <section className="section" aria-labelledby="edit">
          <div className="container">
            <div className="edit-banner" data-reveal>
              <div className="edit-banner__copy">
                <p className="eyebrow">03 · The edit</p>
                <h2 id="edit" className="title-xl">
                  {edit.name}
                </h2>
                {edit.description && <p className="lede">{edit.description}</p>}
                <ol className="edit-steps">
                  {edit.products.map((p) => (
                    <li key={p.id}>
                      <Link href={`/products/${p.slug}`}>
                        {p.name} <span style={{ opacity: 0.7 }}>· {p.brandName}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
                <div>
                  <Link href={`/collections/${edit.slug}`} className="btn btn--light">
                    Shop the edit
                  </Link>
                </div>
              </div>
              <div className="edit-banner__visual" aria-hidden="true">
                {edit.products.slice(0, 3).map((p, i) => (
                  <div
                    key={p.id}
                    style={
                      {
                        position: "absolute",
                        width: "42%",
                        aspectRatio: "4 / 5",
                        borderRadius: "999px 999px 18px 18px",
                        overflow: "hidden",
                        left: `${8 + i * 26}%`,
                        top: `${18 + (i % 2) * 16}%`,
                        boxShadow: "var(--shadow-lift)",
                        transform: `rotate(${(i - 1) * 4}deg)`,
                      } as CSSProperties
                    }
                  >
                    <ProductArt
                      slug={p.slug}
                      name={p.name}
                      brandName={p.brandName}
                      categorySlug={p.categorySlug}
                      instance={`edit-${i}`}
                      decorative
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="brands">
        <div className="container">
          <SectionHead index="04" eyebrow="Brands" title={<span id="brands">Houses we carry</span>} action={{ href: "/brands", label: "All brands" }} />
          {brands.ok ? (
            <div className="brand-grid">
              {brands.data.map((b, i) => (
                <Link
                  key={b.slug}
                  href={`/brands/${b.slug}`}
                  className="brand-cell"
                  data-reveal
                  style={{ "--reveal-index": i } as CSSProperties}
                >
                  {b.isSample && <span className="badge badge--sample" style={{ alignSelf: "flex-start" }}>Sample brand</span>}
                  <span className="brand-cell__name">{b.name}</span>
                  {b.tagline && <span className="muted">{b.tagline}</span>}
                  <span className="brand-cell__arrow">Discover →</span>
                </Link>
              ))}
            </div>
          ) : (
            <StoreNotice reason={brands.reason} />
          )}
        </div>
      </section>

      {lips && lips.products.length > 0 && (
        <section className="section section--wash" aria-labelledby="lips">
          <div className="container">
            <SectionHead
              index="05"
              eyebrow="Collection"
              title={<span id="lips">{lips.name}</span>}
              action={{ href: `/collections/${lips.slug}`, label: "See the collection" }}
            />
            <ProductGrid products={lips.products} currency={settings.currency} instance="lips" />
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="service">
        <div className="container">
          <SectionHead index="06" eyebrow="With you at every step" title={<span id="service">Shopping with DEWÉ</span>} />
          <div className="service-grid">
            {[
              {
                icon: <CashIcon />,
                title: "Cash on delivery",
                body: "No card needed. You pay in cash when your order is handed to you.",
              },
              {
                icon: <TruckIcon />,
                title: "Delivery details up front",
                body: "Delivery fees are shown in your bag and at checkout before you place an order.",
                href: "/help/delivery",
              },
              {
                icon: <ShieldIcon />,
                title: "Prices checked at checkout",
                body: "Every order is priced and stock-checked by our system at the moment you place it.",
              },
              {
                icon: <ChatIcon />,
                title: "Here to help",
                body: "Questions about an order or a product? Find our contact details on the help page.",
                href: "/help/delivery#contact",
              },
            ].map((item, i) => (
              <div key={item.title} className="service-item" data-reveal style={{ "--reveal-index": i } as CSSProperties}>
                <span className="service-item__icon">{item.icon}</span>
                <h3>{item.title}</h3>
                <p className="muted">{item.body}</p>
                {item.href && (
                  <Link href={item.href} className="link-underline" style={{ marginTop: "auto", fontWeight: 600 }}>
                    Read more
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
