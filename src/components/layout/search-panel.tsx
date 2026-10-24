"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { suggestProducts } from "@/app/actions/cart";
import { ProductArt } from "@/components/art/product-art";
import { CloseIcon, SearchIcon } from "@/components/ui/icons";
import type { ProductSummary } from "@/lib/catalog";
import { formatPriceRange } from "@/lib/money";

export function SearchPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSummary[]>([]);
  const [searched, setSearched] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const q = query.trim();
    const timer = setTimeout(() => {
      if (q.length < 2) {
        setResults([]);
        setSearched("");
        return;
      }
      startTransition(async () => {
        const found = await suggestProducts(q);
        setResults(found);
        setSearched(q);
      });
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="container">
      <form
        role="search"
        className="search-panel__form"
        onSubmit={(e) => {
          e.preventDefault();
          const q = query.trim();
          onClose();
          router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
        }}
      >
        <SearchIcon size={26} />
        <label htmlFor="site-search" className="visually-hidden">
          Search products and brands
        </label>
        <input
          id="site-search"
          className="search-panel__input"
          type="search"
          placeholder="Search serums, tints, brands…"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-autofocus
          maxLength={80}
        />
        {pending && <span className="spinner" aria-hidden="true" />}
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close search">
          <CloseIcon />
        </button>
      </form>

      <div aria-live="polite">
        {results.length > 0 && (
          <ul className="search-results" style={{ listStyle: "none", padding: 0 }}>
            {results.map((p) => (
              <li key={p.id}>
                <Link href={`/products/${p.slug}`} className="search-result" onClick={onClose}>
                  <div style={{ borderRadius: 10, overflow: "hidden", aspectRatio: "4 / 5" }}>
                    <ProductArt
                      slug={p.slug}
                      name={p.name}
                      brandName={p.brandName}
                      categorySlug={p.categorySlug}
                      instance="search"
                      decorative
                    />
                  </div>
                  <div>
                    <p className="product-card__brand">{p.brandName}</p>
                    <p className="product-card__name" style={{ fontSize: "1.05rem" }}>
                      {p.name}
                    </p>
                  </div>
                  <span className="product-card__price">{formatPriceRange(p.minPriceCents, p.maxPriceCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {searched && results.length === 0 && !pending && (
          <p className="muted" style={{ marginTop: "1.5rem" }}>
            Nothing matches “{searched}” yet. Try a product type like “serum” or a brand name.
          </p>
        )}
        {query.trim().length >= 2 && (
          <p style={{ marginTop: "1.25rem" }}>
            <Link
              href={`/shop?q=${encodeURIComponent(query.trim())}`}
              className="link-underline"
              onClick={onClose}
            >
              See all results for “{query.trim()}”
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
