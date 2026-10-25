"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Drawer } from "@/components/ui/drawer";
import { CloseIcon, FilterIcon, SearchIcon } from "@/components/ui/icons";

type Option = { value: string; label: string };

export type ShopFilterData = {
  brands: Option[];
  categories: Option[];
  sorts: Option[];
};

function useShopParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  return { params, update, pending };
}

function FilterControls({ data, update, params }: { data: ShopFilterData; update: (c: Record<string, string | null>) => void; params: URLSearchParams }) {
  const brand = params.get("brand") ?? "";
  const category = params.get("category") ?? "";
  const inStock = params.get("in_stock") === "1";

  return (
    <>
      <fieldset className="filter-group">
        <legend>Category</legend>
        <div className="filter-list">
          <button type="button" className="chip" aria-pressed={!category} onClick={() => update({ category: null })}>
            All categories
          </button>
          {data.categories.map((c) => (
            <button
              key={c.value}
              type="button"
              className="chip"
              aria-pressed={category === c.value}
              onClick={() => update({ category: category === c.value ? null : c.value })}
            >
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="filter-group">
        <legend>Brand</legend>
        <div className="filter-list">
          <button type="button" className="chip" aria-pressed={!brand} onClick={() => update({ brand: null })}>
            All brands
          </button>
          {data.brands.map((b) => (
            <button
              key={b.value}
              type="button"
              className="chip"
              aria-pressed={brand === b.value}
              onClick={() => update({ brand: brand === b.value ? null : b.value })}
            >
              {b.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="toggle">
        <input type="checkbox" checked={inStock} onChange={(e) => update({ in_stock: e.target.checked ? "1" : null })} />
        In stock only
      </label>
    </>
  );
}

export function ShopShell({ data, count, children }: { data: ShopFilterData; count: number; children: ReactNode }) {
  const { params, update, pending } = useShopParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const urlQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);
  // Follow URL changes made elsewhere (e.g. the header search).
  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery);
    if (urlQuery !== query.trim()) setQuery(urlQuery);
  }
  const sort = params.get("sort") ?? "featured";
  const activeFilters = ["brand", "category", "in_stock", "q"].filter((k) => params.get(k)).length;

  // Debounced search-as-you-type, kept in the URL so results are shareable.
  useEffect(() => {
    if (query.trim() === urlQuery) return;
    const timer = setTimeout(() => update({ q: query.trim() || null }), 320);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="shop-layout">
      <aside className="filters filters--desktop" aria-label="Filters">
        <FilterControls data={data} update={update} params={params} />
      </aside>

      <div>
        <div className="shop-toolbar">
          <form className="shop-toolbar__search" role="search" onSubmit={(e) => e.preventDefault()}>
            <SearchIcon size={18} />
            <label htmlFor="shop-search" className="visually-hidden">
              Search the shop
            </label>
            <input
              id="shop-search"
              className="input"
              type="search"
              placeholder="Search products or brands"
              value={query}
              maxLength={80}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
          <div className="cluster">
            <button type="button" className="chip filters-toggle" onClick={() => setSheetOpen(true)}>
              <FilterIcon size={18} /> Filters{activeFilters ? ` (${activeFilters})` : ""}
            </button>
            <label htmlFor="shop-sort" className="visually-hidden">
              Sort by
            </label>
            <select
              id="shop-sort"
              className="select"
              style={{ width: "auto", borderRadius: 999 }}
              value={sort}
              onChange={(e) => update({ sort: e.target.value === "featured" ? null : e.target.value })}
            >
              {data.sorts.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="shop-toolbar__count" aria-live="polite" style={{ marginTop: "-0.75rem", marginBottom: "1.5rem" }}>
          {pending ? "Updating…" : `${count} ${count === 1 ? "product" : "products"}`}
        </p>
        <div className="results" data-pending={pending} aria-busy={pending}>
          {children}
        </div>
      </div>

      <Drawer open={sheetOpen} onClose={() => setSheetOpen(false)} side="bottom" label="Filters">
        <div className="sheet__grabber" aria-hidden="true" />
        <div className="drawer__head">
          <h2 className="title-md">Filters</h2>
          <button type="button" className="icon-btn" aria-label="Close filters" onClick={() => setSheetOpen(false)}>
            <CloseIcon />
          </button>
        </div>
        <div className="drawer__body stack" style={{ "--stack-gap": "2rem" } as React.CSSProperties}>
          <FilterControls data={data} update={update} params={params} />
        </div>
        <div className="drawer__foot cluster" style={{ justifyContent: "space-between" }}>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => update({ brand: null, category: null, in_stock: null, q: null })}
          >
            Clear all
          </button>
          <button type="button" className="btn" onClick={() => setSheetOpen(false)}>
            Show {count} {count === 1 ? "result" : "results"}
          </button>
        </div>
      </Drawer>
    </div>
  );
}
